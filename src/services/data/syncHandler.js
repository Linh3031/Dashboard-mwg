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
    try {
        const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
        if (isNaN(date.getTime())) return ''; 
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "vừa xong";
    } catch (e) {
        return '';
    }
}

function getMetaTimestamp(meta, sourceName) {
    if (!meta) return 0;
    
    let ts = 0;
    if (typeof meta.timestamp === 'number') {
        ts = meta.timestamp;
    } else if (meta.updatedAt) {
        if (typeof meta.updatedAt.toMillis === 'function') {
            ts = meta.updatedAt.toMillis();
        } else if (typeof meta.updatedAt.seconds === 'number') {
            ts = meta.updatedAt.seconds * 1000;
        } else {
            const d = new Date(meta.updatedAt);
            if (!isNaN(d.getTime())) ts = d.getTime();
        }
    }
    return ts;
}

export const syncHandler = {
    async syncDownFromCloud(warehouse) {
        if (!warehouse) return { success: false, message: "Chưa chọn kho." };
        console.group(`[SYNC-DEBUG] Bắt đầu kiểm tra kho: ${warehouse}`);
        
        [...Object.keys(FILE_MAPPING), ...Object.keys(PASTE_MAPPING)].forEach(key => {
            const mapping = FILE_MAPPING[key] || PASTE_MAPPING[key];
            if (mapping && !mapping.localOnly) updateSyncState(key, 'checking', 'Đang so sánh dữ liệu...', null);
        });

        try {
            const cloudData = await datasyncService.loadWarehouseData(warehouse);
            if (!cloudData) {
                 console.groupEnd();
                 return { success: true, message: "Kho chưa có dữ liệu trên Cloud." };
            }
            const userEmail = get(currentUser)?.email;

            const processKey = async (key, mapping) => {
                const cloudMeta = cloudData[key];
                const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${key}`);
                const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
                
                if (!cloudMeta) return;

                console.groupCollapsed(`🔍 Kiểm tra: ${key}`);
                const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
                const isMyUpload = cloudMeta.updatedBy === userEmail;

                const cloudTs = getMetaTimestamp(cloudMeta, 'CLOUD');
                const localTs = getMetaTimestamp(localMeta, 'LOCAL');
                const isNewer = cloudTs > (localTs + 2000); 

                console.log(`Kết quả: Cloud ${isNewer ? '>' : '<='} Local. Chênh lệch: ${(cloudTs - localTs)/1000}s`);

                const currentStoreData = get(mapping.store);
                const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;

                if (isNewer) {
                    const msg = isMyUpload ? `Có bản mới từ bạn ${timeAgo}` : `Có cập nhật mới từ ${cloudMeta.updatedBy} ${timeAgo}`;
                    updateSyncState(key, 'update_available', msg, cloudMeta);
                    console.log("-> Trạng thái: UPDATE AVAILABLE");
                } else {
                    if (isStoreEmpty) {
                        console.log("-> Local rỗng -> Auto Download.");
                        updateSyncState(key, 'downloading', 'Đang tự động tải về...', cloudMeta);
                        await this.downloadFileFromCloud(key);
                    } else {
                        console.log("-> Đã đồng bộ (Local mới hơn hoặc bằng).");
                        updateSyncState(key, 'synced', `✓ Đã đồng bộ ${timeAgo}`, cloudMeta);
                    }
                }
                console.groupEnd();
            };

            for (const [key, mapping] of Object.entries(FILE_MAPPING)) {
                if (mapping.localOnly) continue;
                await processKey(key, mapping);
            }
            for (const [key, mapping] of Object.entries(PASTE_MAPPING)) {
                await processKey(key, mapping);
            }

            console.log("✅ Hoàn tất kiểm tra đồng bộ.");
            console.groupEnd();
            return { success: true, message: `Đã kiểm tra dữ liệu kho ${warehouse}.` };

        } catch (error) {
            console.error("Sync error:", error);
            console.groupEnd();
            return { success: false, message: "Lỗi kết nối Cloud: " + error.message };
        }
    },

    async downloadFileFromCloud(key) {
        const state = get(fileSyncState)[key];
        const warehouse = get(selectedWarehouse);
        
        if (!state?.metadata || !warehouse) {
            console.error(`[Download] Không có metadata cho ${key}`);
            return;
        }
        
        updateSyncState(key, 'downloading', 'Đang tải xuống...', state.metadata);
        
        try {
            // --- 🚨 [GENESIS PREFIX ROUTING CHO SYNC] 🚨 ---
            let mapping = FILE_MAPPING[key] || PASTE_MAPPING[key];
            let baseKey = key;
            let isPaste = !!PASTE_MAPPING[key];

            if (!mapping) {
                for (const pKey of Object.keys(PASTE_MAPPING)) {
                    if (key.startsWith(pKey + '_')) {
                        mapping = PASTE_MAPPING[pKey];
                        baseKey = pKey;
                        isPaste = true;
                        break;
                    }
                }
            }
            // ----------------------------------------------

            if (!isPaste) {
                let allNormalizedData = [];

                if (state.metadata.isMulti && Array.isArray(state.metadata.files)) {
                    console.log(`[Download] Kích hoạt chế độ tải MẢNG cho ${key}. Tổng số file: ${state.metadata.files.length}`);
                    
                    for (const fileMeta of state.metadata.files) {
                        if (!fileMeta.downloadURL) continue;
                        
                        const cacheBusterUrl = `${fileMeta.downloadURL}${fileMeta.downloadURL.includes('?') ? '&' : '?'}t=${Date.now()}`;
                        const response = await fetch(cacheBusterUrl);
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
                        const { normalizedData } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
                        allNormalizedData = [...allNormalizedData, ...normalizedData];
                    }
                } 
                else if (state.metadata.downloadURL) {
                    const cacheBusterUrl = `${state.metadata.downloadURL}${state.metadata.downloadURL.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    const response = await fetch(cacheBusterUrl);
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
                    const { normalizedData } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
                    allNormalizedData = normalizedData;
                } else {
                    throw new Error("Không có URL tải hợp lệ trong Metadata.");
                }

                mapping.store.set(allNormalizedData);
                await storage.setItem(key, allNormalizedData);
                
                const savedTimestamp = getMetaTimestamp(state.metadata, 'SAVE_FILE');
                const metaToSave = { ...state.metadata, timestamp: savedTimestamp || Date.now() };
                
                localStorage.setItem(`_meta_${warehouse}_${key}`, JSON.stringify(metaToSave));
                updateSyncState(key, 'synced', `✓ Đã đồng bộ`, metaToSave);
            
            } else if (isPaste) {
                const downloadUrl = state.metadata.downloadURL;
                const cacheBusterUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                
                const textContent = await (await fetch(cacheBusterUrl)).text();
                let processedCount = 0;
                
                if (mapping.isThiDuaNV) {
                    // [FIX] Lưu text raw theo đúng Key của kho để khỏi bị đè
                    localStorage.setItem(key + '_raw', textContent);
                    const parsedData = dataProcessing.parsePastedThiDuaTableData(textContent);
                    if (parsedData.success) {
                        dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
                        const $competitionData = get(competitionData);
                        const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
                        mapping.store.set(processedData);
                        processedCount = processedData.length;
                        localStorage.setItem(key, JSON.stringify(processedData)); 
                    }
                } else if (mapping.processFunc) {
                    const processedData = mapping.processFunc(textContent);
                    mapping.store.set(processedData);
                    processedCount = processedData?.length || 0;
                    localStorage.setItem(key, textContent);
                    
                    if (baseKey === 'daily_paste_luyke' || baseKey === 'cluster_paste_luyke') {
                         const comps = dataProcessing.parseCompetitionDataFromLuyKe(textContent);
                         dataProcessing.parseLuyKePastedData(textContent);
                         processedCount = comps.length;
                    }
                }
                
                const savedTimestamp = getMetaTimestamp(state.metadata, 'SAVE_PASTE');
                const metaToSave = { 
                    ...state.metadata, 
                    timestamp: savedTimestamp || Date.now(),
                    rowCount: processedCount 
                };
                
                localStorage.setItem(`_meta_${warehouse}_${key}`, JSON.stringify(metaToSave));
                updateSyncState(key, 'synced', `✓ Đã đồng bộ`, metaToSave);
                window.dispatchEvent(new CustomEvent('cloud-paste-loaded', { detail: { key, text: textContent } }));
            }
            console.log(`[Download] Hoàn tất ${key}`);
            return { success: true };
        } catch (e) {
            console.error(e);
            updateSyncState(key, 'error', 'Lỗi tải file: ' + e.message, state.metadata);
            return { success: false, message: e.message };
        }
    }
};