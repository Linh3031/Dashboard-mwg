// src/services/dataService.js
// Version 5.5 - FULL CODE (Auto-Download Logic & Fix Sync Display)
/* global XLSX */
import { get } from 'svelte/store';
import { 
    danhSachNhanVien, rawGioCongData, ycxData, thuongNongData,
    ycxDataThangTruoc, thuongNongDataThangTruoc, thuongERPData, 
    thuongERPDataThangTruoc, competitionData, pastedThiDuaReportData,
    realtimeYCXData, categoryStructure, brandList, specialProductList,
    selectedWarehouse, currentUser, fileSyncState
} from '../stores.js';
import { dataProcessing } from './dataProcessing.js';
import { storage, storageService } from './storage.service.js';
import { datasyncService } from './datasync.service.js';
import { analyticsService } from './analytics.service.js';
import { adminService } from './admin.service.js';

const LOCAL_DSNV_FILENAME_KEY = '_localDsnvFilename';
const RAW_PASTE_THIDUANV_KEY = 'raw_paste_thiduanv';
const LOCAL_METADATA_PREFIX = '_localMetadata_';

// [CẤU HÌNH]
const FILE_MAPPING = {
    'saved_danhsachnv': { store: danhSachNhanVien, normalizeType: 'danhsachnv', name: 'DS Nhân viên', localOnly: true },
    'saved_giocong': { store: rawGioCongData, normalizeType: 'giocong', name: 'Giờ công' },
    'saved_ycx': { store: ycxData, normalizeType: 'ycx', name: 'YCX Lũy kế' },
    'saved_thuongnong': { store: thuongNongData, normalizeType: 'thuongnong', name: 'Thưởng nóng' },
    'saved_ycx_thangtruoc': { store: ycxDataThangTruoc, normalizeType: 'ycx', name: 'YCX Tháng trước' },
    'saved_thuongnong_thangtruoc': { store: thuongNongDataThangTruoc, normalizeType: 'thuongnong', name: 'Thưởng nóng TT' }
};

const PASTE_MAPPING = {
    'daily_paste_luyke': { 
        processFunc: dataProcessing.parseCompetitionDataFromLuyKe, 
        store: competitionData,
        isThiDuaNV: false,
        name: 'Data Lũy Kế'
    },
    'daily_paste_thuongerp': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPData,
        isThiDuaNV: false,
        name: 'Thưởng ERP'
    },
    'saved_thuongerp_thangtruoc': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPDataThangTruoc,
        isThiDuaNV: false,
        name: 'Thưởng ERP (TT)'
    },
    'daily_paste_thiduanv': { 
        processFunc: dataProcessing.processThiDuaNhanVienData, 
        store: pastedThiDuaReportData,
        isThiDuaNV: true,
        name: 'Thi đua NV'
    }
};

const notify = (msg, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
};

function updateSyncState(key, status, message, metadata = null) {
    fileSyncState.update(s => ({
        ...s,
        [key]: { status, message, metadata, timestamp: Date.now() }
    }));
}

function formatTimeAgo(dateInput) {
    if (!dateInput) return '';
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "vừa xong";
}

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

// ============================================================
// CORE LOGIC FUNCTIONS
// ============================================================

async function handleFileChange(file, saveKey) {
    const mapping = FILE_MAPPING[saveKey];
    if (!mapping) return { success: false, message: `Lỗi mapping: ${saveKey}` };

    updateSyncState(saveKey, 'uploading', 'Đang đọc & chuẩn hóa...');

    try {
        console.log(`[Upload] Processing File: ${file.name}`);
        
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
            updateSyncState(saveKey, 'cached', `✓ Đã tải ${normalizedData.length} dòng (Chỉ lưu máy này)`, null);
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
                updateSyncState(saveKey, 'synced', `✓ Đã đồng bộ (bản mới nhất)`, metadata);

            } catch (e) {
                console.error("Cloud upload error:", e);
                updateSyncState(saveKey, 'error', `Lỗi lưu Cloud: ${e.message}`, null);
            }
        } else {
             updateSyncState(saveKey, 'synced', `✓ Đã tải ${normalizedData.length} dòng (Chưa chọn kho)`, null);
        }
        
        analyticsService.trackAction();
        return { success: true, count: normalizedData.length, message: `Thành công` };

    } catch (err) {
        updateSyncState(saveKey, 'error', `Lỗi: ${err.message}`, null);
        return { success: false, message: `Lỗi: ${err.message}` };
    }
}

