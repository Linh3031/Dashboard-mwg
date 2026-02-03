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
        if (isNaN(date.getTime())) return ''; // Check ngày lỗi
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

// --- [DEBUG] HÀM CHUẨN HÓA THỜI GIAN CỰC MẠNH ---
function getMetaTimestamp(meta, sourceName) {
    if (!meta) return 0;
    
    let ts = 0;
    let method = 'none';

    // 1. Ưu tiên Timestamp số học (Do code mới thêm vào)
    if (typeof meta.timestamp === 'number') {
        ts = meta.timestamp;
        method = 'prop_timestamp';
    }
    // 2. Xử lý updatedAt
    else if (meta.updatedAt) {
        // Trường hợp A: Firestore Timestamp Object (có hàm toMillis)
        if (typeof meta.updatedAt.toMillis === 'function') {
            ts = meta.updatedAt.toMillis();
            method = 'firestore_fn';
        }
        // Trường hợp B: Object { seconds, nanoseconds } (JSON từ Firestore)
        else if (typeof meta.updatedAt.seconds === 'number') {
            ts = meta.updatedAt.seconds * 1000;
            method = 'firestore_json';
        }
        // Trường hợp C: Chuỗi ISO String hoặc Date Object
        else {
            const d = new Date(meta.updatedAt);
            if (!isNaN(d.getTime())) {
                ts = d.getTime();
                method = 'date_parse';
            }
        }
    }

    // Log debug để kiểm tra
    console.log(`[SYNC-DEBUG] ${sourceName} | Method: ${method} | TS: ${ts} | Time: ${new Date(ts).toLocaleString()}`);
    return ts;
}

export const syncHandler = {
    async syncDownFromCloud(warehouse) {
        if (!warehouse) return { success: false, message: "Chưa chọn kho." };
        console.group(`[SYNC-DEBUG] Bắt đầu kiểm tra kho: ${warehouse}`);
        
        // Set trạng thái "Checking"
        [...Object.keys(FILE_MAPPING), ...Object.keys(PASTE_MAPPING)].forEach(key => {
            const mapping = FILE_MAPPING[key] || PASTE_MAPPING[key];
            if (mapping && !mapping.localOnly) updateSyncState(key, 'checking', 'Đang so sánh dữ liệu...', null);
        });

        try {
            // Lấy dữ liệu mới nhất từ Cloud (Server)
            const cloudData = await datasyncService.loadWarehouseData(warehouse);
            if (!cloudData) {
                 console.groupEnd();
                 return { success: true, message: "Kho chưa có dữ liệu trên Cloud." };
            }
            const userEmail = get(currentUser)?.email;

            // Hàm xử lý chung cho cả File và Paste
            const processKey = async (key, mapping) => {
                const cloudMeta = cloudData[key];
                
                // Lấy Local Meta
                const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${key}`);
                const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
                
                if (!cloudMeta) return;

                console.groupCollapsed(`🔍 Kiểm tra: ${key}`);
                
                const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
                const isMyUpload = cloudMeta.updatedBy === userEmail;

                // --- SO SÁNH THỜI GIAN ---
                const cloudTs = getMetaTimestamp(cloudMeta, 'CLOUD');
                const localTs = getMetaTimestamp(localMeta, 'LOCAL');
                
                // Logic: Cloud phải lớn hơn Local ít nhất 2 giây (tránh sai số mạng)
                const isNewer = cloudTs > (localTs + 2000); 

                console.log(`Kết quả: Cloud ${isNewer ? '>' : '<='} Local. Chênh lệch: ${(cloudTs - localTs)/1000}s`);

                const currentStoreData = get(mapping.store);
                const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;

                if (isNewer) {
                    const msg = isMyUpload ? `Có bản mới từ bạn ${timeAgo}` : `Có cập nhật mới từ ${cloudMeta.updatedBy} ${timeAgo}`;
                    
                    // [TÙY CHỌN MẠNH TAY] Nếu Store đang trống HOẶC Local quá cũ, tự động tải luôn
                    // Hiện tại: Chỉ báo Update Available (để an toàn). 
                    // Nếu bạn muốn tự tải luôn khi F5, bỏ comment dòng dưới:
                    // if (isStoreEmpty) { 
                        updateSyncState(key, 'update_available', msg, cloudMeta);
                    // } else { ... logic auto download ... }
                    
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

            // Chạy vòng lặp kiểm tra
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
        
        // [FIX] Nếu không có metadata trong state (do bấm nút tải khi chưa check xong), 
        // thử lấy từ cloudData (cần load lại hoặc truyền vào). 
        // Ở đây ta giả định state đã có meta từ bước syncDownFromCloud
        if (!state?.metadata?.downloadURL || !warehouse) {
            console.error(`[Download] Không tìm thấy URL tải cho ${key}`);
            return;
        }
        
        updateSyncState(key, 'downloading', 'Đang tải xuống...', state.metadata);
        console.log(`[Download] Bắt đầu tải ${key} từ ${state.metadata.downloadURL}`);
        
        try {
            // Thêm timestamp vào URL để tránh Cache trình duyệt (Browser Caching)
            const cacheBusterUrl = `${state.metadata.downloadURL}${state.metadata.downloadURL.includes('?') ? '&' : '?'}t=${Date.now()}`;
            const response = await fetch(cacheBusterUrl);
            
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
                
                // [FIX] Lưu Timestamp chuẩn
                const savedTimestamp = getMetaTimestamp(state.metadata, 'SAVE_FILE');
                const metaToSave = { ...state.metadata, timestamp: savedTimestamp || Date.now() };
                
                localStorage.setItem(`_meta_${warehouse}_${key}`, JSON.stringify(metaToSave));
                updateSyncState(key, 'synced', `✓ Đã đồng bộ (${normalizedData.length} dòng)`, metaToSave);
            
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
                
                // [FIX] Lưu Timestamp chuẩn
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
            console.log(`[Download] Thành công ${key}`);
            return { success: true };
        } catch (e) {
            console.error(e);
            updateSyncState(key, 'error', 'Lỗi tải file: ' + e.message, state.metadata);
            return { success: false, message: e.message };
        }
    }
};