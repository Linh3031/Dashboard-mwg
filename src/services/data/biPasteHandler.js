// src/services/data/biPasteHandler.js
// Xử lý dữ liệu "Doanh thu BI" dán tay (thay cho Excel bị công ty chặn xuất). Dùng LẠI đúng cache
// offline + baseKey Cloud 'saved_doanhthu_bi' của luồng Excel cũ (fileHandler.js) để 2 luồng không
// bao giờ lệch nhau, chỉ khác cách lấy dữ liệu đầu vào (text dán thay vì file .xlsx).
import { get } from 'svelte/store';
import { danhSachNhanVien, currentUser } from '../../stores.js';
import { parseDoanhThuBiPasted } from '../processing/parsers/biPaste.parser.js';
import { storage, storageService } from '../storage.service.js';
import { datasyncService } from '../datasync.service.js';
import { analyticsService } from '../analytics.service.js';
import { FILE_MAPPING } from './constants.js';
import { updateSyncState } from './syncHandler.js';

const BASE_KEY = 'saved_doanhthu_bi';

export async function processDoanhThuBiPaste(rawText) {
    const mapping = FILE_MAPPING[BASE_KEY];

    try {
        const { results, unresolvedMaKho, totalMismatch } = parseDoanhThuBiPasted(rawText);

        if (results.length === 0) {
            const msg = unresolvedMaKho.length > 0
                ? `Không khớp được mã kho nào với DSNV: ${unresolvedMaKho.join(', ')}`
                : `Không tìm thấy dòng siêu thị hợp lệ. Kiểm tra lại dữ liệu đã dán.`;
            return { success: false, message: msg };
        }

        // [MỚI] Gộp trên dữ liệu GỐC trong cache offline làm nền — KHÔNG dùng store đang hiển thị,
        // để không xoá mất dữ liệu của các kho khác (giống hệt cách fileHandler.js xử lý Excel).
        const uploadedKhoSet = new Set(results.map(r => r.maKho));
        const existingFull = (await storage.getItem(BASE_KEY)) || [];
        const mergedFull = [...existingFull.filter(item => !uploadedKhoSet.has(item.maKho)), ...results];
        await storage.setItem(BASE_KEY, mergedFull);

        const dsnv = get(danhSachNhanVien) || [];
        const allowedWarehouses = dsnv.length > 0
            ? [...new Set(dsnv.map(e => String(e.maKho || '').trim()).filter(Boolean))]
            : null;
        mapping.store.set(allowedWarehouses ? mergedFull.filter(item => allowedWarehouses.includes(String(item.maKho || '').trim())) : mergedFull);

        // Tự điền Target vào Mục tiêu Lũy kế cho từng kho có target > 0 (vẫn sửa tay được sau đó).
        const goalUpdates = results.filter(r => r.targetQD > 0);
        if (goalUpdates.length > 0) {
            await Promise.all(goalUpdates.map(async (r) => {
                try {
                    const existing = await datasyncService.loadGoalSettings(r.maKho);
                    const mergedLuyke = { ...(existing.luyke || {}), doanhThuQD: r.targetQD };
                    await datasyncService.saveGoalSettings(r.maKho, 'luyke', mergedLuyke);
                } catch (e) { console.error('Lỗi tự động cập nhật Target Lũy kế từ Doanh thu BI (dán):', e); }
            }));
        }

        // Lưu Cloud: 1 blob text dùng chung cho mọi kho vừa trích xuất, đánh dấu fileType để
        // syncHandler.js biết đường đọc lại bằng parser dán thay vì XLSX khi máy khác tải về.
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
                    fileName: 'du_lieu_dan_bi.txt',
                    fileType: 'text_bi_paste',
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

            const successMsg = `✓ Đã trích xuất ${results.length} siêu thị - ${validWarehouses.length} kho` + (cloudWarning ? ` — ⚠️ ${cloudWarning}` : '');
            updateSyncState(BASE_KEY, 'synced', successMsg, { updatedAt: new Date(now), timestamp: now });
        } catch (cloudErr) {
            console.error('Lỗi đồng bộ Cloud (Doanh thu BI dán):', cloudErr);
            cloudWarning = `Lưu local OK nhưng lỗi Cloud: ${cloudErr.message}`;
            updateSyncState(BASE_KEY, 'error', cloudWarning);
        }

        analyticsService.trackAction();

        return {
            success: true,
            count: results.length,
            khoList: validWarehouses,
            unresolvedMaKho,
            totalMismatch,
            warning: cloudWarning
        };
    } catch (err) {
        return { success: false, message: `Lỗi: ${err.message}` };
    }
}