async function handlePasteChange(pastedText, saveKeyPaste, saveKeyRaw, saveKeyProcessed) {
    const primaryKey = saveKeyProcessed || saveKeyPaste;
    const mapping = PASTE_MAPPING[primaryKey];
    if (!mapping) return { success: false, message: `Lỗi mapping paste` };
    
    updateSyncState(saveKeyPaste, 'uploading', 'Đang xử lý...');

    try {
        let processedData;
        let processedCount = 0;
        
        if (mapping.isThiDuaNV) {
            const parsedData = dataProcessing.parsePastedThiDuaTableData(pastedText);
            if (!parsedData.success) throw new Error(parsedData.error);
            
            dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
            
            const $competitionData = get(competitionData);
            processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
            
            mapping.store.set(processedData);
            localStorage.setItem(saveKeyRaw, pastedText);
            localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
            processedCount = processedData.length;

        } else if (mapping.processFunc) {
            processedData = mapping.processFunc(pastedText);
            mapping.store.set(processedData);
            localStorage.setItem(saveKeyPaste, pastedText);
            processedCount = processedData?.length || 0;
            
            if (saveKeyPaste === 'daily_paste_luyke') {
                const comps = dataProcessing.parseCompetitionDataFromLuyKe(pastedText);
                dataProcessing.parseLuyKePastedData(pastedText);
                processedCount = comps.length;
            }
        }

        const warehouse = get(selectedWarehouse);

        if (warehouse) {
            try {
                updateSyncState(saveKeyPaste, 'uploading', 'Đang lưu Cloud...');
                const blob = new Blob([pastedText], { type: 'text/plain' });
                const path = `warehouse_data/${warehouse}/${primaryKey}_${Date.now()}.txt`;
                
                const downloadUrl = await storageService.uploadFileToStorage(blob, path);
                
                const metadata = {
                    downloadURL: downloadUrl,
                    fileName: 'du_lieu_dan.txt',
                    fileType: 'text',
                    rowCount: processedCount, 
                    updatedAt: new Date(),
                    updatedBy: get(currentUser)?.email || 'Tôi'
                };

                await datasyncService.saveWarehouseMetadata(warehouse, primaryKey, metadata);
                
                updateSyncState(saveKeyPaste, 'synced', `✓ Đã đồng bộ`, metadata);

            } catch (e) {
                console.error("Cloud paste upload error:", e);
                updateSyncState(saveKeyPaste, 'error', `Lỗi đồng bộ Cloud: ${e.message}`);
            }
        } else {
             updateSyncState(saveKeyPaste, 'cached', `✓ Đã xử lý (Local)`, null);
        }

        analyticsService.trackAction();
        return { success: true, message: `Thành công` };

    } catch (err) {
        updateSyncState(saveKeyPaste, 'error', `Lỗi: ${err.message}`);
        return { success: false, message: `Lỗi: ${err.message}` };
    }
}

