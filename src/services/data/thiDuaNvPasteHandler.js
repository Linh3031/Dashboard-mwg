// src/services/data/thiDuaNvPasteHandler.js
// Xử lý dữ liệu "Thi đua nhân viên" dán tay (thay Excel bị công ty chặn xuất). Mỗi ô dán ứng với
// đúng 1 kho — dùng LẠI cache offline + baseKey Cloud 'saved_thiduanv_excel' của luồng Excel cũ
// (fileHandler.js), chỉ khác cách lấy dữ liệu đầu vào (text dán thay vì file .xlsx).
import { get } from 'svelte/store';
import { currentUser } from '../../stores.js';
import { parseThiDuaNvPasted } from '../processing/parsers/thiduaNvPaste.parser.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { FILE_MAPPING } from './constants.js';
import { updateSyncState } from './syncHandler.js';

const BASE_KEY = 'saved_thiduanv_excel';

export async function processThiDuaNvPaste(rawText, targetKho) {
    const mapping = FILE_MAPPING[BASE_KEY];
    const stateKey = `${BASE_KEY}_${targetKho}`;

    const { results, unresolvedMaNV, wrongKhoEmployees, programCount, employeeCount, error } = parseThiDuaNvPasted(rawText, targetKho);

    if (error) {
        return { success: false, message: error };
    }
    if (results.length === 0) {
        const msg = wrongKhoEmployees.length > 0 || unresolvedMaNV.length > 0
            ? `Không có nhân viên nào khớp đúng kho ${targetKho}. Kiểm tra lại dữ liệu đã dán.`
            : `Không tìm thấy dòng nhân viên hợp lệ. Kiểm tra lại dữ liệu đã dán.`;
        return { success: false, message: msg, unresolvedMaNV, wrongKhoEmployees, programCount };
    }

    try {
        // Gộp trên dữ liệu GỐC trong cache offline — chỉ thay đúng phần của kho đang dán, giữ
        // nguyên dữ liệu các kho khác (đúng kiểu merge đã có ở fileHandler.js:275-281).
        const existingFull = (await storage.getItem(BASE_KEY)) || [];
        const mergedFull = [...existingFull.filter(item => String(item.maKho) !== String(targetKho)), ...results];
        await storage.setItem(BASE_KEY, mergedFull);
        mapping.store.set(mergedFull);

        let cloudWarning = null;
        try {
            const blob = new Blob([rawText], { type: 'text/plain' });
            const path = `warehouse_data/${targetKho}/${BASE_KEY}_${Date.now()}.txt`;
            const downloadUrl = await storageService.uploadFileToStorage(blob, path);

            const now = Date.now();
            const metadata = {
                downloadURL: downloadUrl,
                fileName: 'du_lieu_dan_thidua_nv.txt',
                fileType: 'text_thidua_nv_paste',
                rowCount: employeeCount,
                updatedAt: new Date(now),
                timestamp: now,
                updatedBy: get(currentUser)?.email || 'Tôi'
            };
            const ok = await datasyncService.saveWarehouseMetadata(targetKho, BASE_KEY, metadata);
            if (!ok) {
                cloudWarning = `Không có quyền ghi dữ liệu cho kho ${targetKho}.`;
            } else {
                if (typeof ok === 'object' && ok.warning) cloudWarning = ok.warning;
                localStorage.setItem(`_meta_${targetKho}_${BASE_KEY}`, JSON.stringify(metadata));
                const successMsg = `✓ Đã xử lý ${programCount} chương trình - ${employeeCount} nhân viên` + (cloudWarning ? ` — ⚠️ ${cloudWarning}` : '');
                updateSyncState(stateKey, 'synced', successMsg, { updatedAt: new Date(now), timestamp: now });
            }
        } catch (cloudErr) {
            console.error('Lỗi đồng bộ Cloud (Thi đua NV dán):', cloudErr);
            cloudWarning = `Lưu local OK nhưng lỗi Cloud: ${cloudErr.message}`;
            updateSyncState(stateKey, 'error', cloudWarning);
        }

        analyticsService.trackAction();

        return { success: true, programCount, employeeCount, unresolvedMaNV, wrongKhoEmployees, warning: cloudWarning };
    } catch (err) {
        return { success: false, message: `Lỗi: ${err.message}` };
    }
}
