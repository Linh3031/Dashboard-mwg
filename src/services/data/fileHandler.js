/* global XLSX */
import { get } from 'svelte/store';
import { selectedWarehouse, currentUser, realtimeYCXData, categoryStructure, brandList, specialProductList } from '../../stores.js';
import { dataProcessing } from '../dataProcessing.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { adminService } from '../admin.service.js';
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
        reader.onerror = (err) => reject(new Error("Could not read the file/blob."));
        reader.readAsArrayBuffer(fileBlob);
    });
}

export const fileHandler = {
    async handleFileChange(file, saveKey) {
        const mapping = FILE_MAPPING[saveKey];
        if (!mapping) return { success: false, message: `Lỗi mapping: ${saveKey}` };
        updateSyncState(saveKey, 'uploading', 'Đang đọc & chuẩn hóa...');
        try {
            const workbook = await _handleFileRead(file);
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
            const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
            if (!success) {
                updateSyncState(saveKey, 'error', `Thiếu cột: ${missingColumns.join(', ')}`);
                return { success: false, message: `Thiếu cột: ${missingColumns.join(', ')}` };
            }
            mapping.store.set(normalizedData);
            await storage.setItem(saveKey, normalizedData); 
            if (saveKey === 'saved_danhsachnv') {
                localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
                updateSyncState(saveKey, 'cached', `✓ Đã tải ${normalizedData.length} dòng (Local)`, null);
                return { success: true, count: normalizedData.length, message: `Thành công` };
            }
            const warehouse = get(selectedWarehouse);
            if (warehouse && !mapping.localOnly) {
                updateSyncState(saveKey, 'uploading', 'Đang tải lên Cloud...');
                try {
                    const path = `warehouse_data/${warehouse}/${saveKey}_${Date.now()}_${file.name}`;
                    const downloadUrl = await storageService.uploadFileToStorage(file, path);
                    const metadata = {
                        downloadURL: downloadUrl,
                        fileName: file.name,
                        fileType: 'excel',
                        rowCount: normalizedData.length,
                        updatedAt: new Date(),
                        updatedBy: get(currentUser)?.email || 'Tôi'
                    };
                    await datasyncService.saveWarehouseMetadata(warehouse, saveKey, metadata);
                    updateSyncState(saveKey, 'synced', `✓ Đã đồng bộ`, metadata);
                } catch (e) {
                    updateSyncState(saveKey, 'error', `Lỗi lưu Cloud: ${e.message}`, null);
                }
            } else {
                 updateSyncState(saveKey, 'synced', `✓ Đã tải ${normalizedData.length} dòng`, null);
            }
            analyticsService.trackAction();
            return { success: true, count: normalizedData.length, message: `Thành công` };
        } catch (err) {
            updateSyncState(saveKey, 'error', `Lỗi: ${err.message}`, null);
            return { success: false, message: `Lỗi: ${err.message}` };
        }
    },
    // ... Các hàm khác (rút gọn để tránh lỗi copy paste, nếu cần tôi gửi full)
    handleRealtimeFileInput: async (event) => { /* logic */ },
    handleCategoryFile: async (event) => { /* logic */ },
    handleSpecialProductFileUpload: async (event) => { /* logic */ },
    handleTemplateDownload: async () => { /* logic */ }
};

// Bổ sung các hàm handleRealtimeFileInput, handleCategoryFile... y hệt code cũ vào đây nếu bạn cần full code file này