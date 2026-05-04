import { get } from 'svelte/store';
import { danhSachNhanVien, competitionData, pastedThiDuaReportData, thuongERPData, thuongERPDataThangTruoc, warehouseList } from '../../stores.js';
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
        
        // [PHẪU THUẬT LOGIC - CACHE ISOLATION]: Không nạp bừa, chỉ nạp và ép filter theo warehouseList hiện hữu
        const otherFiles = ['saved_giocong', 'saved_ycx', 'saved_thuongnong', 'saved_ycx_thangtruoc', 'saved_thuongnong_thangtruoc', 'saved_ycx_cungkynam'];
        
        // Cập nhật danh sách kho trước để làm khiên lọc
        let allowedWarehouses = [];
        if (dsnvData && dsnvData.length > 0) {
             const dsKho = [...new Set(dsnvData.map(e => e.maKho || e.storeId).filter(Boolean))];
             allowedWarehouses = dsKho.map(k => String(k).trim());
        } else {
             // Fallback: Lấy từ List hiện tại
             allowedWarehouses = get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_')).map(k => String(k).trim());
        }

        await Promise.all(otherFiles.map(async (key) => {
            let data = await storage.getItem(key);
            if (data && data.length > 0) {
                // Áp dụng Phễu lọc cho Cache nếu nó là các file YCX
                if (key.includes('ycx') && allowedWarehouses.length > 0) {
                     data = data.filter(d => {
                        const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                        return allowedWarehouses.includes(whCode);
                     });
                     // Lẳng lặng ghi đè lại rác Local
                     try { await storage.setItem(key, data); } catch(e){}
                }

                FILE_MAPPING[key].store.set(data);
                updateSyncState(key, 'cached', `✓ Đã tải ${data.length} dòng (Local)`, null);
             }
        }));

        console.log("[DataService] Bắt đầu xử lý dữ liệu Paste...");
        try {
            const luykeText = localStorage.getItem('daily_paste_luyke');
            if (luykeText) {
                dataProcessing.parseLuyKePastedData(luykeText);
                dataProcessing.parseCompetitionDataFromLuyKe(luykeText);
                updateSyncState('daily_paste_luyke', 'cached', `(Local)`, null);
            }
            const erpText = localStorage.getItem('daily_paste_thuongerp');
            if (erpText) {
                const data = dataProcessing.processThuongERP(erpText);
                thuongERPData.set(data);
                updateSyncState('daily_paste_thuongerp', 'cached', `(Local)`, null);
            }
            const rawThiDua = localStorage.getItem('raw_paste_thiduanv');
            if (rawThiDua) {
                const parsedData = dataProcessing.parsePastedThiDuaTableData(rawThiDua);
                if (parsedData.success) {
                    const $competitionData = get(competitionData);
                    const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
                    pastedThiDuaReportData.set(processedData);
                    updateSyncState('daily_paste_thiduanv', 'cached', `(Local)`, null);
                }
            }
            const erpTTText = localStorage.getItem('saved_thuongerp_thangtruoc');
            if (erpTTText) {
                 const data = dataProcessing.processThuongERP(erpTTText);
                 thuongERPDataThangTruoc.set(data);
                 updateSyncState('saved_thuongerp_thangtruoc', 'cached', `(Local)`, null);
            }
        } catch (err) { console.error("Lỗi tải cache paste:", err); }
    }
};