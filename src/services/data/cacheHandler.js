import { get } from 'svelte/store';
import { danhSachNhanVien, competitionData, pastedThiDuaReportData, thuongERPData, thuongERPDataThangTruoc, warehouseList, selectedWarehouse, doanhThuBIData } from '../../stores.js';
import { storage } from '../storage.service.js';
import { dataProcessing } from '../dataProcessing.js';
import { adminService } from '../admin.service.js';
import { FILE_MAPPING, LOCAL_DSNV_FILENAME_KEY } from './constants.js';
import { updateSyncState } from './syncHandler.js';

export const cacheHandler = {
    async loadAllFromCache() {
        try { await storage.openDB(); } catch (err) { console.error("Lỗi DB:", err); }

        adminService.loadMappingsGlobal();

        console.log("[DataService] Bắt đầu tải DSNV từ cache...");
        const dsnvData = await storage.getItem('saved_danhsachnv');
        if (dsnvData && dsnvData.length > 0) {
            danhSachNhanVien.set(dsnvData);
            const fileName = localStorage.getItem(LOCAL_DSNV_FILENAME_KEY) || 'DSNV (Cache)';
            updateSyncState('saved_danhsachnv', 'cached', `✓ Đã tải ${dsnvData.length} dòng (Chỉ lưu máy này)`, { fileName });
        } else {
            updateSyncState('saved_danhsachnv', 'error', 'Chưa có DSNV. Vui lòng tải file.', null);
        }
        
        const otherFiles = ['saved_giocong', 'saved_ycx', 'saved_thuongnong', 'saved_ycx_thangtruoc', 'saved_thuongnong_thangtruoc', 'saved_ycx_cungkynam', 'saved_doanhthu_bi'];
        
        let allowedWarehouses = [];
        if (dsnvData && dsnvData.length > 0) {
             const dsKho = [...new Set(dsnvData.map(e => e.maKho || e.storeId).filter(Boolean))];
             allowedWarehouses = dsKho.map(k => String(k).trim());
        } else {
             allowedWarehouses = get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_')).map(k => String(k).trim());
        }

        await Promise.all(otherFiles.map(async (key) => {
            try {
                let data = await storage.getItem(key);
                if (data && Array.isArray(data) && data.length > 0) {
                    if (key.includes('ycx') && allowedWarehouses.length > 0) {
                         data = data.filter(d => {
                            const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                            return allowedWarehouses.includes(whCode);
                         });
                         try { await storage.setItem(key, data); } catch(e){}
                    } else if (key === 'saved_doanhthu_bi' && allowedWarehouses.length > 0) {
                         // Doanh thu BI gộp lũy kế nhiều kho qua nhiều lần upload (không xoá kho cũ
                         // khi upload kho mới) — nên chỉ lọc HIỂN THỊ theo DSNV hiện tại, không ghi
                         // đè cache, để tránh mất dữ liệu của kho khác khi đổi DSNV rồi đổi lại.
                         data = data.filter(d => {
                            const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                            return allowedWarehouses.includes(whCode);
                         });
                    }

                    let displayData = data;
                    const currentWh = get(selectedWarehouse);
                    
                    if (currentWh !== 'ALL' && !currentWh.startsWith('CLUSTER_')) {
                         displayData = data.filter(d => {
                             const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                             return whCode === currentWh;
                         });
                    }

                    FILE_MAPPING[key].store.set(displayData);
                    
                    let stateKey = key;
                    if (['saved_giocong', 'saved_thuongnong', 'saved_doanhthu_bi'].includes(key) && currentWh !== 'ALL' && !currentWh.startsWith('CLUSTER_')) {
                        stateKey = `${key}_${currentWh}`;
                    }

                    // [PHẪU THUẬT LOGIC]: Đọc lại Meta để khôi phục Tên File cho các block khác
                    let metaStr = localStorage.getItem(`_meta_${currentWh}_${key}`);
                    if (currentWh === 'ALL') metaStr = localStorage.getItem(`_meta_ALL_${key}`);
                    let meta = metaStr ? JSON.parse(metaStr) : null;

                    updateSyncState(stateKey, 'cached', `✓ Đã tải ${displayData.length} dòng`, meta);
                 } else if (data && !Array.isArray(data)) {
                     console.warn(`[CacheHandler] Rác cache phát hiện tại key: ${key}. Đang tiến hành làm sạch...`);
                     await storage.setItem(key, []);
                 }
            } catch (err) {
                console.error(`[CacheHandler] Bỏ qua lỗi đọc cache file ${key}:`, err);
            }
        }));

        console.log("[DataService] Bắt đầu xử lý dữ liệu Paste (Absolute Isolation)...");
        try {
            let aggregatedLuykeComps = [];
            let aggregatedErp = [];
            let aggregatedThidua = [];
            let aggregatedErpTT = [];
            
            const allExcelThiDua = await storage.getItem('saved_thiduanv_excel') || [];
            const allExcelThiDuaSt = await storage.getItem('saved_thidua_st_excel') || [];

            if (allowedWarehouses.length > 0) {
                for (const kho of allowedWarehouses) {
                    // [MỚI] Thi đua ST: ưu tiên dữ liệu Excel đã upload cho kho này; chỉ dùng lại
                    // dữ liệu dán bảng cũ (nếu còn sót) cho kho nào chưa có bản Excel mới.
                    const excelStForKho = Array.isArray(allExcelThiDuaSt)
                        ? allExcelThiDuaSt.filter(d => String(d.maKho) === String(kho))
                        : [];

                    if (excelStForKho.length > 0) {
                        aggregatedLuykeComps = [...aggregatedLuykeComps, ...excelStForKho];
                        const metaStr = localStorage.getItem(`_meta_${kho}_saved_thidua_st_excel`);
                        const meta = metaStr ? JSON.parse(metaStr) : null;
                        updateSyncState(`saved_thidua_st_excel_${kho}`, 'cached', `✓ Đã tải (${excelStForKho.length} chương trình)`, meta);
                    } else {
                        const luykeText = localStorage.getItem(`daily_paste_luyke_${kho}`);
                        if (luykeText) {
                            dataProcessing.parseLuyKePastedData(luykeText);
                            const comps = dataProcessing.parseCompetitionDataFromLuyKe(luykeText);

                            const labeledComps = Array.isArray(comps) ? comps.map(c => ({ ...c, maKho: kho })) : [];
                            aggregatedLuykeComps = [...aggregatedLuykeComps, ...labeledComps];
                            updateSyncState(`daily_paste_luyke_${kho}`, 'cached', `(Local)`, null);
                        }
                    }

                    const erpText = localStorage.getItem(`daily_paste_thuongerp_${kho}`) || localStorage.getItem(`daily_paste_thuongerp`); 
                    if (erpText) {
                        const data = dataProcessing.processThuongERP(erpText);
                        aggregatedErp = [...aggregatedErp, ...data];
                    }

                    const erpTTText = localStorage.getItem(`saved_thuongerp_thangtruoc_${kho}`) || localStorage.getItem(`saved_thuongerp_thangtruoc`);
                    if (erpTTText) {
                         const data = dataProcessing.processThuongERP(erpTTText);
                         aggregatedErpTT = [...aggregatedErpTT, ...data];
                    }

                    const excelThiDuaForKho = Array.isArray(allExcelThiDua)
                        ? allExcelThiDua.filter(d => String(d.maKho) === String(kho))
                        : [];

                    if (excelThiDuaForKho.length > 0) {
                        aggregatedThidua = [...aggregatedThidua, ...excelThiDuaForKho];
                        
                        // [PHẪU THUẬT LOGIC]: Thay thế chữ "Local Cache" vô nghĩa bằng ngôn ngữ tường minh, nạp lại Meta để có Tên file
                        const metaStr = localStorage.getItem(`_meta_${kho}_saved_thiduanv_excel`);
                        const meta = metaStr ? JSON.parse(metaStr) : null;
                        
                        updateSyncState(`saved_thiduanv_excel_${kho}`, 'cached', `✓ Đã tải (${excelThiDuaForKho.length} nhân viên)`, meta);
                    } else {
                        const rawThiDua = localStorage.getItem(`raw_paste_thiduanv_${kho}`);
                        if (rawThiDua) {
                            const parsedData = dataProcessing.parsePastedThiDuaTableData(rawThiDua);
                            if (parsedData.success) {
                                const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, get(competitionData));
                                aggregatedThidua = [...aggregatedThidua, ...processedData];
                            }
                        }
                    }
                }

                if (aggregatedLuykeComps.length > 0) competitionData.set(aggregatedLuykeComps);
                if (aggregatedErp.length > 0) thuongERPData.set(aggregatedErp);
                if (aggregatedThidua.length > 0) pastedThiDuaReportData.set(aggregatedThidua);
                if (aggregatedErpTT.length > 0) thuongERPDataThangTruoc.set(aggregatedErpTT);
            }

        } catch (err) { console.error("Lỗi tải cache paste:", err); }
    }
};