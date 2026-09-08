/* global XLSX */
import { get } from 'svelte/store';
import { fileSyncState, selectedWarehouse, warehouseList, currentUser, competitionData, pastedThiDuaReportData, thuongERPData, thuongERPDataThangTruoc, danhSachNhanVien } from '../../stores.js';
import { datasyncService, MULTI_MODE_KEYS } from '../datasync.service.js';
import { storage } from '../storage.service.js';
import { dataProcessing } from '../dataProcessing.js';
import { resolveThiDuaStRows, resolveDoanhThuBiRows } from '../processing/logic/biExcel.processor.js';
import { parseDoanhThuBiPasted } from '../processing/parsers/biPaste.parser.js';
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

// [FIX] "Doanh thu BI" / "Giờ công" / "Thưởng nóng" có thể không có cột mã kho trong file gốc
// (kho được suy ra từ kho đang chọn lúc upload). Khi tải lại file này ở máy khác, phải bù mã kho
// giống hệt fileHandler.js lúc upload, nếu không mọi dòng sẽ bị lọc mất vì không khớp mã kho nào.
function applyWarehouseFallback(normalizedData, baseKey, wh) {
    if (!wh || !['saved_giocong', 'saved_thuongnong', 'saved_doanhthu_bi'].includes(baseKey)) {
        return normalizedData;
    }
    return normalizedData.map(row => {
        const maKhoRow = String(row.maKhoTao || row.maKho || row['Mã kho tạo'] || row['Kho tạo'] || row.MA_KHO_TAO || row.MA_KHO || '').trim();
        return maKhoRow ? row : { ...row, maKho: wh };
    });
}

// [FIX] "Thi đua NV (Excel)" không có cột mã kho và được lưu ở dạng gom nhóm theo mã NV
// ({ maNV, competitions, maKho }), không phải dữ liệu theo dòng thô. Tải về phải gom nhóm lại
// y hệt logic upload ở fileHandler.js (dòng ~93-127) để đúng hình dạng dữ liệu.
function groupThiDuaNVExcelRows(normalizedData, wh) {
    const grouped = {};
    const uniquePrograms = new Set();

    normalizedData.forEach(row => {
        const progName = String(row.chuongTrinh || '').trim();
        if (progName) uniquePrograms.add(progName);
    });

    const currentDSNV = get(danhSachNhanVien) || [];
    const validEmpCodes = new Set(currentDSNV.map(e => String(e.ma_nv || e.maNV).trim()));

    normalizedData.forEach(row => {
        const empCode = String(row.maNV || '').trim();
        if (!empCode) return;
        if (validEmpCodes.size > 0 && !validEmpCodes.has(empCode)) return;

        if (!grouped[empCode]) grouped[empCode] = { maNV: empCode, competitions: [] };

        const progName = String(row.chuongTrinh || '').trim();
        grouped[empCode].competitions.push({
            tenGoc: progName,
            doanhThu: parseFloat(row.doanhThu) || 0,
            soLuong: parseFloat(row.soLuong) || 0,
            dtQuyDoi: parseFloat(row.dtQuyDoi) || 0,
            hang: parseInt(row.hangVung) || 0
        });
    });

    if (dataProcessing.updateCompetitionNameMappings) {
        dataProcessing.updateCompetitionNameMappings(Array.from(uniquePrograms));
    }

    return Object.values(grouped).map(emp => ({ ...emp, maKho: wh }));
}

function getStateKey(key, wh) {
    if (['daily_paste_luyke', 'daily_paste_thiduanv', 'saved_giocong', 'saved_thuongnong', 'saved_thiduanv_excel', 'saved_doanhthu_bi'].includes(key) && wh !== 'ALL' && !wh.startsWith('CLUSTER_')) {
        return `${key}_${wh}`;
    }
    if (['cluster_paste_luyke', 'cluster_paste_comp'].includes(key) && wh.startsWith('CLUSTER_')) {
        const clusterCode = wh.replace('CLUSTER_', '');
        return `${key}_${clusterCode}`;
    }
    if (key === 'cluster_summary_data' && wh.startsWith('CLUSTER_')) {
        return `cluster_summary_data_${wh}`; 
    }
    return key;
}

