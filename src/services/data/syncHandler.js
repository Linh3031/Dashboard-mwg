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

// [PHẪU THUẬT LOGIC]: BỘ KHIÊN BẢO VỆ ĐỐI XỨNG (Symmetry Shield)
function applyDataShield(rawData, normalizedData, baseKey) {
    if (!baseKey.includes('ycx')) return normalizedData;
    
    const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];
    const rawAddressCol = headers.find(h =>
        h.toLowerCase().includes('địa chỉ') ||
        h.toLowerCase().includes('dia chi') ||
        h.toLowerCase().includes('address')
    );

    return normalizedData.map((row, index) => {
        const rawRow = rawData[index];
        const diaChi = rawAddressCol ? String(rawRow[rawAddressCol] || '').trim() : row.diaChi;
        const maKhoGoc = rawRow['Mã kho tạo'] || rawRow['Kho tạo'] || rawRow['Mã Kho Tạo'] || rawRow['maKhoTao'] || row.maKhoTao || row.maKho || rawRow['MA_KHO_TAO'] || rawRow['MA_KHO'];
        return {
            ...row,
            diaChi: diaChi,
            maKhoTao: maKhoGoc ? String(maKhoGoc).trim() : row.maKhoTao,
            maKho: maKhoGoc ? String(maKhoGoc).trim() : row.maKho
        };
    });
}

