/* global XLSX */
import { get } from 'svelte/store';
import {
    selectedWarehouse, currentUser, realtimeYCXData,
    categoryStructure, brandList, specialProductList,
    warehouseList, virtualProductList,
    pastedThiDuaReportData,
    danhSachNhanVien
} from '../../stores.js';
import { dataProcessing } from '../dataProcessing.js';
import { helpers } from '../processing/helpers.js';
import { resolveThiDuaStRows, resolveDoanhThuBiRows } from '../processing/logic/biExcel.processor.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { FILE_MAPPING, LOCAL_DSNV_FILENAME_KEY } from './constants.js';
import { updateSyncState } from './syncHandler.js';
import { cacheHandler } from './cacheHandler.js';

async function _handleFileRead(fileBlob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
                resolve(workbook);
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error("Không thể đọc file."));
        reader.readAsArrayBuffer(fileBlob);
    });
}

const getMonthYear = (dateStr) => {
    if (!dateStr) return 'Unknown';
    if (dateStr instanceof Date && !isNaN(dateStr)) return `${String(dateStr.getMonth() + 1).padStart(2, '0')}/${dateStr.getFullYear()}`;
    const str = String(dateStr).trim();
    const parts = str.split(/[-/]/);
    if (parts.length >= 2) {
        let month = parts[1];
        let year = parts[0];
        if (parts[0].length === 2) { month = parts[0]; year = parts[parts.length > 2 ? 2 : 1]; }
        return `${month.padStart(2, '0')}/${year}`;
    }
    return str;
};