export const syncHandler = {
    async syncDownFromCloud(warehouse) {
        if (!warehouse) return { success: false, message: "Chưa chọn kho." };

        const isBatchMode = get(selectedWarehouse) === 'ALL';
        let targetKeys = [];
        
        if (isBatchMode) {
            if (warehouse === 'ALL') {
                targetKeys = [...Object.keys(FILE_MAPPING).filter(k => !['saved_giocong', 'saved_thuongnong'].includes(k)), 'daily_paste_thuongerp', 'saved_thuongerp_thangtruoc', 'cluster_summary_data'];
            } else if (warehouse.startsWith('CLUSTER_')) {
                targetKeys = ['cluster_summary_data'];
            } else {
                targetKeys = ['daily_paste_luyke', 'daily_paste_thiduanv', 'saved_giocong', 'saved_thuongnong', 'saved_ycx', 'saved_ycx_thangtruoc', 'saved_ycx_cungkynam', 'saved_thiduanv_excel', 'saved_doanhthu_bi'];
            }
        } else {
            targetKeys = [...Object.keys(FILE_MAPPING), ...Object.keys(PASTE_MAPPING)];
        }

        targetKeys = targetKeys.filter(k => {
            const map = FILE_MAPPING[k] || PASTE_MAPPING[k];
            return map && !map.localOnly;
        });

        targetKeys.forEach(key => {
            let stateKey = getStateKey(key, warehouse);
            updateSyncState(stateKey, 'checking', 'Đang so sánh dữ liệu...', null);
        });

        try {
            let cloudData = null;
            if (warehouse === 'ALL') {
               const validWarehouses = get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_'));
               if(validWarehouses.length > 0) {
                   cloudData = await datasyncService.loadWarehouseData(validWarehouses[0]);
               }
            } else {
               cloudData = await datasyncService.loadWarehouseData(warehouse);
            }

            const userEmail = get(currentUser)?.email;

            const processKey = async (key) => {
                const mapping = FILE_MAPPING[key] || PASTE_MAPPING[key];
                let stateKey = getStateKey(key, warehouse);
                let baseKey = key;

                const localMetaStr = localStorage.getItem(`_meta_${warehouse}_${baseKey}`);
                let localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
                
                const cloudMeta = cloudData ? cloudData[baseKey] : null;

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

                const timeAgo = formatTimeAgo(cloudMeta.updatedAt);
                const isMyUpload = cloudMeta.updatedBy === userEmail;

                const cloudTs = getMetaTimestamp(cloudMeta, 'CLOUD');
                const localTs = getMetaTimestamp(localMeta, 'LOCAL');
                const isNewer = cloudTs > (localTs + 2000); 

                const currentStoreData = get(mapping.store);
                const isStoreEmpty = !currentStoreData || currentStoreData.length === 0;

                if (isNewer && cloudMeta.isDeleted) {
                    updateSyncState(stateKey, 'downloading', 'Đang tự động tải về...', cloudMeta);
                    await syncHandler.downloadFileFromCloud(stateKey);
                } else if (isNewer) {
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
            };

            for (const key of targetKeys) {
                try {
                    await processKey(key);
                } catch (keyError) {
                    console.error(`[SyncHandler] Lỗi kiểm tra đồng bộ cho "${key}":`, keyError);
                    updateSyncState(getStateKey(key, warehouse), 'error', `Lỗi kiểm tra: ${keyError.message}`, null);
                }
            }
            return { success: true, message: `Đã kiểm tra dữ liệu.` };

        } catch (error) {
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
            const sortedKeys = [...Object.keys(PASTE_MAPPING), ...Object.keys(FILE_MAPPING)].sort((a, b) => b.length - a.length);
            for (const pKey of sortedKeys) {
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
                let allDataForStorage = [];
                let allDataForStore = [];

                // [FIX] Chỉ loại "update thêm" (YCX lũy kế/tháng trước/cùng kỳ năm — xem MULTI_MODE_KEYS)
                // mới cần chụp lại dữ liệu đang có để so sánh: với loại này, tải về ít hơn máy đang có
                // là bất thường (nghi Cloud đang thiếu dữ liệu), khác với loại "ghi đè" vốn ít hơn là chuyện thường.
                const isAccumulateType = MULTI_MODE_KEYS.includes(baseKey);
                const previousLocalData = isAccumulateType ? (get(mapping.store) || []) : null;
                const previousStorageData = isAccumulateType ? (await storage.getItem(stateKey)) : null;

                let userAllowedWarehouses = [];
                const dsnvData = get(danhSachNhanVien);
                if (dsnvData && dsnvData.length > 0) {
                     const dsKho = [...new Set(dsnvData.map(e => e.maKho || e.storeId).filter(Boolean))];
                     userAllowedWarehouses = dsKho.map(k => String(k).trim());
                } else {
                     userAllowedWarehouses = get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_')).map(k => String(k).trim());
                }

                let filesToDownload = [];
                
                if (get(selectedWarehouse) === 'ALL') {
                     for(let wh of userAllowedWarehouses) {
                         const singleMetaStr = localStorage.getItem(`_meta_${wh}_${baseKey}`);
                         if(singleMetaStr) {
                             try {
                                 const sm = JSON.parse(singleMetaStr);
                                 if (sm.files && Array.isArray(sm.files)) {
                                     filesToDownload.push(...sm.files.filter(f => !f.isDeleted && f.downloadURL).map(f => ({ meta: f, wh })));
                                 } else if (!sm.isDeleted && sm.downloadURL) {
                                     filesToDownload.push({ meta: sm, wh });
                                 }
                             } catch(e){}
                         }
                     }
                     if(filesToDownload.length === 0 && state.metadata.files) {
                         filesToDownload = state.metadata.files.map(f => ({ meta: f, wh: null }));
                     } else if (filesToDownload.length === 0 && state.metadata.downloadURL) {
                         filesToDownload = [{ meta: state.metadata, wh: null }];
                     }
                } else if (state.metadata.isMulti && Array.isArray(state.metadata.files)) {
                     filesToDownload = state.metadata.files.map(f => ({ meta: f, wh: warehouse }));
                } else if (state.metadata.downloadURL) {
                     filesToDownload = [{ meta: state.metadata, wh: warehouse }];
                }

                // [FIX] Hiện tiến độ theo từng file/tháng thay vì 1 thanh chờ chung không rõ đang tới đâu.
                const totalFilesToDownload = filesToDownload.length;
                const commitToStore = (partialStore) => {
                    if ((baseKey === 'saved_thiduanv_excel' || baseKey === 'saved_doanhthu_bi') && get(selectedWarehouse) !== 'ALL') {
                        mapping.store.update(curr => {
                            const existing = curr || [];
                            const filtered = existing.filter(item => String(item.maKho) !== String(warehouse));
                            return [...filtered, ...partialStore];
                        });
                    } else {
                        mapping.store.set(partialStore);
                    }
                };

                for (const [fileIdx, { meta: fileMeta, wh: fileWh }] of filesToDownload.entries()) {
                    if (!fileMeta.downloadURL) continue;

                    const cacheBusterUrl = `${fileMeta.downloadURL}${fileMeta.downloadURL.includes('?') ? '&' : '?'}t=${Date.now()}`;

                    // [MỚI] Doanh thu BI dán tay lưu Cloud dưới dạng .txt (đánh dấu fileType) thay vì
                    // .xlsx — phải đọc lại bằng parser dán, không phải XLSX.read, nếu không sẽ lỗi.
                    let dataForStorage;
                    if (baseKey === 'saved_doanhthu_bi' && fileMeta.fileType === 'text_bi_paste') {
                        const response = await fetch(cacheBusterUrl);
                        const textContent = await response.text();
                        dataForStorage = parseDoanhThuBiPasted(textContent).results;
                    } else {
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

                    normalizedData = applyDataShield(rawData, normalizedData, baseKey);

                    // [FIX] Ưu tiên mã kho đã được ghi thẳng vào metadata lúc upload (assignedWarehouse) —
                    // đáng tin hơn suy luận từ ngữ cảnh tải về. Vẫn giữ fileWh làm phương án dự phòng
                    // cho các file đã upload từ trước khi có field này.
                    const effectiveWh = fileMeta.assignedWarehouse || fileWh;

                    if (baseKey === 'saved_thiduanv_excel') {
                        dataForStorage = groupThiDuaNVExcelRows(normalizedData, effectiveWh);
                    } else if (baseKey === 'saved_thidua_st_excel') {
                        // [FIX] File Thi đua ST không có cột mã kho — phải dò qua "Tên Kho" (DSNV)
                        // giống hệt lúc upload tay (fileHandler.js, dùng chung 1 hàm), nếu không mọi
                        // dòng sẽ bị loại vì maKho rỗng → hiện "0 dòng" dù tải file thành công.
                        dataForStorage = resolveThiDuaStRows(normalizedData).results;
                    } else if (baseKey === 'saved_doanhthu_bi') {
                        dataForStorage = resolveDoanhThuBiRows(normalizedData).results;
                    } else {
                        normalizedData = applyWarehouseFallback(normalizedData, baseKey, effectiveWh);
                        dataForStorage = normalizedData;
                        if (userAllowedWarehouses.length > 0) {
                             dataForStorage = normalizedData.filter(d => {
                                const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                                return userAllowedWarehouses.includes(whCode);
                             });
                        }
                    }
                    }
                    allDataForStorage = [...allDataForStorage, ...dataForStorage];

                    let dataForStore = dataForStorage;
                    if (get(selectedWarehouse) !== 'ALL') {
                         if (baseKey === 'saved_thiduanv_excel') {
                             dataForStore = dataForStorage.filter(d => String(d.maKho) === get(selectedWarehouse));
                         } else {
                             dataForStore = dataForStorage.filter(d => {
                                const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                                return whCode === get(selectedWarehouse);
                             });
                         }
                    }
                    allDataForStore = [...allDataForStore, ...dataForStore];

                    commitToStore(allDataForStore);
                    updateSyncState(
                        stateKey,
                        'downloading',
                        totalFilesToDownload > 1 ? `Đang tải xuống... (${fileIdx + 1}/${totalFilesToDownload})` : 'Đang tải xuống...',
                        { ...state.metadata, progress: { current: fileIdx + 1, total: totalFilesToDownload } }
                    );
                }

                if (state.metadata.deletedWarehouses && state.metadata.deletedWarehouses.length > 0) {
                    allDataForStorage = allDataForStorage.filter(d => {
                        const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                        return !state.metadata.deletedWarehouses.includes(whCode);
                    });
                    allDataForStore = allDataForStore.filter(d => {
                        const whCode = String(d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'] || d.MA_KHO_TAO || d.MA_KHO || '').trim();
                        return !state.metadata.deletedWarehouses.includes(whCode);
                    });
                }

                // [FIX] Loại "update thêm": nếu Cloud trả về ÍT dòng hơn máy đang có sẵn, đây là dấu
                // hiệu bất thường (lẽ ra chỉ tăng dần theo tháng) — hỏi lại trước khi ghi đè, và khôi
                // phục nguyên trạng máy nếu người dùng huỷ (kể cả phần đã cập nhật tạm lúc hiện tiến độ).
                if (isAccumulateType && previousLocalData && previousLocalData.length > 0 && allDataForStore.length < previousLocalData.length) {
                    const proceed = confirm(
                        `Dữ liệu tải về từ Cloud (${allDataForStore.length} dòng) đang ÍT HƠN dữ liệu máy này đang có (${previousLocalData.length} dòng).\n\n` +
                        `Có thể Cloud đang thiếu dữ liệu (lỗi đồng bộ trước đó). Ghi đè có thể làm mất dữ liệu đang có trên máy này.\n\n` +
                        `Bạn có chắc muốn ghi đè không?`
                    );
                    if (!proceed) {
                        commitToStore(previousLocalData);
                        if (previousStorageData !== null && previousStorageData !== undefined) {
                            await storage.setItem(stateKey, previousStorageData);
                        }
                        updateSyncState(
                            stateKey,
                            'update_available',
                            `Đã huỷ tải về vì Cloud đang ít dữ liệu hơn máy (${allDataForStore.length} so với ${previousLocalData.length} dòng đang có).`,
                            state.metadata
                        );
                        return { success: false, message: 'Đã huỷ vì dữ liệu Cloud ít hơn dữ liệu máy đang có.' };
                    }
                }

                await storage.setItem(stateKey, allDataForStorage);

                // [FIX] "Doanh thu BI"/"Thi đua NV (Excel)" gộp dữ liệu nhiều kho trong cùng 1 store
                // (xem fileHandler.js lúc upload). Ở chế độ 1 kho, chỉ thay dữ liệu của đúng kho đó,
                // tránh ghi đè mất dữ liệu các kho khác đã đồng bộ trước đó trong cùng store.
                commitToStore(allDataForStore);

                const savedTimestamp = getMetaTimestamp(state.metadata, 'SAVE_FILE');
                const metaToSave = { ...state.metadata, timestamp: savedTimestamp || Date.now() };
                
                localStorage.setItem(`_meta_${warehouse}_${baseKey}`, JSON.stringify(metaToSave));
                updateSyncState(stateKey, 'synced', `✓ Đã đồng bộ (${allDataForStore.length} dòng)`, metaToSave);

            } else {
                const response = await fetch(state.metadata.downloadURL);
                const textContent = await response.text();
                
                localStorage.setItem(stateKey, textContent);
                
                let processedCount = 0;
                const isBatchMode = get(selectedWarehouse) === 'ALL';
                
                if (mapping.isThiDuaNV) {
                    const parsedData = dataProcessing.parsePastedThiDuaTableData(textContent);
                    if (parsedData.success) {
                        dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
                        const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, get(competitionData));
                        processedCount = processedData?.length || 0;
                    }

                    if (isBatchMode) {
                        let combinedData = [];
                        const validWarehouses = get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_'));
                        for (let wh of validWarehouses) {
                            const txt = localStorage.getItem(`${baseKey}_${wh}`);
                            if (txt) {
                                const pd = dataProcessing.parsePastedThiDuaTableData(txt);
                                if (pd.success) {
                                    const pData = dataProcessing.processThiDuaNhanVienData(pd, get(competitionData));
                                    combinedData.push(...pData);
                                }
                            }
                        }
                        mapping.store.set(combinedData); 
                    } else {
                        if (parsedData.success) {
                            const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, get(competitionData));
                            mapping.store.set(processedData);
                        }
                    }
                } else if (mapping.processFunc) {
                    if (baseKey === 'daily_paste_luyke' || baseKey === 'cluster_paste_luyke') {
                         processedCount = dataProcessing.parseCompetitionDataFromLuyKe(textContent).length;
                    } else {
                         processedCount = mapping.processFunc(textContent)?.length || 0;
                    }
                    
                    if (isBatchMode) {
                        let combinedData = [];
                        let combinedText = '';
                        const validWarehouses = get(warehouseList).filter(w => w !== 'ALL' && !w.startsWith('CLUSTER_'));
                        for (let wh of validWarehouses) {
                            const txt = localStorage.getItem(`${baseKey}_${wh}`);
                            if (txt) {
                                const pData = mapping.processFunc(txt);
                                combinedData.push(...pData);
                                combinedText += txt + '\n';
                            }
                        }
                        mapping.store.set(combinedData);
                        if (baseKey === 'daily_paste_luyke' || baseKey === 'cluster_paste_luyke') {
                            dataProcessing.parseLuyKePastedData(combinedText);
                        }
                    } else {
                        const processedData = mapping.processFunc(textContent);
                        mapping.store.set(processedData);
                        if (baseKey === 'daily_paste_luyke' || baseKey === 'cluster_paste_luyke') {
                             dataProcessing.parseLuyKePastedData(textContent);
                        }
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