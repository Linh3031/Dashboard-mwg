/* global XLSX */
import { get } from 'svelte/store';
import { 
    selectedWarehouse, currentUser, realtimeYCXData, 
    categoryStructure, brandList, specialProductList 
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
    const parts = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (parts) return `${parts[2].padStart(2, '0')}/${parts[3]}`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return 'Unknown';
};

export const fileHandler = {
    async handleFileChange(file, saveKey, isMultiMode = false) {
        const mapping = FILE_MAPPING[saveKey];
        if (!mapping) return { success: false, message: `Lỗi mapping: ${saveKey}` };
        
        updateSyncState(saveKey, 'uploading', 'Đang đọc & chuẩn hóa...');
        
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];
            const rawAddressCol = headers.find(h => 
                h.toLowerCase().includes('địa chỉ') || 
                h.toLowerCase().includes('dia chi') || 
                h.toLowerCase().includes('address')
            );

            let { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
            
            if (!success) {
                updateSyncState(saveKey, 'error', `Thiếu cột: ${missingColumns.join(', ')}`);
                return { success: false, message: `Thiếu cột bắt buộc` };
            }

            // --- 🚨 [BỘ KHIÊN BẢO VỆ DỮ LIỆU GỐC] 🚨 ---
            if (mapping.normalizeType === 'ycx' || saveKey.includes('ycx')) {
                console.log(`[FileHandler] Đã kích hoạt Khiên bảo vệ Dữ liệu gốc (Địa chỉ & Mã kho)`);
                normalizedData = normalizedData.map((row, index) => {
                    const rawRow = rawData[index];
                    
                    const diaChi = rawAddressCol ? String(rawRow[rawAddressCol] || '').trim() : row.diaChi;
                    
                    const maKhoGoc = rawRow['Mã kho tạo'] || rawRow['Kho tạo'] || rawRow['Mã Kho Tạo'] || rawRow['maKhoTao'] || row.maKhoTao || row.maKho;

                    return {
                        ...row,
                        diaChi: diaChi,
                        maKhoTao: maKhoGoc ? String(maKhoGoc).trim() : row.maKhoTao,
                        maKho: maKhoGoc ? String(maKhoGoc).trim() : row.maKho
                    };
                });
            }
            // ------------------------------------------

            if (isMultiMode && (saveKey === 'saved_ycx_cungkynam' || saveKey === 'saved_ycx_thangtruoc')) {
                const currentData = get(mapping.store) || [];
                const incomingMonthsSet = new Set();
                normalizedData.forEach(r => {
                    const my = getMonthYear(r.ngayTao || r.NGAY_TAO);
                    if (my !== 'Unknown') incomingMonthsSet.add(my);
                });
                const incomingMonths = Array.from(incomingMonthsSet);

                const overlap = incomingMonths.filter(m => currentData.some(r => getMonthYear(r.ngayTao || r.NGAY_TAO) === m));
                
                if (overlap.length > 0) {
                    const confirmOverwrite = window.confirm(`CẢNH BÁO: Dữ liệu của các tháng: ${overlap.join(', ')} đã tồn tại.\nBạn có muốn xóa dữ liệu cũ của các tháng này và nạp file mới đè lên không?`);
                    if (!confirmOverwrite) {
                        updateSyncState(saveKey, 'error', 'Người dùng hủy thao tác ghi đè.');
                        return { success: false, message: 'Đã hủy thao tác ghi đè' };
                    }
                }

                const filteredOldData = currentData.filter(r => !incomingMonths.includes(getMonthYear(r.ngayTao || r.NGAY_TAO)));
                normalizedData = [...filteredOldData, ...normalizedData];
                mapping.store.set(normalizedData);
            } 
            else if (isMultiMode) {
                const currentData = get(mapping.store) || [];
                const incomingWarehouses = [...new Set(normalizedData.map(d => String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || '').trim()).filter(Boolean))];
                const filteredOldData = currentData.filter(d => !incomingWarehouses.includes(String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || '').trim()));
                normalizedData = [...filteredOldData, ...normalizedData];
                mapping.store.set(normalizedData);
            } else {
                mapping.store.set(normalizedData);
            }
            
            await storage.setItem(saveKey, isMultiMode ? get(mapping.store) : normalizedData); 
            
            if (saveKey === 'saved_danhsachnv') {
                localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
                updateSyncState(saveKey, 'cached', `✓ Đã tải ${normalizedData.length} dòng`, null);
                return { success: true };
            }

            const warehouse = get(selectedWarehouse);
            if (warehouse && !mapping.localOnly) {
                updateSyncState(saveKey, 'uploading', 'Đang tải lên Cloud...');
                try {
                    const storagePathWh = warehouse === 'ALL' ? 'CLUSTER' : warehouse;
                    const path = `warehouse_data/${storagePathWh}/${saveKey}_${Date.now()}_${file.name}`;
                    const downloadURL = await storageService.uploadFileToStorage(file, path);
                    const now = Date.now();
                    const extractedMonths = [...new Set(normalizedData.map(r => getMonthYear(r.ngayTao || r.NGAY_TAO)).filter(m => m !== 'Unknown'))];

                    if (warehouse === 'ALL') {
                        const incomingWarehouses = [...new Set(normalizedData.map(d => String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || '').trim()).filter(Boolean))];
                        
                        console.log(`[Auto-Splitter] Phát hiện ${incomingWarehouses.length} kho trong file:`, incomingWarehouses);

                        await Promise.all(incomingWarehouses.map(async (kho) => {
                            const khoDataCount = normalizedData.filter(d => String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || '').trim() === kho).length;
                            const khoMetadata = { 
                                downloadURL, fileName: file.name, fileType: 'excel', 
                                rowCount: khoDataCount, 
                                uploadedMonths: extractedMonths, 
                                updatedAt: new Date(now), timestamp: now, updatedBy: get(currentUser)?.email || 'Tôi' 
                            };
                            await datasyncService.saveWarehouseMetadata(kho, saveKey, khoMetadata);
                            localStorage.setItem(`_meta_${kho}_${saveKey}`, JSON.stringify(khoMetadata));
                        }));

                        const allMetadata = { 
                            downloadURL, fileName: file.name, fileType: 'excel', 
                            rowCount: normalizedData.length, 
                            uploadedMonths: extractedMonths, 
                            updatedAt: new Date(now), timestamp: now, updatedBy: get(currentUser)?.email || 'Tôi' 
                        };
                        localStorage.setItem(`_meta_ALL_${saveKey}`, JSON.stringify(allMetadata));
                        
                        // [PHẪU THUẬT LOGIC]: Lưu Meta tổng của ALL lên Cloud. Trình duyệt Ẩn danh sẽ tải trực tiếp từ đây!
                        await datasyncService.saveWarehouseMetadata('ALL', saveKey, allMetadata);

                        updateSyncState(saveKey, 'synced', `✓ Đã chia rổ Cloud cho ${incomingWarehouses.length} kho`, allMetadata);

                    } else {
                        const metadata = { 
                            downloadURL, fileName: file.name, fileType: 'excel', 
                            rowCount: normalizedData.length, uploadedMonths: extractedMonths, 
                            updatedAt: new Date(now), timestamp: now, updatedBy: get(currentUser)?.email || 'Tôi' 
                        };
                        
                        await datasyncService.saveWarehouseMetadata(warehouse, saveKey, metadata);
                        localStorage.setItem(`_meta_${warehouse}_${saveKey}`, JSON.stringify(metadata));
                        updateSyncState(saveKey, 'synced', `✓ Đã đồng bộ`, metadata);
                    }
                } catch (e) {
                    updateSyncState(saveKey, 'error', `Lỗi lưu Cloud: ${e.message}`, null);
                }
            } else {
                 updateSyncState(saveKey, 'synced', `✓ Đã tải ${normalizedData.length} dòng`, null);
            }
            
            analyticsService.trackAction();
            return { success: true };
        } catch (err) {
            updateSyncState(saveKey, 'error', `Lỗi: ${err.message}`, null);
            return { success: false, message: err.message };
        }
    },

  async handleRealtimeFileInput(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const workbook = await _handleFileRead(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
            
            const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];
            const rawAddressCol = headers.find(h => 
                h.toLowerCase().includes('địa chỉ') || 
                h.toLowerCase().includes('dia chi') || 
                h.toLowerCase().includes('address')
            );

            let { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');
            if (!success) { alert(`File thiếu cột: ${missingColumns.join(', ')}`); return; }

            if (rawAddressCol) {
                normalizedData = normalizedData.map((row, index) => {
                    return {
                        ...row,
                        diaChi: String(rawData[index][rawAddressCol] || '').trim()
                    };
                });
            }

            realtimeYCXData.set(normalizedData);
            analyticsService.trackAction();
            event.target.value = null;
        } catch (error) { alert("Lỗi đọc file Realtime: " + error.message); }
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
            const brands = [...new Set(normalizedData.map(i => i.nhaSanXuat).filter(Boolean))].sort();
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