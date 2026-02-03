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
                    const now = Date.now();
                    const metadata = {
                        downloadURL: downloadUrl,
                        fileName: 'du_lieu_dan.txt',
                        fileType: 'text',
                        rowCount: processedCount, 
                        updatedAt: new Date(now),
                        timestamp: now, // [FIX] Thêm timestamp
                        updatedBy: get(currentUser)?.email || 'Tôi'
                    };
                    await datasyncService.saveWarehouseMetadata(warehouse, primaryKey, metadata);
                    
                    // [FIX] Cập nhật metadata local ngay lập tức
                    localStorage.setItem(`_meta_${warehouse}_${primaryKey}`, JSON.stringify(metadata));

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
};