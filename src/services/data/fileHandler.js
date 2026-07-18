/* global XLSX */
import { get } from 'svelte/store';
import { 
    selectedWarehouse, currentUser, realtimeYCXData, 
    categoryStructure, brandList, specialProductList,
    warehouseList, virtualProductList // [NEW] Thêm store mới
} from '../../stores.js';
import { dataProcessing } from '../dataProcessing.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { FILE_MAPPING, LOCAL_DSNV_FILENAME_KEY } from './constants.js';
import { updateSyncState } from './syncHandler.js';

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

            if (error) {
                updateSyncState(saveKey, 'error', `Lỗi: ${error}`);
                return { success: false, message: `Lỗi: ${error}` };
            }

            let dataToStore = normalizedData;
            const currentWh = targetWarehouse || get(selectedWarehouse);

            if (currentWh !== 'ALL' && mapping.normalizeType !== 'danhsachnv') {
                dataToStore = normalizedData.filter(row => {
                    const maKhoRow = String(row.maKhoTao || row.maKho || row['Mã kho tạo'] || row['Kho tạo'] || row.MA_KHO_TAO || row.MA_KHO || '').trim();
                    // [BƠM MÁU LOGIC TỪ BƯỚC TRƯỚC]
                    if (!maKhoRow && (baseKey === 'saved_giocong' || baseKey === 'saved_thuongnong')) {
                        row.maKho = currentWh;
                        return true; 
                    }
                    return maKhoRow === currentWh;
                });
            }

            let filesArray = [];
            let currentMonths = [];

            if (isMultiMode) {
                const dates = normalizedData.map(d => d.ngayTao || d.ngay_tao || d.NgayTao || d['Ngày tạo']).filter(Boolean);
                currentMonths = [...new Set(dates.map(getMonthYear))];

                let existingData = await storage.getItem(saveKey) || [];
                
                existingData = existingData.filter(row => {
                    const rowDate = row.ngayTao || row.ngay_tao || row.NgayTao || row['Ngày tạo'];
                    if (!rowDate) return true;
                    return !currentMonths.includes(getMonthYear(rowDate));
                });
                
                dataToStore = [...existingData, ...dataToStore];
            }

            mapping.store.set(dataToStore);
            await storage.setItem(saveKey, dataToStore);

            if (saveKey === 'saved_danhsachnv') {
                localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
            }

            if (!mapping.localOnly) {
                try {
                    // [PHẪU THUẬT LOGIC]: Chặn lưu vào document "ALL", nhân bản Metadata cho từng kho
                    const validWarehouses = currentWh === 'ALL' 
                        ? get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_'))
                        : [currentWh];

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
                            isMulti: isMultiMode
                        };

                        // [NÒNG CỐT]: Lưu cho tất cả các kho có trong cụm của quản lý này
                        for (const wh of validWarehouses) {
                            await datasyncService.saveWarehouseMetadata(wh, baseKey, metadata);
                            localStorage.setItem(`_meta_${wh}_${baseKey}`, JSON.stringify(metadata));
                        }

                        const successMsg = isMultiMode && currentMonths.length > 0 
                            ? `✓ Đã lưu tháng: ${currentMonths.join(', ')} (${dataToStore.length} dòng)` 
                            : `✓ Đã đồng bộ lên Cloud (${dataToStore.length} dòng)`;
                        updateSyncState(saveKey, 'synced', successMsg, metadata);
                    }

                } catch (cloudErr) {
                    console.error("Cloud sync error:", cloudErr);
                    updateSyncState(saveKey, 'error', `Lưu local OK nhưng lỗi Cloud: ${cloudErr.message}`);
                }
            } else {
                updateSyncState(saveKey, 'cached', `✓ Đã tải ${dataToStore.length} dòng (Chỉ lưu máy này)`, { fileName: file.name });
            }

            analyticsService.trackAction();

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
            mapping.store.set([]);
            await storage.setItem(saveKey, []);

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
                
                // [PHẪU THUẬT LOGIC]: Khi xóa ở chế độ ALL, phải xóa rải rác ở từng kho con
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
            updateSyncState(syncKey, 'error', `Lỗi xóa file: ${error.message}`);
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
            
            // [PHẪU THUẬT LOGIC]: Nhận diện toàn bộ các khả năng đặt tên của thuộc tính Hãng
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

    // [NEW] Xử lý tải file Sản phẩm đặc thù (Gói bảo dưỡng, combo...)
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