export const fileHandler = {
    async handleFileChange(file, saveKey, isMultiMode = false) {
        let mapping = FILE_MAPPING[saveKey];
        let baseKey = saveKey;
        let targetWarehouse = null;

        if (saveKey.startsWith('saved_thiduanv_excel_')) {
            mapping = { normalizeType: 'thiduanv_excel', store: pastedThiDuaReportData, localOnly: false };
            baseKey = 'saved_thiduanv_excel';
            targetWarehouse = saveKey.replace('saved_thiduanv_excel_', '');
        } else if (saveKey.startsWith('saved_doanhthu_bi_')) {
            mapping = FILE_MAPPING['saved_doanhthu_bi'];
            baseKey = 'saved_doanhthu_bi';
            targetWarehouse = saveKey.replace('saved_doanhthu_bi_', '');
        }

        if (!mapping) {
            const sortedKeys = Object.keys(FILE_MAPPING).sort((a, b) => b.length - a.length);
            for (const key of sortedKeys) {
                if (saveKey.startsWith(key + '_')) {
                    mapping = FILE_MAPPING[key];
                    baseKey = key;
                    targetWarehouse = saveKey.replace(key + '_', '');
                    break;
                }
            }
        }

        if (!mapping) return { success: false, message: `Lỗi cấu hình key: ${saveKey}` };

        updateSyncState(saveKey, 'uploading', 'Đang đọc file...');

        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });

            let { normalizedData, missingColumns, error } = dataProcessing.normalizeData(rawData, mapping.normalizeType);

            // [FIX] Trường hợp thiếu cột bắt buộc, normalizeData chỉ trả về missingColumns chứ
            // không gán `error` — nếu không kiểm tra thêm ở đây, upload sẽ ÂM THẦM không báo gì
            // và không cập nhật dữ liệu (dataToStore rỗng) thay vì báo rõ file thiếu cột gì.
            if (!error && missingColumns && missingColumns.length > 0) {
                error = `File thiếu các cột bắt buộc: ${missingColumns.join(', ')}`;
            }

            if (error) {
                updateSyncState(saveKey, 'error', `Lỗi: ${error}`);
                return { success: false, message: `Lỗi: ${error}` };
            }

            let dataToStore = normalizedData;
            const currentWh = targetWarehouse || get(selectedWarehouse);

            if (mapping.normalizeType === 'thiduanv_excel') {
                const grouped = {};
                const uniquePrograms = new Set();

                // [FIX] Gom danh sách chương trình từ TOÀN BỘ dữ liệu gốc, không phụ thuộc lọc theo DSNV
                normalizedData.forEach(row => {
                    const progName = String(row.chuongTrinh || '').trim();
                    if (progName) uniquePrograms.add(progName);
                });

                const currentDSNV = get(danhSachNhanVien) || [];
                const validEmpCodes = new Set(currentDSNV.map(e => String(e.ma_nv || e.maNV).trim()));

                normalizedData.forEach(row => {
                    const empCode = String(row.maNV || '').trim();
                    if (!empCode) return;

                    if (validEmpCodes.size > 0 && !validEmpCodes.has(empCode)) return;

                    if (!grouped[empCode]) grouped[empCode] = { maNV: empCode, competitions: [] };

                    const progName = String(row.chuongTrinh || '').trim();
                    const loaiTdRaw = row.loaiTd;
                    const loaiTd = (loaiTdRaw !== undefined && loaiTdRaw !== null && String(loaiTdRaw).trim() !== '')
                        ? parseInt(loaiTdRaw, 10)
                        : null;
                    const newEntry = {
                        tenGoc: progName,
                        loaiTd: loaiTd,
                        doanhThu: parseFloat(row.doanhThu) || 0,
                        soLuong: parseFloat(row.soLuong) || 0,
                        dtQuyDoi: parseFloat(row.dtQuyDoi) || 0,
                        hang: parseInt(row.hangVung) || 0
                    };

                    // [FIX] Dữ liệu tải từ công ty đôi khi bị lỗi, khiến 1 chương trình có 2 dòng
                    // số liệu khác nhau cho cùng 1 nhân viên (khác Loại TĐ) — chỉ giữ dòng có số
                    // liệu lớn hơn (theo đúng cột SL/DT do Loại TĐ của dòng đó quyết định).
                    const normKey = helpers.normalizeCompetitionKey(progName);
                    const existingIndex = grouped[empCode].competitions.findIndex(c => helpers.normalizeCompetitionKey(c.tenGoc) === normKey);
                    if (existingIndex === -1) {
                        grouped[empCode].competitions.push(newEntry);
                    } else {
                        const getCompareValue = (entry) => helpers.isQuantityCompetitionType(entry.loaiTd) ? entry.soLuong : entry.doanhThu;
                        if (getCompareValue(newEntry) > getCompareValue(grouped[empCode].competitions[existingIndex])) {
                            grouped[empCode].competitions[existingIndex] = newEntry;
                        }
                    }
                });
                
                dataToStore = Object.values(grouped).map(emp => ({
                    ...emp,
                    maKho: currentWh
                }));

                if (dataProcessing.updateCompetitionNameMappings) {
                    dataProcessing.updateCompetitionNameMappings(Array.from(uniquePrograms));
                }

                if (normalizedData.length > 0 && dataToStore.length === 0) {
                    const msg = `Không có Mã NV nào trong file khớp với Danh sách nhân viên đang tải (kho ${currentWh}). Kiểm tra lại DSNV hoặc định dạng Mã NV.`;
                    updateSyncState(saveKey, 'error', msg);
                    return { success: false, message: msg };
                }
            }

            if (mapping.normalizeType === 'thidua_st_excel') {
                // [MỚI] File Thi đua ST không có cột mã kho, chỉ có tên siêu thị (cột ĐƠN VỊ/NHÂN
                // VIÊN) — tra mã kho bằng cách so khớp với cột "Tên Kho" đã khai báo trong DSNV.
                // Logic dò kho dùng CHUNG với lúc tự đồng bộ lại từ Cloud (xem syncHandler.js).
                const { results, unresolvedTenKho } = resolveThiDuaStRows(normalizedData);

                dataToStore = results;

                if (unresolvedTenKho.size > 0) {
                    missingColumns = [...(missingColumns || []), `Tên kho chưa khớp DSNV: ${Array.from(unresolvedTenKho).join(', ')}`];
                }

                if (normalizedData.length > 0 && dataToStore.length === 0) {
                    const msg = `Không có dòng nào khớp được mã kho. Kiểm tra lại cột "Tên Kho" trong DSNV cho khớp đúng với cột ĐƠN VỊ/NHÂN VIÊN trong file.`;
                    updateSyncState(saveKey, 'error', msg);
                    return { success: false, message: msg };
                }
            }

            if (mapping.normalizeType === 'doanhthu_bi') {
                // [MỚI] Doanh thu BI chuyển sang 1 file gồm nhiều siêu thị — tra mã kho qua "Tên
                // Kho" trong DSNV (giống Thi đua ST, dùng chung logic với syncHandler.js), đồng thời
                // tự động điền Target vào Mục tiêu Lũy kế của từng kho (vẫn cho sửa tay sau đó qua
                // màn hình Mục tiêu như bình thường).
                const { results, unresolvedTenKho, goalUpdatesByKho } = resolveDoanhThuBiRows(normalizedData);

                dataToStore = results;

                if (unresolvedTenKho.size > 0) {
                    missingColumns = [...(missingColumns || []), `Tên kho chưa khớp DSNV: ${Array.from(unresolvedTenKho).join(', ')}`];
                }

                if (normalizedData.length > 0 && dataToStore.length === 0) {
                    const msg = `Không có dòng nào khớp được mã kho. Kiểm tra lại cột "Tên Kho" trong DSNV cho khớp đúng với cột TÊN ĐƠN VỊ trong file.`;
                    updateSyncState(saveKey, 'error', msg);
                    return { success: false, message: msg };
                }

                if (goalUpdatesByKho.size > 0) {
                    await Promise.all(Array.from(goalUpdatesByKho.entries()).map(async ([kho, targets]) => {
                        try {
                            const existing = await datasyncService.loadGoalSettings(kho);
                            const mergedLuyke = { ...(existing.luyke || {}), doanhThuThuc: targets.doanhThuThuc, doanhThuQD: targets.doanhThuQD };
                            await datasyncService.saveGoalSettings(kho, 'luyke', mergedLuyke);
                        } catch (e) { console.error('Lỗi tự động cập nhật Target Lũy kế từ Doanh thu BI:', e); }
                    }));
                }
            }

            if (currentWh !== 'ALL' && mapping.normalizeType !== 'danhsachnv' && mapping.normalizeType !== 'thiduanv_excel' && mapping.normalizeType !== 'thidua_st_excel' && mapping.normalizeType !== 'doanhthu_bi') {
                const beforeFilterCount = dataToStore.length;
                const foundMaKhoValues = new Set();
                dataToStore = dataToStore.filter(row => {
                    const maKhoRow = String(row.maKhoTao || row.maKho || row['Mã kho tạo'] || row['Kho tạo'] || row.MA_KHO_TAO || row.MA_KHO || '').trim();
                    if (maKhoRow) foundMaKhoValues.add(maKhoRow);
                    if (!maKhoRow && (baseKey === 'saved_giocong' || baseKey === 'saved_thuongnong' || baseKey === 'saved_doanhthu_bi')) {
                        row.maKho = currentWh;
                        return true;
                    }
                    return maKhoRow === currentWh;
                });

                if (beforeFilterCount > 0 && dataToStore.length === 0) {
                    const foundList = foundMaKhoValues.size > 0 ? Array.from(foundMaKhoValues).join(', ') : '(không tìm thấy cột mã kho)';
                    const msg = `Không có dòng nào khớp mã kho đang chọn (${currentWh}). Mã kho tìm thấy trong file: ${foundList}.`;
                    updateSyncState(saveKey, 'error', msg);
                    return { success: false, message: msg };
                }
            }

            let filesArray = [];
            let currentMonths = [];

            if (isMultiMode) {
                const dates = normalizedData.map(d => d.ngayTao || d.ngay_tao || d.NgayTao || d['Ngày tạo'] || d.luyKeToiNgay).filter(Boolean);
                currentMonths = [...new Set(dates.map(getMonthYear))];

                let existingData = await storage.getItem(baseKey) || [];
                
                existingData = existingData.filter(row => {
                    const rowDate = row.ngayTao || row.ngay_tao || row.NgayTao || row['Ngày tạo'] || row.luyKeToiNgay;
                    if (!rowDate) return true;
                    return !currentMonths.includes(getMonthYear(rowDate));
                });
                
                dataToStore = [...existingData, ...dataToStore];
            }

            if (baseKey === 'saved_thidua_st_excel' || baseKey === 'saved_doanhthu_bi') {
                 // [FIX] Dùng dữ liệu GỐC trong cache offline (storage.getItem) làm nền để gộp —
                 // KHÔNG dùng store đang hiển thị (mapping.store), vì store đó có thể đã bị lọc chỉ
                 // còn đúng các kho trong DSNV hiện tại (xem cacheHandler.js). Nếu lấy store đã lọc
                 // làm nền rồi ghi đè lại cache, dữ liệu của các kho khác ngoài DSNV hiện tại sẽ bị
                 // xoá vĩnh viễn khỏi cache offline ngay từ lần upload tiếp theo.
                 const uploadedKhoSet = new Set(dataToStore.map(item => item.maKho));
                 const existingFull = (await storage.getItem(baseKey)) || [];
                 const mergedFull = [...existingFull.filter(item => !uploadedKhoSet.has(item.maKho)), ...dataToStore];
                 await storage.setItem(baseKey, mergedFull);

                 // Store hiển thị: vẫn chỉ hiện đúng các kho trong DSNV hiện tại (giữ nguyên hành vi
                 // chống lẫn kho cũ đã sửa trước đó), nhưng cache offline luôn giữ đủ dữ liệu mọi kho.
                 const dsnv = get(danhSachNhanVien) || [];
                 const allowedWarehouses = dsnv.length > 0
                     ? [...new Set(dsnv.map(e => String(e.maKho || '').trim()).filter(Boolean))]
                     : null;
                 mapping.store.set(allowedWarehouses ? mergedFull.filter(item => allowedWarehouses.includes(String(item.maKho || '').trim())) : mergedFull);
            } else if (baseKey === 'saved_thiduanv_excel') {
                 // [FIX] Tương tự trên — gộp trên dữ liệu gốc trong cache offline, không dùng store
                 // đang hiển thị làm nền, để không xoá mất dữ liệu kho khác khi ghi đè cache.
                 const existingFull = (await storage.getItem(baseKey)) || [];
                 const mergedFull = [...existingFull.filter(item => String(item.maKho) !== String(currentWh)), ...dataToStore];
                 await storage.setItem(baseKey, mergedFull);
                 mapping.store.set(mergedFull);
            } else {
                 mapping.store.set(dataToStore);
                 await storage.setItem(baseKey, get(mapping.store));
            }

            if (saveKey === 'saved_danhsachnv') {
                localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
            }

            if (!mapping.localOnly) {
                try {
                    // [MỚI] Thi đua ST / Doanh thu BI: mã kho được tra ra từ nội dung file (không
                    // theo lựa chọn kho trên giao diện) — luôn lấy đúng tập hợp các kho thực sự
                    // có trong file.
                    const validWarehouses = (mapping.normalizeType === 'thidua_st_excel' || mapping.normalizeType === 'doanhthu_bi')
                        ? Array.from(new Set(dataToStore.map(item => item.maKho).filter(Boolean)))
                        : (currentWh === 'ALL'
                            ? get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_'))
                            : [currentWh]);

                    if (validWarehouses.length > 0) {
                        const primaryWh = validWarehouses[0];
                        const path = `warehouse_data/${primaryWh}/${baseKey}_${Date.now()}.xlsx`;
                        const downloadUrl = await storageService.uploadFileToStorage(file, path);

                        const now = Date.now();
                        const metadata = {
                            downloadURL: downloadUrl,
                            fileName: file.name,
                            fileType: 'excel',
                            rowCount: dataToStore.length,
                            updatedAt: new Date(now),
                            timestamp: now,
                            updatedBy: get(currentUser)?.email || 'Tôi',
                            uploadedMonths: isMultiMode ? currentMonths : null,
                            isMulti: isMultiMode,
                            // [FIX] Ghi rõ mã kho đã gán lúc upload vào metadata, để máy khác tải về đọc
                            // thẳng thay vì phải suy luận lại từ ngữ cảnh (dễ sai với file không có cột mã kho).
                            assignedWarehouse: currentWh
                        };

                        // [FIX] Giờ công đa kho: 1 file có thể gộp nhiều mã kho (cột "Mã siêu thị").
                        // Nếu ghi chung 1 rowCount tổng cho mọi kho, kho A sẽ hiện nhầm số dòng của
                        // TOÀN BỘ file thay vì số dòng thực tế của riêng kho A. Tính lại theo mã kho
                        // của từng dòng để ghi đúng số dòng vào metadata của từng kho.
                        let rowCountByWh = null;
                        if ((mapping.normalizeType === 'giocong' || mapping.normalizeType === 'thidua_st_excel' || mapping.normalizeType === 'doanhthu_bi') && validWarehouses.length > 1) {
                            rowCountByWh = {};
                            dataToStore.forEach(row => {
                                const whOfRow = String(row.maKho || '').trim() || primaryWh;
                                rowCountByWh[whOfRow] = (rowCountByWh[whOfRow] || 0) + 1;
                            });
                        }

                        let deniedWh = null;
                        let writeWarning = null;
                        for (const wh of validWarehouses) {
                            const whMetadata = rowCountByWh ? { ...metadata, rowCount: rowCountByWh[wh] || 0 } : metadata;
                            const ok = await datasyncService.saveWarehouseMetadata(wh, baseKey, whMetadata);
                            if (!ok) { deniedWh = wh; break; }
                            if (ok && typeof ok === 'object' && ok.warning) writeWarning = ok.warning;
                            localStorage.setItem(`_meta_${wh}_${baseKey}`, JSON.stringify(whMetadata));
                        }

                        if (deniedWh) {
                            const msg = `Không có quyền ghi dữ liệu cho kho ${deniedWh}. Liên hệ admin để cấp quyền (allowedWarehouses) cho tài khoản này.`;
                            updateSyncState(saveKey, 'error', msg);
                            return { success: false, message: msg };
                        }

                        let successMsg = '';
                        if (isMultiMode && currentMonths.length > 0) {
                            successMsg = `✓ Đã lưu tháng: ${currentMonths.join(', ')} (${dataToStore.length} dòng)`;
                        } else if (mapping.normalizeType === 'thiduanv_excel') {
                            successMsg = `✓ Đã đồng bộ (${dataToStore.length} nhân viên)`;
                        } else if (mapping.normalizeType === 'thidua_st_excel') {
                            successMsg = `✓ Đã đồng bộ (${dataToStore.length} chương trình - ${validWarehouses.length} kho)`;
                        } else if (mapping.normalizeType === 'doanhthu_bi') {
                            successMsg = `✓ Đã đồng bộ (${dataToStore.length} siêu thị - ${validWarehouses.length} kho)`;
                        } else if (mapping.normalizeType === 'giocong') {
                            successMsg = rowCountByWh
                                ? `✓ Đã đồng bộ lên Cloud (${dataToStore.length} dòng - ${Object.entries(rowCountByWh).map(([wh, c]) => `${wh}: ${c}`).join(', ')})`
                                : `✓ Đã đồng bộ lên Cloud (${dataToStore.length} dòng)`;
                        } else {
                            successMsg = `✓ Đã đồng bộ lên Cloud (${dataToStore.length} nhân viên)`;
                        }
                        if (writeWarning) successMsg += ` — ⚠️ ${writeWarning}`;

                        updateSyncState(saveKey, 'synced', successMsg, metadata);
                    }

                } catch (cloudErr) {
                    console.error("Cloud sync error:", cloudErr);
                    updateSyncState(saveKey, 'error', `Lưu local OK nhưng lỗi Cloud: ${cloudErr.message}`);
                }
            } else {
                updateSyncState(saveKey, 'cached', `✓ Đã tải ${dataToStore.length} nhân viên (Chỉ lưu máy này)`, { fileName: file.name });
            }

            analyticsService.trackAction();

            if (saveKey === 'saved_danhsachnv') {
                // Đổi DSNV = đổi danh sách kho hợp lệ — nạp lại các store đang gộp theo kho
                // (Thi đua ST, Thi đua NV, Doanh thu BI, ERP...) để bỏ ngay dữ liệu kho cũ không
                // còn trong DSNV, không cần F5.
                await cacheHandler.loadAllFromCache();
            }

            if (missingColumns && missingColumns.length > 0) {
                return { success: true, message: `Thành công (Thiếu cột: ${missingColumns.join(', ')})`, count: dataToStore.length };
            }
            return { success: true, count: dataToStore.length };

        } catch (err) {
            updateSyncState(saveKey, 'error', `Lỗi: ${err.message}`);
            return { success: false, message: `Lỗi: ${err.message}` };
        }
    },

    async removeFile(saveKey, fileName, isMultiMode = false) {
        try {
            let baseKey = saveKey;
            let targetWarehouse = get(selectedWarehouse);
            let mapping = FILE_MAPPING[saveKey];

            if (saveKey.startsWith('saved_thiduanv_excel_')) {
                mapping = { normalizeType: 'thiduanv_excel', store: pastedThiDuaReportData, localOnly: false };
                baseKey = 'saved_thiduanv_excel';
                targetWarehouse = saveKey.replace('saved_thiduanv_excel_', '');
            } else if (saveKey.startsWith('saved_doanhthu_bi_')) {
                mapping = FILE_MAPPING['saved_doanhthu_bi'];
                baseKey = 'saved_doanhthu_bi';
                targetWarehouse = saveKey.replace('saved_doanhthu_bi_', '');
            }

            if (!mapping) {
                const sortedKeys = Object.keys(FILE_MAPPING).sort((a, b) => b.length - a.length);
                for (const key of sortedKeys) {
                    if (saveKey.startsWith(key + '_')) {
                        mapping = FILE_MAPPING[key];
                        baseKey = key;
                        targetWarehouse = saveKey.replace(key + '_', '');
                        break;
                    }
                }
            }

            if (!mapping) return { success: false };

            updateSyncState(saveKey, 'uploading', 'Đang xóa file...');
            
            if (baseKey === 'saved_thiduanv_excel' || baseKey === 'saved_doanhthu_bi') {
                 mapping.store.update(curr => curr.filter(d => String(d.maKho) !== String(targetWarehouse)));
            } else {
                 mapping.store.set([]);
            }
            await storage.setItem(baseKey, get(mapping.store));

            if (saveKey === 'saved_danhsachnv') {
                localStorage.removeItem(LOCAL_DSNV_FILENAME_KEY);
            }

            if (!mapping.localOnly) {
                const now = Date.now();
                const metadata = {
                    isDeleted: true,
                    deletedAt: new Date(now),
                    timestamp: now,
                    updatedBy: get(currentUser)?.email || 'Tôi'
                };
                
                const validWarehouses = targetWarehouse === 'ALL' 
                    ? get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_'))
                    : [targetWarehouse];

                for (const wh of validWarehouses) {
                    await datasyncService.saveWarehouseMetadata(wh, baseKey, metadata);
                    localStorage.removeItem(`_meta_${wh}_${baseKey}`); 
                }
            }

            updateSyncState(saveKey, 'error', 'Chưa có file. Vui lòng tải file.', null);
            return { success: true };
        } catch (error) {
            updateSyncState(saveKey, 'error', `Lỗi xóa file: ${error.message}`);
            return { success: false, message: error.message };
        }
    },

    async handleRealtimeFileInput(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            const { success, normalizedData, error } = dataProcessing.normalizeData(rawData, 'ycx');
            if (!success) throw new Error(error);
            realtimeYCXData.set(normalizedData);
            event.target.value = null;
            return { success: true, count: normalizedData.length };
        } catch (err) { throw err; }
    },

    async handleCategoryFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            const { success, normalizedData, error } = dataProcessing.normalizeCategoryStructureData(rawData);
            if (!success) throw new Error(error);
            categoryStructure.set(normalizedData);
            const brands = [...new Set(normalizedData.map(item => item.nhaSanXuat || item.nhasanxuat || item.NhaSanXuat || item.brand || item.hang || item['Nhà sản xuất']).filter(Boolean))].sort();
            brandList.set(brands);
            event.target.value = null;
            return { success: true, count: normalizedData.length };
        } catch (err) { throw err; }
    },

    async handleSpecialProductFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            const { success, normalizedData, error } = dataProcessing.normalizeSpecialProductData(rawData);
            if (!success) throw new Error(error);
            specialProductList.set(normalizedData);
            event.target.value = null;
            return { success: true, count: normalizedData.length };
        } catch (err) { throw err; }
    },

    async handleVirtualProductFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            const { success, normalizedData, error } = dataProcessing.normalizeVirtualProductData(rawData);
            if (!success) throw new Error(error);
            virtualProductList.set(normalizedData);
            event.target.value = null;
            return { success: true, count: normalizedData.length };
        } catch (err) { throw err; }
    },

    async handleTemplateDownload() {
        try {
            const url = await storageService.getTemplateDownloadURL();
            if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.target = "_blank";
                a.download = "Template_DSNV.xlsx";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else { alert("Không tìm thấy link tải mẫu."); }
        } catch (e) { alert("Lỗi tải mẫu: " + e.message); }
    }
};