export const syncHandler = {
    async syncDownFromCloud(warehouse) {
        if (!warehouse) return { success: false, message: "Chưa chọn kho." };
        console.group(`[SYNC-DEBUG] Bắt đầu kiểm tra luồng: ${warehouse}`);

        const isBatchMode = get(selectedWarehouse) === 'ALL';
        let targetKeys = [];
        
        if (isBatchMode) {
            if (warehouse === 'ALL') {
                targetKeys = [...Object.keys(FILE_MAPPING), 'daily_paste_thuongerp', 'saved_thuongerp_thangtruoc'];
            } else if (warehouse === 'CLUSTER_ALL') {
                targetKeys = ['cluster_summary_data'];
            } else {
                targetKeys = ['daily_paste_luyke', 'daily_paste_thiduanv'];
            }
        } else {
            targetKeys = [...Object.keys(FILE_MAPPING), ...Object.keys(PASTE_MAPPING)];
        }

        targetKeys = targetKeys.filter(k => {
            const map = FILE_MAPPING[k] || PASTE_MAPPING[k];
            return map && !map.localOnly;
        });

        targetKeys.forEach(key => {
            let stateKey = key;
            if (isBatchMode && warehouse !== 'ALL' && warehouse !== 'CLUSTER_ALL') {
                stateKey = `${key}_${warehouse}`;
            }
            updateSyncState(stateKey, 'checking', 'Đang so sánh dữ liệu...', null);
        });

        try {
            const cloudData = await datasyncService.loadWarehouseData(warehouse);
            const userEmail = get(currentUser)?.email;

            const processKey = async (key) => {
                const mapping = FILE_MAPPING[key] || PASTE_MAPPING[key];
                let stateKey = key;
                let baseKey = key;

                if (isBatchMode && warehouse !== 'ALL' && warehouse !== 'CLUSTER_ALL') {
                    stateKey = `${key}_${warehouse}`;
                }

                const cloudMeta = cloudData ? cloudData[baseKey] : null;
                const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${baseKey}`);
                const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};

                if (!cloudMeta) {
                    if (localMetaStr) {
                        updateSyncState(stateKey, 'synced', `✓ Đã đồng bộ`, localMeta);
                    } else {
                        fileSyncState.update(s => {
                            const newState = { ...s };
                            delete newState[stateKey]; 
                            return newState;
                        });
                    }
                    return;
                }

                console.groupCollapsed(`🔍 Kiểm tra: ${key} (State: ${stateKey})`);
                const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
                const isMyUpload = cloudMeta.updatedBy === userEmail;

                const cloudTs = getMetaTimestamp(cloudMeta, 'CLOUD');
                const localTs = getMetaTimestamp(localMeta, 'LOCAL');
                const isNewer = cloudTs > (localTs + 2000); 

                const currentStoreData = get(mapping.store);
                const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;

                if (isNewer) {
                    const msg = isMyUpload ? `Có bản mới từ bạn ${timeAgo}` : `Có cập nhật mới từ ${cloudMeta.updatedBy} ${timeAgo}`;
                    updateSyncState(stateKey, 'update_available', msg, cloudMeta);
                } else {
                    if (isStoreEmpty) {
                        updateSyncState(stateKey, 'downloading', 'Đang tự động tải về...', cloudMeta);
                        await syncHandler.downloadFileFromCloud(stateKey);
                    } else {
                        updateSyncState(stateKey, 'synced', `✓ Đã đồng bộ ${timeAgo}`, cloudMeta);
                    }
                }
                console.groupEnd();
            };

            for (const key of targetKeys) {
                await processKey(key);
            }

            console.log(`✅ Hoàn tất kiểm tra luồng ${warehouse}.`);
            console.groupEnd();
            return { success: true, message: `Đã kiểm tra dữ liệu.` };

        } catch (error) {
            console.error("Sync error:", error);
            console.groupEnd();
            return { success: false, message: "Lỗi kết nối Cloud: " + error.message };
        }
    },

    async downloadFileFromCloud(stateKey) {
        const state = get(fileSyncState)[stateKey];
        let warehouse = get(selectedWarehouse);
        
        let mapping = FILE_MAPPING[stateKey] || PASTE_MAPPING[stateKey];
        let baseKey = stateKey;
        let isPaste = !!PASTE_MAPPING[stateKey];

        if (!mapping) {
            for (const pKey of [...Object.keys(PASTE_MAPPING), ...Object.keys(FILE_MAPPING)]) {
                if (stateKey.startsWith(pKey + '_')) {
                    mapping = PASTE_MAPPING[pKey] || FILE_MAPPING[pKey];
                    baseKey = pKey;
                    isPaste = !!PASTE_MAPPING[pKey];
                    if (warehouse === 'ALL') {
                        warehouse = stateKey.replace(pKey + '_', '');
                    }
                    break;
                }
            }
        }

        if (!state?.metadata || !warehouse) {
            return { success: false, message: 'Missing metadata' };
        }

        if (state.metadata.isDeleted || (state.metadata.files?.length === 0 && !state.metadata.downloadURL)) {
            updateSyncState(stateKey, 'synced', `✓ Đã xóa trống dữ liệu`, state.metadata);
            mapping.store.set([]);
            await storage.setItem(stateKey, []);
            return { success: true };
        }
        
        updateSyncState(stateKey, 'downloading', 'Đang tải xuống...', state.metadata);
        
        try {
            if (!isPaste) {
                let allNormalizedData = [];

                if (state.metadata.isMulti && Array.isArray(state.metadata.files)) {
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
                        let { normalizedData } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
                        
                        // [PHẪU THUẬT LOGIC]: Kích hoạt Khiên bảo vệ trước khi gộp mảng
                        normalizedData = applyDataShield(rawData, normalizedData, baseKey);
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
                    let { normalizedData } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
                    
                    // [PHẪU THUẬT LOGIC]: Kích hoạt Khiên bảo vệ
                    allNormalizedData = applyDataShield(rawData, normalizedData, baseKey);
                } else {
                    throw new Error("Không có URL tải hợp lệ trong Metadata.");
                }

                if (state.metadata.deletedWarehouses && state.metadata.deletedWarehouses.length > 0) {
                    allNormalizedData = allNormalizedData.filter(d => {
                        const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                        return !state.metadata.deletedWarehouses.includes(whCode);
                    });
                }

                mapping.store.set(allNormalizedData);
                await storage.setItem(stateKey, allNormalizedData);
                
                const savedTimestamp = getMetaTimestamp(state.metadata, 'SAVE_FILE');
                const metaToSave = { ...state.metadata, timestamp: savedTimestamp || Date.now() };
                
                localStorage.setItem(`_meta_${warehouse}_${baseKey}`, JSON.stringify(metaToSave));
                updateSyncState(stateKey, 'synced', `✓ Đã đồng bộ`, metaToSave);
            
            } else if (isPaste) {
                const downloadUrl = state.metadata.downloadURL;
                const cacheBusterUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                
                const textContent = await (await fetch(cacheBusterUrl)).text();
                let processedCount = 0;
                
                if (mapping.isThiDuaNV) {
                    localStorage.setItem(stateKey + '_raw', textContent);
                    const parsedData = dataProcessing.parsePastedThiDuaTableData(textContent);
                    if (parsedData.success) {
                        dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
                        const $competitionData = get(competitionData);
                        const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
                        mapping.store.set(processedData);
                        processedCount = processedData.length;
                        localStorage.setItem(stateKey, JSON.stringify(processedData)); 
                    }
                } else if (mapping.processFunc) {
                    const processedData = mapping.processFunc(textContent);
                    mapping.store.set(processedData);
                    processedCount = processedData?.length || 0;
                    localStorage.setItem(stateKey, textContent);
                    
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
                
                localStorage.setItem(`_meta_${warehouse}_${baseKey}`, JSON.stringify(metaToSave));
                updateSyncState(stateKey, 'synced', `✓ Đã đồng bộ`, metaToSave);
                window.dispatchEvent(new CustomEvent('cloud-paste-loaded', { detail: { key: stateKey, text: textContent } }));
            }
            return { success: true };
        } catch (e) {
            console.error(e);
            updateSyncState(stateKey, 'error', 'Lỗi tải file: ' + e.message, state.metadata);
            return { success: false, message: e.message };
        }
    }
};