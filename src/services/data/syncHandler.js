/* global XLSX */
import { get } from 'svelte/store';
import { fileSyncState, selectedWarehouse, currentUser, competitionData, pastedThiDuaReportData, thuongERPData, thuongERPDataThangTruoc } from '../../stores.js';
import { datasyncService } from '../datasync.service.js';
import { storage } from '../storage.service.js';
import { dataProcessing } from '../dataProcessing.js';
import { FILE_MAPPING, PASTE_MAPPING } from './constants.js';

export function updateSyncState(key, status, message, metadata = null) {
    fileSyncState.update(s => ({
        ...s,
        [key]: { status, message, metadata, timestamp: Date.now() }
    }));
}

export function formatTimeAgo(dateInput) {
    if (!dateInput) return '';
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "vừa xong";
}

export const syncHandler = {
    async syncDownFromCloud(warehouse) {
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

            // Xử lý File Excel
            for (const [key, mapping] of Object.entries(FILE_MAPPING)) {
                if (mapping.localOnly) continue;
                const cloudMeta = cloudData[key];
                const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${key}`);
                const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
                if (!cloudMeta) continue;

                const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
                const isMyUpload = cloudMeta.updatedBy === userEmail;
                const isNewer = (cloudMeta.timestamp || 0) > (localMeta.timestamp || 0);
                const currentStoreData = get(mapping.store);
                const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;

                if (isNewer) {
                     const msg = isMyUpload ? `Có bản mới từ bạn ${timeAgo}` : `Có cập nhật mới từ ${cloudMeta.updatedBy} ${timeAgo}`;
                    updateSyncState(key, 'update_available', msg, cloudMeta);
                } else {
                    if (isStoreEmpty) {
                        console.log(`[Auto-Download] ${key} đã đồng bộ metadata nhưng Store rỗng. Đang tự tải về...`);
                        updateSyncState(key, 'downloading', 'Đang tự động tải về...', cloudMeta);
                        await this.downloadFileFromCloud(key);
                    } else {
                         updateSyncState(key, 'synced', `✓ Đã đồng bộ ${timeAgo} (${cloudMeta.rowCount || 0} dòng)`, cloudMeta);
                    }
                }
            }

            // Xử lý Paste Data
            for (const [key, mapping] of Object.entries(PASTE_MAPPING)) {
                const cloudMeta = cloudData[key]; 
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
                         const currentStoreData = get(mapping.store);
                         const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;
                         if (isStoreEmpty) {
                              console.log(`[Auto-Download] ${uiKey} (Paste) đã đồng bộ metadata nhưng Store rỗng. Đang tự tải...`);
                              updateSyncState(uiKey, 'downloading', 'Đang tự tải...', cloudMeta);
                              await this.downloadFileFromCloud(uiKey);
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
    },

    async downloadFileFromCloud(key) {
        const state = get(fileSyncState)[key];
        const warehouse = get(selectedWarehouse);
        if (!state?.metadata?.downloadURL || !warehouse) return;
        
        updateSyncState(key, 'downloading', 'Đang tải xuống...', state.metadata);
        
        try {
            const response = await fetch(state.metadata.downloadURL);
            
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
            
            } else if (PASTE_MAPPING[key]) {
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
                const metaToSave = { 
                    ...state.metadata, 
                    timestamp: state.metadata.timestamp || Date.now(),
                    rowCount: processedCount 
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
};