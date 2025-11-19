/* global XLSX */
import { get } from 'svelte/store';
import { 
    danhSachNhanVien,
    rawGioCongData,
    ycxData,
    thuongNongData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc,
    thuongERPData,
    thuongERPDataThangTruoc,
    competitionData,
    pastedThiDuaReportData,
    realtimeYCXData 
} from '../stores.js';
import { dataProcessing } from './dataProcessing.js';
import { storage } from '../modules/storage.js';

const LOCAL_DSNV_FILENAME_KEY = '_localDsnvFilename';
const RAW_PASTE_THIDUANV_KEY = 'raw_paste_thiduanv';

// === BƯỚC 1: TẠO BẢNG ÁNH XẠ (MAPPING) ===
const FILE_MAPPING = {
    'saved_danhsachnv': { store: danhSachNhanVien, normalizeType: 'danhsachnv' },
    'saved_giocong': { store: rawGioCongData, normalizeType: 'giocong' },
    'saved_ycx': { store: ycxData, normalizeType: 'ycx' },
    'saved_thuongnong': { store: thuongNongData, normalizeType: 'thuongnong' },
    'saved_ycx_thangtruoc': { store: ycxDataThangTruoc, normalizeType: 'ycx' },
    'saved_thuongnong_thangtruoc': { store: thuongNongDataThangTruoc, normalizeType: 'thuongnong' }
};

const PASTE_MAPPING = {
    'daily_paste_luyke': { 
        processFunc: dataProcessing.parseCompetitionDataFromLuyKe, 
        store: competitionData 
    },
    'daily_paste_thuongerp': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPData 
    },
    'saved_thuongerp_thangtruoc': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPDataThangTruoc 
    },
    'daily_paste_thiduanv': { 
        processFunc: dataProcessing.processThiDuaNhanVienData, 
        store: pastedThiDuaReportData,
        isThiDuaNV: true 
    }
};

/**
 * Đọc file Excel/CSV bằng FileReader và XLSX.
 */
async function _handleFileRead(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided."));
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
                resolve(workbook);
            } catch (err) { reject(err); }
        };
        reader.onerror = (err) => reject(new Error("Could not read the file: " + err));
        reader.readAsArrayBuffer(file);
    });
}

