import { get } from 'svelte/store';
import { selectedWarehouse, currentUser, competitionData, pastedThiDuaReportData } from '../../stores.js';
import { dataProcessing } from '../dataProcessing.js';
import { storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { PASTE_MAPPING } from './constants.js';
import { updateSyncState } from './syncHandler.js';

export const pasteHandler = {
    async handlePasteChange(pastedText, saveKeyPaste, saveKeyRaw, saveKeyProcessed) {
        const primaryKey = saveKeyProcessed || saveKeyPaste;
        
        let mapping = PASTE_MAPPING[primaryKey];
        let baseKey = primaryKey;
        let targetWarehouse = null;

        // --- 🚨 [GENESIS PREFIX ROUTING ENGINE] 🚨 ---
        // Nếu không tìm thấy key chính xác, bắt đầu bóc tách Tiền tố (Base) và Hậu tố (Mã kho)
        if (!mapping) {
            for (const key of Object.keys(PASTE_MAPPING)) {
                if (primaryKey.startsWith(key + '_')) {
                    mapping = PASTE_MAPPING[key];
                    baseKey = key; // Lấy tiền tố (VD: daily_paste_luyke)
                    targetWarehouse = primaryKey.replace(key + '_', ''); // Lấy mã kho ở đuôi (VD: 908)
                    break;
                }
            }
        }

        if (!mapping) return { success: false, message: `Lỗi mapping paste` };

        // [BYPASS] Dành cho Báo cáo Cụm: Người gác cổng sẽ mở cửa cho qua thẳng, 
        // vì logic trích xuất đã được xử lý riêng bên ngoài (DataSection.svelte)
        if (mapping.bypassHandler) {
             return { success: true, message: `Bypassed to component logic` };
        }
        // ----------------------------------------------
        
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
                
                if(saveKeyRaw) localStorage.setItem(saveKeyRaw, pastedText);
                if(saveKeyProcessed) localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
                processedCount = processedData.length;
            } else if (mapping.processFunc) {
                processedData = mapping.processFunc(pastedText);
                mapping.store.set(processedData);
                localStorage.setItem(saveKeyPaste, pastedText);
                processedCount = processedData?.length || 0;
                
                // [FIX] Sử dụng baseKey để kiểm tra, đảm bảo nó vẫn chạy đúng dù có gắn đuôi mã kho hay không
                if (baseKey === 'daily_paste_luyke' || baseKey === 'cluster_paste_luyke') {
                     const comps = dataProcessing.parseCompetitionDataFromLuyKe(pastedText);
                     dataProcessing.parseLuyKePastedData(pastedText);
                     processedCount = comps.length;
                }
            }
            
            // [SMART ROUTING] Ưu tiên lấy mã kho từ Hậu tố của key. Nếu không có thì mới lấy từ Bộ lọc (selectedWarehouse)
            const warehouse = targetWarehouse || get(selectedWarehouse);
            
            // Chặn không cho lưu vào thư mục ảo 'ALL' trên Cloud
            if (warehouse && warehouse !== 'ALL') {
                try {
                    updateSyncState(saveKeyPaste, 'uploading', 'Đang lưu Cloud...');
                    const blob = new Blob([pastedText], { type: 'text/plain' });
                    
                    // [FIX] Sử dụng baseKey (VD: daily_paste_luyke) làm tên file và key trên Firestore để đồng bộ chuẩn xác
                    const path = `warehouse_data/${warehouse}/${baseKey}_${Date.now()}.txt`;
                    const downloadUrl = await storageService.uploadFileToStorage(blob, path);
                    const now = Date.now();
                    const metadata = {
                        downloadURL: downloadUrl,
                        fileName: 'du_lieu_dan.txt',
                        fileType: 'text',
                        rowCount: processedCount, 
                        updatedAt: new Date(now),
                        timestamp: now, 
                        updatedBy: get(currentUser)?.email || 'Tôi'
                    };
                    
                    // Ném dữ liệu vào đúng Document của Kho tương ứng
                    await datasyncService.saveWarehouseMetadata(warehouse, baseKey, metadata);
                    localStorage.setItem(`_meta_${warehouse}_${baseKey}`, JSON.stringify(metadata));

                    // Cập nhật lại UI bằng saveKeyPaste để đúng cái ô vừa dán sáng đèn Xanh
                    updateSyncState(saveKeyPaste, 'synced', `✓ Đã đồng bộ kho ${warehouse}`, metadata);
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
};