async function syncDownFromCloud(warehouse) {
    if (!warehouse) return { success: false, message: "Chưa chọn kho." };
    
    console.log(`[DataService] Bắt đầu đồng bộ kho ${warehouse}...`);

    for (const key of Object.keys(FILE_MAPPING)) {
        if (!FILE_MAPPING[key].localOnly) updateSyncState(key, 'checking', 'Đang kiểm tra...', null);
    }
    for (const key of Object.keys(PASTE_MAPPING)) {
         updateSyncState(key, 'checking', 'Đang kiểm tra...', null);
    }

    try {
        const cloudData = await datasyncService.loadWarehouseData(warehouse);
        
        if (!cloudData) {
            return { success: true, message: "Kho chưa có dữ liệu trên Cloud." };
        }

        const userEmail = get(currentUser)?.email;

        // 1. FILE EXCEL
        for (const [key, mapping] of Object.entries(FILE_MAPPING)) {
            if (mapping.localOnly) continue;

            const cloudMeta = cloudData[key];
            const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${key}`);
            const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};

            if (!cloudMeta) continue;

            const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
            const isMyUpload = cloudMeta.updatedBy === userEmail;
            const isNewer = (cloudMeta.timestamp || 0) > (localMeta.timestamp || 0);

            // Kiểm tra xem Store hiện tại có dữ liệu chưa
            const currentStoreData = get(mapping.store);
            const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;

            if (isNewer) {
                const msg = isMyUpload ? `Có bản mới từ bạn ${timeAgo}` : `Có cập nhật mới từ ${cloudMeta.updatedBy} ${timeAgo}`;
                updateSyncState(key, 'update_available', msg, cloudMeta);
            } else {
                // Metadata khớp (Đã đồng bộ)
                // [FIX QUAN TRỌNG] Nếu Store rỗng (máy mới/ẩn danh), TỰ ĐỘNG TẢI VỀ
                if (isStoreEmpty) {
                    console.log(`[Auto-Download] ${key} đã đồng bộ metadata nhưng Store rỗng. Đang tự tải về...`);
                    updateSyncState(key, 'downloading', 'Đang tự động tải về...', cloudMeta);
                    await downloadFileFromCloud(key);
                } else {
                    updateSyncState(key, 'synced', `✓ Đã đồng bộ ${timeAgo} (${cloudMeta.rowCount || 0} dòng)`, cloudMeta);
                }
            }
        }
        
        // 2. PASTE DATA
        for (const [key, mapping] of Object.entries(PASTE_MAPPING)) {
            const cloudMeta = cloudData[key]; 
            
            // Lấy metadata local
            const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${key}`);
            const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
             
            if (cloudMeta) {
                const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
                const isMyUpload = cloudMeta.updatedBy === userEmail;
                const isNewer = (cloudMeta.timestamp || 0) > (localMeta.timestamp || 0);

                let uiKey = key;

                if (isNewer) {
                     const msg = isMyUpload ? `Có bản mới từ bạn ${timeAgo}` : `Có cập nhật mới từ ${cloudMeta.updatedBy} ${timeAgo}`;
                     updateSyncState(uiKey, 'update_available', msg, cloudMeta);
                } else {
                     // Đã đồng bộ metadata
                     // Kiểm tra store xem có dữ liệu chưa
                     const currentStoreData = get(mapping.store);
                     const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;
                     
                     if (isStoreEmpty) {
                          console.log(`[Auto-Download] ${uiKey} (Paste) đã đồng bộ metadata nhưng Store rỗng. Đang tự tải...`);
                          updateSyncState(uiKey, 'downloading', 'Đang tự tải...', cloudMeta);
                          await downloadFileFromCloud(uiKey);
                     } else {
                          updateSyncState(uiKey, 'synced', `✓ Đã đồng bộ ${timeAgo}`, cloudMeta);
                     }
                }
            }
        }

        return { success: true, message: `Đã kiểm tra dữ liệu kho ${warehouse}.` };

    } catch (error) {
        console.error("Sync error:", error);
        return { success: false, message: "Lỗi kết nối Cloud: " + error.message };
    }
}

