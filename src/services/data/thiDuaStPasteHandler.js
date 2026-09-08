// src/services/data/thiDuaStPasteHandler.js
// Xử lý dữ liệu "Thi đua siêu thị" dán tay (thay Excel bị công ty chặn xuất). Dùng LẠI cache
// offline + baseKey Cloud 'saved_thidua_st_excel' của luồng Excel cũ (fileHandler.js), chỉ khác
// cách lấy dữ liệu đầu vào (text dán thay vì file .xlsx). 1 lần dán có thể gồm nhiều kho.
import { get } from 'svelte/store';
import { danhSachNhanVien, currentUser } from '../../stores.js';
import { parseThiDuaStPasted } from '../processing/parsers/thiduaStPaste.parser.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { FILE_MAPPING } from './constants.js';
import { updateSyncState } from './syncHandler.js';

const BASE_KEY = 'saved_thidua_st_excel';

export async function processThiDuaStPaste(rawText) {
    const mapping = FILE_MAPPING[BASE_KEY];

    const { results, unresolvedTenKho, clusterTotals, programCount, error } = parseThiDuaStPasted(rawText);

    if (error) {
        return { success: false, message: error };
    }
    if (results.length === 0) {
        const msg = unresolvedTenKho.length > 0
            ? `Không khớp được siêu thị nào với DSNV: ${unresolvedTenKho.join(', ')}`
            : `Không tìm thấy dòng siêu thị hợp lệ. Kiểm tra lại dữ liệu đã dán.`;
        return { success: false, message: msg, unresolvedTenKho, programCount };
    }

    try {
        // Gộp trên dữ liệu GỐC trong cache offline — chỉ thay đúng phần của các kho vừa dán, giữ
        // nguyên dữ liệu các kho khác (đúng kiểu merge đã có ở fileHandler.js:257-274).
        const uploadedKhoSet = new Set(results.map(r => r.maKho));
        const existingFull = (await storage.getItem(BASE_KEY)) || [];
        const mergedFull = [...existingFull.filter(item => !uploadedKhoSet.has(item.maKho)), ...results];
        await storage.setItem(BASE_KEY, mergedFull);

        const dsnv = get(danhSachNhanVien) || [];
        const allowedWarehouses = dsnv.length > 0
            ? [...new Set(dsnv.map(e => String(e.maKho || '').trim()).filter(Boolean))]
            : null;
        mapping.store.set(allowedWarehouses ? mergedFull.filter(item => allowedWarehouses.includes(String(item.maKho || '').trim())) : mergedFull);

        const validWarehouses = Array.from(uploadedKhoSet);
        let cloudWarning = null;
        try {
            const blob = new Blob([rawText], { type: 'text/plain' });
            const primaryWh = validWarehouses[0];
            const path = `warehouse_data/${primaryWh}/${BASE_KEY}_${Date.now()}.txt`;
            const downloadUrl = await storageService.uploadFileToStorage(blob, path);

            const now = Date.now();
            const rowCountByWh = {};
            results.forEach(r => { rowCountByWh[r.maKho] = (rowCountByWh[r.maKho] || 0) + 1; });

            for (const wh of validWarehouses) {
                const metadata = {
                    downloadURL: downloadUrl,
                    fileName: 'du_lieu_dan_thidua_st.txt',
                    fileType: 'text_thidua_st_paste',
                    rowCount: rowCountByWh[wh] || 0,
                    updatedAt: new Date(now),
                    timestamp: now,
                    updatedBy: get(currentUser)?.email || 'Tôi'
                };
                const ok = await datasyncService.saveWarehouseMetadata(wh, BASE_KEY, metadata);
                if (!ok) { cloudWarning = `Không có quyền ghi dữ liệu cho kho ${wh}.`; continue; }
                if (typeof ok === 'object' && ok.warning) cloudWarning = ok.warning;
                localStorage.setItem(`_meta_${wh}_${BASE_KEY}`, JSON.stringify(metadata));
            }

            const successMsg = `✓ Đã đồng bộ ${validWarehouses.length} kho - ${programCount} chương trình` + (cloudWarning ? ` — ⚠️ ${cloudWarning}` : '');
            updateSyncState(BASE_KEY, 'synced', successMsg, { updatedAt: new Date(now), timestamp: now });
        } catch (cloudErr) {
            console.error('Lỗi đồng bộ Cloud (Thi đua ST dán):', cloudErr);
            cloudWarning = `Lưu local OK nhưng lỗi Cloud: ${cloudErr.message}`;
            updateSyncState(BASE_KEY, 'error', cloudWarning);
        }

        analyticsService.trackAction();

        return { success: true, khoList: validWarehouses, programCount, unresolvedTenKho, clusterTotals, warning: cloudWarning };
    } catch (err) {
        return { success: false, message: `Lỗi: ${err.message}` };
    }
}