// === BƯỚC 2: TẠO HÀM XỬ LÝ FILE CHUNG ===
export async function handleFileChange(file, saveKey) {
    const mapping = FILE_MAPPING[saveKey];
    if (!mapping) {
        return { success: false, message: `❌ Lỗi: Không tìm thấy mapping cho key ${saveKey}` };
    }

    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
        
        if (success) {
            mapping.store.set(normalizedData);
            try {
                await storage.setItem(saveKey, normalizedData);
                console.log(`[dataService] Đã lưu ${saveKey} vào IndexedDB.`);
                if (saveKey === 'saved_danhsachnv') {
                    localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
                }
            } catch (err) {
                console.error(`Lỗi lưu ${saveKey} vào IndexedDB:`, err);
            }

            let message = `✅ Tải thành công ${normalizedData.length} dòng.`;
            if (saveKey === 'saved_danhsachnv') {
                message = `✅ Tải thành công ${normalizedData.length} nhân viên.`;
            }
            return { success: true, count: normalizedData.length, message: message };
        } else {
            const errorMessage = `Lỗi: File thiếu cột: ${missingColumns.join(', ')}`;
            return { success: false, message: `❌ ${errorMessage}` };
        }
    } catch (err) {
        console.error(`Lỗi xử lý file ${saveKey}:`, err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

// === BƯỚC 3: TẠO HÀM XỬ LÝ PASTE CHUNG ===
export function handlePasteChange(pastedText, saveKeyPaste, saveKeyRaw, saveKeyProcessed) {
    const primaryKey = saveKeyProcessed || saveKeyPaste;
    const mapping = PASTE_MAPPING[primaryKey];
    
    if (!mapping) {
        return { success: false, message: `❌ Lỗi: Không tìm thấy mapping cho key ${primaryKey}` };
    }

    try {
        let processedData;
        let message = "";

        if (mapping.isThiDuaNV) {
            const parsedData = dataProcessing.parsePastedThiDuaTableData(pastedText);
            if (!parsedData.success) {
                throw new Error(parsedData.error || "Lỗi phân tích cú pháp bảng.");
            }
            dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
            const $competitionData = get(competitionData);
            processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
            mapping.store.set(processedData);
            
            localStorage.setItem(saveKeyRaw, pastedText);
            localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
            message = `✅ Đã xử lý ${processedData.length} nhân viên.`;

        } else if (mapping.processFunc) {
            processedData = mapping.processFunc(pastedText);
            mapping.store.set(processedData);
            localStorage.setItem(saveKeyPaste, pastedText);

            if (primaryKey === 'daily_paste_luyke') {
                message = `✅ Đã xử lý. Tìm thấy ${processedData.length} CT thi đua.`;
            } else {
                message = `✅ Đã xử lý ${processedData.length} nhân viên.`;
            }
        }
        
        return { success: true, message: message };
    } catch (err) {
        console.error(`Lỗi xử lý dán cho ${primaryKey}:`, err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

// === BƯỚC 4: HÀM TẢI CACHE ===
export async function loadAllFromCache() {
    console.log("[dataService] Bắt đầu tải dữ liệu từ cache...");
    try {
        await storage.openDB();
    } catch (err) {
        console.error("Lỗi nghiêm trọng: Không thể mở IndexedDB.", err);
    }

    try {
        for (const [saveKey, mapping] of Object.entries(FILE_MAPPING)) {
            const data = await storage.getItem(saveKey);
            if (data && data.length > 0) {
                mapping.store.set(data);
                console.log(`[Cache] Đã tải ${data.length} dòng cho ${saveKey}.`);
            }
        }
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu file từ IndexedDB:", err);
    }

    try {
        const luykeText = localStorage.getItem('daily_paste_luyke');
        if (luykeText) {
            dataProcessing.parseLuyKePastedData(luykeText);
            dataProcessing.parseCompetitionDataFromLuyKe(luykeText);
        }

        const thiduaProcessed = localStorage.getItem('daily_paste_thiduanv');
        if (thiduaProcessed) {
            pastedThiDuaReportData.set(JSON.parse(thiduaProcessed));
        }

        const erpText = localStorage.getItem('daily_paste_thuongerp');
        if (erpText) {
            thuongERPData.set(dataProcessing.processThuongERP(erpText));
        }
        const erpTTText = localStorage.getItem('saved_thuongerp_thangtruoc');
        if (erpTTText) {
            thuongERPDataThangTruoc.set(dataProcessing.processThuongERP(erpTTText));
        }

        console.log("[dataService] Đã tải xong dữ liệu từ cache.");
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu paste từ LocalStorage:", err);
    }
}

export async function handleTemplateDownload() {
    console.warn("handleTemplateDownload: Chưa kết nối Firebase Storage.");
    alert("Chức năng tải file mẫu sẽ được kết nối sau.");
}

/**
 * Xử lý tải file Realtime (Mới cho Svelte)
 * Quy trình: Đọc file -> Normalize -> Update Store
 * Đã loại bỏ alert() để không hiện popup.
 */
export async function handleRealtimeFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log("[dataService] Đang xử lý file Realtime:", file.name);

    try {
        // 1. Đọc file Excel thành JSON thô
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });

        // 2. Chuẩn hóa dữ liệu
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');

        if (success) {
            // 3. Cập nhật vào Svelte Store -> UI sẽ tự động render ngay lập tức
            realtimeYCXData.set(normalizedData);
            console.log(`[dataService] Đã cập nhật realtimeYCXData: ${normalizedData.length} dòng.`);
        } else {
            console.error(`[dataService] File lỗi! Thiếu cột: ${missingColumns.join(', ')}`);
        }
    } catch (e) {
        console.error("Lỗi xử lý file Realtime:", e);
    } finally {
        // Reset input để chọn lại cùng file được
        event.target.value = '';
    }
}