async function downloadFileFromCloud(key) {
    const state = get(fileSyncState)[key];
    const warehouse = get(selectedWarehouse);

    if (!state?.metadata?.downloadURL || !warehouse) return;

    updateSyncState(key, 'downloading', 'Đang tải xuống...', state.metadata);

    try {
        const response = await fetch(state.metadata.downloadURL);
        
        // --- 1. FILE EXCEL ---
        if (FILE_MAPPING[key]) {
            const blob = await response.blob();
            const workbook = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target.result);
                    resolve(XLSX.read(data, { type: 'array', cellDates: true, cellText: true }));
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });

            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
            const mapping = FILE_MAPPING[key];
            const { normalizedData } = dataProcessing.normalizeData(rawData, mapping.normalizeType);

            mapping.store.set(normalizedData);
            await storage.setItem(key, normalizedData);
            
            const metaToSave = { ...state.metadata, timestamp: state.metadata.timestamp || Date.now() };
            localStorage.setItem(`_meta_${warehouse}_${key}`, JSON.stringify(metaToSave));
            
            const timeAgo = formatTimeAgo(state.metadata.updatedAt);
            updateSyncState(key, 'synced', `✓ Đã đồng bộ ${timeAgo} (${normalizedData.length} dòng)`, state.metadata);
        } 
        // --- 2. PASTE DATA (TEXT) ---
        else if (PASTE_MAPPING[key]) {
            const textContent = await response.text();
            const mapping = PASTE_MAPPING[key];
            
            let processedCount = 0;
            if (mapping.isThiDuaNV) {
                localStorage.setItem('raw_paste_thiduanv', textContent);
                const parsedData = dataProcessing.parsePastedThiDuaTableData(textContent);
                if (parsedData.success) {
                    dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
                    const $competitionData = get(competitionData);
                    const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
                    
                    mapping.store.set(processedData);
                    processedCount = processedData.length;
                    localStorage.setItem('daily_paste_thiduanv', JSON.stringify(processedData)); 
                }
            } else if (mapping.processFunc) {
                const processedData = mapping.processFunc(textContent);
                mapping.store.set(processedData);
                processedCount = processedData?.length || 0;
                localStorage.setItem(key, textContent);
                
                if (key === 'daily_paste_luyke') {
                     const comps = dataProcessing.parseCompetitionDataFromLuyKe(textContent);
                     dataProcessing.parseLuyKePastedData(textContent);
                     processedCount = comps.length;
                }
            }

            // [FIX] Cập nhật metadata local với rowCount THỰC TẾ vừa xử lý được
            const metaToSave = { 
                ...state.metadata, 
                timestamp: state.metadata.timestamp || Date.now(),
                rowCount: processedCount // Ghi đè rowCount bằng số thực tế
            };
            localStorage.setItem(`_meta_${warehouse}_${key}`, JSON.stringify(metaToSave));

            const timeAgo = formatTimeAgo(state.metadata.updatedAt);
            updateSyncState(key, 'synced', `✓ Đã đồng bộ ${timeAgo}`, metaToSave);
            
            window.dispatchEvent(new CustomEvent('cloud-paste-loaded', { detail: { key, text: textContent } }));
        }
        
        return { success: true };

    } catch (e) {
        console.error(e);
        updateSyncState(key, 'error', 'Lỗi tải file: ' + e.message, state.metadata);
        return { success: false, message: e.message };
    }
}

async function loadAllFromCache() {
    try { await storage.openDB(); } catch (err) { console.error("Lỗi DB:", err); }

    // 1. Tải DSNV
    console.log("[DataService] Bắt đầu tải DSNV từ cache...");
    const dsnvData = await storage.getItem('saved_danhsachnv');
    
    if (dsnvData && dsnvData.length > 0) {
        danhSachNhanVien.set(dsnvData);
        const fileName = localStorage.getItem(LOCAL_DSNV_FILENAME_KEY) || 'DSNV (Cache)';
        updateSyncState('saved_danhsachnv', 'cached', `✓ Đã tải ${dsnvData.length} dòng (Chỉ lưu máy này)`, { fileName });
    } else {
        updateSyncState('saved_danhsachnv', 'error', 'Chưa có DSNV. Vui lòng tải file.', null);
    }

    // 2. Tải File Excel khác
    const otherFiles = ['saved_giocong', 'saved_ycx', 'saved_thuongnong', 'saved_ycx_thangtruoc', 'saved_thuongnong_thangtruoc'];
    await Promise.all(otherFiles.map(async (key) => {
        const data = await storage.getItem(key);
        if (data && data.length > 0) {
            FILE_MAPPING[key].store.set(data);
            updateSyncState(key, 'cached', `✓ Đã tải ${data.length} dòng (Local)`, null);
        }
    }));

    // 3. Tải & Xử lý Paste Data
    console.log("[DataService] Bắt đầu xử lý dữ liệu Paste...");
    try {
        // Lũy kế
        const luykeText = localStorage.getItem('daily_paste_luyke');
        if (luykeText) {
            dataProcessing.parseLuyKePastedData(luykeText);
            const comps = dataProcessing.parseCompetitionDataFromLuyKe(luykeText);
            updateSyncState('daily_paste_luyke', 'cached', `(Local)`, null);
        }
 
        // Thưởng ERP
        const erpText = localStorage.getItem('daily_paste_thuongerp');
        if (erpText) {
            const data = dataProcessing.processThuongERP(erpText);
            thuongERPData.set(data);
            updateSyncState('daily_paste_thuongerp', 'cached', `(Local)`, null);
        }
        
        // Thi đua NV
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
        
        // Thưởng ERP TT
        const erpTTText = localStorage.getItem('saved_thuongerp_thangtruoc');
        if (erpTTText) {
             const data = dataProcessing.processThuongERP(erpTTText);
             thuongERPDataThangTruoc.set(data);
             updateSyncState('saved_thuongerp_thangtruoc', 'cached', `(Local)`, null);
        }

    } catch (err) { console.error("Lỗi tải cache paste:", err); }
}

