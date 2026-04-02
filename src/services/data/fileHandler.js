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
    // [ĐÃ THÊM] tham số isMultiMode
    async handleFileChange(file, saveKey, isMultiMode = false) {
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

            // --- BẮT ĐẦU LOGIC GỘP KHO (UPSERT) ---
            if (isMultiMode) {
                // Lấy dữ liệu hiện tại trong store
                const currentData = get(mapping.store) || [];
                
                // Trích xuất danh sách kho từ file mới
                const incomingWarehouses = [...new Set(normalizedData.map(d => 
                    d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo']
                ).filter(Boolean))];

                // Loại bỏ dữ liệu cũ của các kho đang được nạp đè
                const filteredOldData = currentData.filter(d => 
                    !incomingWarehouses.includes(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'])
                );

                // Ghi đè vào store với dữ liệu đã gộp
                mapping.store.set([...filteredOldData, ...normalizedData]);
            } else {
                // Logic chuẩn: Ghi đè hoàn toàn
                mapping.store.set(normalizedData);
            }
            // --- KẾT THÚC LOGIC GỘP KHO ---
            
            // Lưu vào IndexedDB (Cache Local)
            await storage.setItem(saveKey, isMultiMode ? get(mapping.store) : normalizedData); 
            
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
                        timestamp: now,
                        updatedBy: get(currentUser)?.email || 'Tôi'
                    };
                    
                    await datasyncService.saveWarehouseMetadata(warehouse, saveKey, metadata);
                    
                    localStorage.setItem(`_meta_${warehouse}_${saveKey}`, JSON.stringify(metadata));

                    updateSyncState(saveKey, 'synced', `✓ Đã đồng bộ`, metadata);
                } catch (e) {
                    console.error("Lỗi upload cloud:", e);
                    updateSyncState(saveKey, 'error', `Lỗi lưu Cloud: ${e.message}`, null);
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

    // 2. Xử lý file Realtime
    async handleRealtimeFileInput(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log("[FileHandler] Bắt đầu xử lý Realtime:", file.name);
        
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });

            const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');

            if (!success) {
                alert(`File thiếu cột: ${missingColumns.join(', ')}`);
                return;
            }

            realtimeYCXData.set(normalizedData);
            analyticsService.trackAction();
            
            console.log(`[FileHandler] Đã nạp ${normalizedData.length} dòng realtime.`);
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

            categoryStructure.set(normalizedData);
            
            const brands = [...new Set(normalizedData.map(i => i.nhaSanXuat).filter(Boolean))].sort();
            brandList.set(brands);

            console.log(`[FileHandler] Đã nạp ${normalizedData.length} dòng cấu trúc & ${brands.length} hãng.`);
            
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