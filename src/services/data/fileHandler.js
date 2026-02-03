/* global XLSX */
import { get } from 'svelte/store';
import { 
    selectedWarehouse, 
    currentUser, 
    realtimeYCXData, 
    categoryStructure, 
    brandList, 
    specialProductList 
} from '../../stores.js';
import { dataProcessing } from '../dataProcessing.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { FILE_MAPPING, LOCAL_DSNV_FILENAME_KEY } from './constants.js';
import { updateSyncState } from './syncHandler.js';

// Hàm đọc file Excel thành Workbook
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
        reader.onerror = (err) => reject(new Error("Không thể đọc file."));
        reader.readAsArrayBuffer(fileBlob);
    });
}

export const fileHandler = {
    // 1. Xử lý các file dữ liệu chính (DSNV, Giờ công, YCX, Thưởng nóng...)
    async handleFileChange(file, saveKey) {
        const mapping = FILE_MAPPING[saveKey];
        if (!mapping) return { success: false, message: `Lỗi mapping: ${saveKey}` };
        
        updateSyncState(saveKey, 'uploading', 'Đang đọc & chuẩn hóa...');
        
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            
            const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
            
            if (!success) {
                updateSyncState(saveKey, 'error', `Thiếu cột: ${missingColumns.join(', ')}`);
                return { success: false, message: `Thiếu cột bắt buộc: ${missingColumns.join(', ')}` };
            }

            // Lưu vào Store
            mapping.store.set(normalizedData);
            
            // Lưu vào IndexedDB (Cache Local)
            await storage.setItem(saveKey, normalizedData); 
            
            // Xử lý riêng cho DSNV (chỉ lưu local)
            if (saveKey === 'saved_danhsachnv') {
                localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
                updateSyncState(saveKey, 'cached', `✓ Đã tải ${normalizedData.length} dòng (Local)`, null);
                return { success: true, count: normalizedData.length, message: `Thành công` };
            }

            // Xử lý Upload lên Cloud (nếu đã chọn kho)
            const warehouse = get(selectedWarehouse);
            if (warehouse && !mapping.localOnly) {
                updateSyncState(saveKey, 'uploading', 'Đang tải lên Cloud...');
                try {
                    const path = `warehouse_data/${warehouse}/${saveKey}_${Date.now()}_${file.name}`;
                    const downloadUrl = await storageService.uploadFileToStorage(file, path);
                    const now = Date.now();
                    
                    const metadata = {
                        downloadURL: downloadUrl,
                        fileName: file.name,
                        fileType: 'excel',
                        rowCount: normalizedData.length,
                        updatedAt: new Date(now),
                        timestamp: now, // [FIX] Thêm timestamp để so sánh chính xác
                        updatedBy: get(currentUser)?.email || 'Tôi'
                    };
                    
                    await datasyncService.saveWarehouseMetadata(warehouse, saveKey, metadata);
                    
                    // [FIX] Cập nhật ngay metadata vào LocalStorage để tránh conflict phiên bản
                    localStorage.setItem(`_meta_${warehouse}_${saveKey}`, JSON.stringify(metadata));

                    updateSyncState(saveKey, 'synced', `✓ Đã đồng bộ`, metadata);
                } catch (e) {
                    console.error("Lỗi upload cloud:", e);
                    updateSyncState(saveKey, 'error', `Lỗi lưu Cloud: ${e.message}`, null);
                    // Không return false ở đây vì dữ liệu local đã ok
                }
            } else {
                 updateSyncState(saveKey, 'synced', `✓ Đã tải ${normalizedData.length} dòng`, null);
            }
            
            analyticsService.trackAction();
            return { success: true, count: normalizedData.length, message: `Thành công` };

        } catch (err) {
            console.error(err);
            updateSyncState(saveKey, 'error', `Lỗi: ${err.message}`, null);
            return { success: false, message: `Lỗi xử lý file: ${err.message}` };
        }
    },

    // 2. Xử lý file Realtime (Tương tự YCX nhưng lưu vào store riêng)
    async handleRealtimeFileInput(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log("[FileHandler] Bắt đầu xử lý Realtime:", file.name);
        
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });

            // Tái sử dụng logic chuẩn hóa của 'ycx' vì cấu trúc file giống nhau
            const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');

            if (!success) {
                alert(`File thiếu cột: ${missingColumns.join(', ')}`);
                return;
            }

            // Cập nhật store
            realtimeYCXData.set(normalizedData);
            
            // Ghi nhận analytics
            analyticsService.trackAction();
            
            console.log(`[FileHandler] Đã nạp ${normalizedData.length} dòng realtime.`);
            // Reset input
            event.target.value = null;

        } catch (error) {
            console.error("Lỗi xử lý Realtime:", error);
            alert("Lỗi đọc file Realtime: " + error.message);
        }
    },

    // 3. Xử lý file Cấu trúc Ngành hàng (Admin)
    async handleCategoryFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });

            const { success, normalizedData, error } = dataProcessing.normalizeCategoryStructureData(rawData);
            
            if (!success) {
                throw new Error(error);
            }

            // Cập nhật Store
            categoryStructure.set(normalizedData);
            
            // Tách danh sách Hãng (Brand) từ dữ liệu
            const brands = [...new Set(normalizedData.map(i => i.nhaSanXuat).filter(Boolean))].sort();
            brandList.set(brands);

            console.log(`[FileHandler] Đã nạp ${normalizedData.length} dòng cấu trúc & ${brands.length} hãng.`);
            
            // Reset input
            event.target.value = null;
            return { success: true, count: normalizedData.length };

        } catch (err) {
            console.error("Lỗi file cấu trúc:", err);
            throw err;
        }
    },

    // 4. Xử lý file Sản phẩm Đặc quyền (Admin)
    async handleSpecialProductFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });

            const { success, normalizedData, error } = dataProcessing.normalizeSpecialProductData(rawData);

            if (!success) {
                throw new Error(error);
            }

            specialProductList.set(normalizedData);
            console.log(`[FileHandler] Đã nạp ${normalizedData.length} SPĐQ.`);
            
            event.target.value = null;
            return { success: true, count: normalizedData.length };

        } catch (err) {
            console.error("Lỗi file SPĐQ:", err);
            throw err;
        }
    },

    // 5. Tải file mẫu
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
            } else {
                alert("Không tìm thấy link tải mẫu.");
            }
        } catch (e) {
            console.error("Lỗi tải template:", e);
            alert("Lỗi khi lấy link tải mẫu: " + e.message);
        }
    }
};