async function handleCategoryFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const workbook = await _handleFileRead(file);
        const categorySheet = workbook.Sheets[workbook.SheetNames[0]];
        const categoryRawData = XLSX.utils.sheet_to_json(categorySheet, { raw: false, defval: null });
        const categoryResult = dataProcessing.normalizeCategoryStructureData(categoryRawData);

        let brandResult = { success: true, normalizedData: [] };
        const brandSheetName = workbook.SheetNames.find(name => name.toLowerCase().trim() === 'hãng');
        if (brandSheetName) {
            const brandSheet = workbook.Sheets[brandSheetName];
            const brandRawData = XLSX.utils.sheet_to_json(brandSheet, { raw: false, defval: null });
            brandResult = dataProcessing.normalizeBrandData(brandRawData);
        }

        if(categoryResult.success) {
            categoryStructure.set(categoryResult.normalizedData);
            brandList.set(brandResult.normalizedData);
            await adminService.saveCategoryDataToFirestore({
                categories: categoryResult.normalizedData,
                brands: brandResult.normalizedData
            });
            notify("Đã cập nhật danh mục ngành hàng & hãng", "success");
        } else {
            throw new Error(`Lỗi xử lý file khai báo: ${categoryResult.error}`);
        }
        event.target.value = ''; 
    } catch(e) {
        notify(e.message, 'error');
    }
}

async function handleSpecialProductFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const result = dataProcessing.normalizeSpecialProductData(rawData);
        if (result.success) {
            specialProductList.set(result.normalizedData);
            await adminService.saveSpecialProductList(result.normalizedData);
            notify("Đã cập nhật SP Đặc quyền", "success");
        } else {
            throw new Error(`Lỗi xử lý file SPĐQ: ${result.error}`);
        }
        event.target.value = '';
    } catch(e) {
        notify(e.message, 'error');
    }
}

async function handleTemplateDownload() {
    try {
        const url = await storageService.getTemplateDownloadURL();
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Danh_Sach_Nhan_Vien_Mau.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        notify('Lỗi tải file mẫu: ' + e.message, 'error');
    }
}

async function handleRealtimeFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    notify('Đang xử lý file realtime...', 'success');
    realtimeYCXData.set([]);
    
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');
        if (success) {
            realtimeYCXData.set(normalizedData);
            notify(`Đã tải ${normalizedData.length} dòng realtime`, 'success');
            analyticsService.trackAction();
        } else {
            console.error(`File lỗi! Thiếu cột: ${missingColumns.join(', ')}`);
            notify(`Lỗi thiếu cột: ${missingColumns.join(', ')}`, 'error');
        }
    } catch (e) {
        console.error("Lỗi xử lý file Realtime:", e);
        notify(e.message, 'error');
    } finally {
        event.target.value = '';
    }
}

export const dataService = {
    appController: null,
    init(controller) { this.appController = controller; },
    handleFileChange,
    handlePasteChange,
    syncDownFromCloud,
    downloadFileFromCloud,
    loadAllFromCache,
    handleCategoryFile,
    handleSpecialProductFileUpload,
    handleTemplateDownload,
    handleRealtimeFileInput,
    _getSavedMetadata(warehouse, dataType) { return null; }
};