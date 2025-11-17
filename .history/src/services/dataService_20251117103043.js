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
    pastedThiDuaReportData
} from '../stores.js';
import { dataProcessing } from './dataProcessing.js';
import { storage } from '../modules/storage.js'; // <-- BƯỚC 1: IMPORT STORAGE

// Lấy hằng số key từ dự án cũ
const LOCAL_DSNV_FILENAME_KEY = '_localDsnvFilename';
const RAW_PASTE_THIDUANV_KEY = 'raw_paste_thiduanv';


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

/**
 * BƯỚC 2: Thêm `saveKey` vào hàm xử lý file chung
 */
async function _processFile(file, fileType, stateKeyStore, saveKey) {
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        
        const normalizeType = fileType.replace('-thangtruoc', '');
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, normalizeType);

        if (success) {
            stateKeyStore.set(normalizedData);
            
            // --- BƯỚC 3: LƯU VÀO INDEXEDDB ---
            if (saveKey) {
                try {
                    await storage.setItem(saveKey, normalizedData);
                    console.log(`[dataService] Đã lưu ${fileType} vào IndexedDB (key: ${saveKey})`);
                } catch (err) {
                    console.error(`Lỗi lưu ${fileType} vào IndexedDB:`, err);
                    // Không làm gián đoạn, chỉ log lỗi
                }
            }
            // --- KẾT THÚC BƯỚC 3 ---

            return { success: true, count: normalizedData.length, message: `✅ Tải thành công ${normalizedData.length} dòng.` };
        } else {
            const errorMessage = `Lỗi: File thiếu cột: ${missingColumns.join(', ')}`;
            return { success: false, message: `❌ ${errorMessage}` };
        }
    } catch (err) {
        console.error(`Lỗi xử lý file ${fileType}:`, err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý file DSNV (Hàm riêng)
 * BƯỚC 2: Thêm `saveKey`
 */
export async function handleFileDSNV(file, saveKey) {
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');

        if (success) {
            danhSachNhanVien.set(normalizedData);
            
            // --- BƯỚC 3: LƯU VÀO INDEXEDDB (cho DSNV) ---
            if (saveKey) {
                try {
                    await storage.setItem(saveKey, normalizedData);
                    console.log(`[dataService] Đã lưu DSNV vào IndexedDB (key: ${saveKey})`);
                    // Lưu tên file vào localStorage (giống dự án cũ)
                    localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
                } catch (err) {
                    console.error(`Lỗi lưu DSNV vào IndexedDB:`, err);
                }
            }
            // --- KẾT THÚC BƯỚC 3 ---

            return { success: true, count: normalizedData.length, message: `✅ Tải thành công ${normalizedData.length} nhân viên.` };
        } else {
            const errorMessage = `Lỗi: File thiếu cột: ${missingColumns.join(', ')}`;
            return { success: false, message: `❌ ${errorMessage}` };
        }
    } catch (err) {
        console.error("Lỗi xử lý file DSNV:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * BƯỚC 2: Thêm `saveKey` cho các hàm export
 */
export async function handleFileGioCong(file, saveKey) {
    return _processFile(file, 'giocong', rawGioCongData, saveKey);
}

export async function handleFileYCX(file, saveKey) {
    return _processFile(file, 'ycx', ycxData, saveKey);
}

export async function handleFileThuongNong(file, saveKey) {
    return _processFile(file, 'thuongnong', thuongNongData, saveKey);
}

export async function handleFileYCXThangTruoc(file, saveKey) {
    return _processFile(file, 'ycx-thangtruoc', ycxDataThangTruoc, saveKey);
}

export async function handleFileThuongNongThangTruoc(file, saveKey) {
    return _processFile(file, 'thuongnong-thangtruoc', thuongNongDataThangTruoc, saveKey);
}

// === CẬP NHẬT HÀM XỬ LÝ PASTE ===

/**
 * Xử lý dán text Thưởng ERP.
 * BƯỚC 2: Thêm `saveKey`
 */
export function handleErpPaste(pastedText, saveKey) {
    try {
        const processedData = dataProcessing.processThuongERP(pastedText);
        thuongERPData.set(processedData);
        
        // BƯỚC 3: LƯU VÀO LOCALSTORAGE
        if (saveKey) {
            localStorage.setItem(saveKey, pastedText);
        }
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thưởng ERP:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý dán text Thưởng ERP Tháng Trước.
 * BƯỚC 2: Thêm `saveKey`
 */
export function handleErpThangTruocPaste(pastedText, saveKey) {
    try {
        const processedData = dataProcessing.processThuongERP(pastedText);
        thuongERPDataThangTruoc.set(processedData);

        // BƯỚC 3: LƯU VÀO LOCALSTORAGE
        if (saveKey) {
            localStorage.setItem(saveKey, pastedText);
        }
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thưởng ERP Tháng Trước:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý dán text Data Lũy Kế (BI).
 * BƯỚC 2: Thêm `saveKey`
 */
export function handleLuykePaste(pastedText, saveKey) {
    try {
        dataProcessing.parseLuyKePastedData(pastedText);
        const competitionResults = dataProcessing.parseCompetitionDataFromLuyKe(pastedText);
        
        // BƯỚC 3: LƯU VÀO LOCALSTORAGE
        if (saveKey) {
            localStorage.setItem(saveKey, pastedText);
        }
        
        return { success: true, message: `✅ Đã xử lý. Tìm thấy ${competitionResults.length} CT thi đua.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Data Lũy Kế:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý dán text Thi Đua Nhân Viên (BI).
 * BƯỚC 2: Thêm `saveKeyRaw` và `saveKeyProcessed`
 */
export function handleThiduaNVPaste(pastedText, saveKeyRaw, saveKeyProcessed) {
    try {
        const parsedData = dataProcessing.parsePastedThiDuaTableData(pastedText);
        if (!parsedData.success) {
            throw new Error(parsedData.error || "Lỗi phân tích cú pháp bảng.");
        }
        
        dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
        
        const $competitionData = get(competitionData);
        const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);

        pastedThiDuaReportData.set(processedData);
        
        // BƯỚC 3: LƯU VÀO LOCALSTORAGE (2 keys)
        if (saveKeyRaw) {
            localStorage.setItem(saveKeyRaw, pastedText);
        }
        if (saveKeyProcessed) {
            localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
        }
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thi Đua Nhân Viên:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}