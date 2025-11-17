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
import { storage } from '../modules/storage.js'; // Import storage

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
 * Hàm xử lý file chung, được tái sử dụng.
 */
async function _processFile(file, fileType, stateKeyStore, saveKey) {
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        
        const normalizeType = fileType.replace('-thangtruoc', '');
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, normalizeType);

        if (success) {
            stateKeyStore.set(normalizedData);
            
            if (saveKey) {
                try {
                    await storage.setItem(saveKey, normalizedData);
                    console.log(`[dataService] Đã lưu ${fileType} vào IndexedDB (key: ${saveKey})`);
                } catch (err) {
                    console.error(`Lỗi lưu ${fileType} vào IndexedDB:`, err);
                }
            }

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
 */
export async function handleFileDSNV(file, saveKey) {
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');

        if (success) {
            danhSachNhanVien.set(normalizedData);
            
            if (saveKey) {
                try {
                    await storage.setItem(saveKey, normalizedData);
                    console.log(`[dataService] Đã lưu DSNV vào IndexedDB (key: ${saveKey})`);
                    localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
                } catch (err) {
                    console.error(`Lỗi lưu DSNV vào IndexedDB:`, err);
                }
            }

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

// ... (Các hàm handleFile... khác giữ nguyên) ...
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

// === CÁC HÀM XỬ LÝ PASTE ===

export function handleErpPaste(pastedText, saveKey) {
    try {
        const processedData = dataProcessing.processThuongERP(pastedText);
        thuongERPData.set(processedData);
        if (saveKey) localStorage.setItem(saveKey, pastedText);
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thưởng ERP:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

export function handleErpThangTruocPaste(pastedText, saveKey) {
    try {
        const processedData = dataProcessing.processThuongERP(pastedText);
        thuongERPDataThangTruoc.set(processedData);
        if (saveKey) localStorage.setItem(saveKey, pastedText);
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thưởng ERP Tháng Trước:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

export function handleLuykePaste(pastedText, saveKey) {
    try {
        dataProcessing.parseLuyKePastedData(pastedText);
        const competitionResults = dataProcessing.parseCompetitionDataFromLuyKe(pastedText);
        if (saveKey) localStorage.setItem(saveKey, pastedText);
        return { success: true, message: `✅ Đã xử lý. Tìm thấy ${competitionResults.length} CT thi đua.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Data Lũy Kế:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

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
        
        if (saveKeyRaw) localStorage.setItem(saveKeyRaw, pastedText);
        if (saveKeyProcessed) localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thi Đua Nhân Viên:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

// --- BƯỚC 1: HÀM MỚI ĐỂ TẢI TỪ CACHE ---
/**
 * Tải tất cả dữ liệu từ IndexedDB và LocalStorage khi khởi động ứng dụng.
 * Logic dựa trên `loadDataFromStorage` và `loadPastedDataFromStorage` của main.js gốc.
 */
export async function loadAllFromCache() {
    console.log("[dataService] Bắt đầu tải dữ liệu từ cache...");
    
    // Mở IndexedDB
    try {
        await storage.openDB();
    } catch (err) {
        console.error("Lỗi nghiêm trọng: Không thể mở IndexedDB. Dữ liệu cache file sẽ không được tải.", err);
    }

    // 1. Tải dữ liệu FILE từ IndexedDB
    try {
        // DSNV (quan trọng nhất, phải tải trước)
        const dsnvData = await storage.getItem('saved_danhsachnv');
        if (dsnvData) {
            danhSachNhanVien.set(dsnvData);
            console.log(`[Cache] Đã tải ${dsnvData.length} DSNV từ IndexedDB.`);
        }

        // Các file khác
        const fileLoads = [
            { key: 'saved_ycx', store: ycxData },
            { key: 'saved_giocong', store: rawGioCongData },
            { key: 'saved_thuongnong', store: thuongNongData },
            { key: 'saved_ycx_thangtruoc', store: ycxDataThangTruoc },
            { key: 'saved_thuongnong_thangtruoc', store: thuongNongDataThangTruoc },
        ];

        for (const item of fileLoads) {
            const data = await storage.getItem(item.key);
            if (data) {
                item.store.set(data);
                console.log(`[Cache] Đã tải ${data.length} dòng cho ${item.key}.`);
            }
        }
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu file từ IndexedDB:", err);
    }

    // 2. Tải dữ liệu PASTE từ LocalStorage
    try {
        // Thưởng ERP
        const erpText = localStorage.getItem('daily_paste_thuongerp');
        if (erpText) {
            thuongERPData.set(dataProcessing.processThuongERP(erpText));
        }
        // Thưởng ERP Tháng Trước
        const erpTTText = localStorage.getItem('saved_thuongerp_thangtruoc');
        if (erpTTText) {
            thuongERPDataThangTruoc.set(dataProcessing.processThuongERP(erpTTText));
        }
        // Data Lũy Kế (BI)
        const luykeText = localStorage.getItem('daily_paste_luyke');
        if (luykeText) {
            dataProcessing.parseLuyKePastedData(luykeText);
            dataProcessing.parseCompetitionDataFromLuyKe(luykeText);
        }
        // Thi Đua Nhân Viên (BI) - Tải dữ liệu đã xử lý
        const thiduaProcessed = localStorage.getItem('daily_paste_thiduanv');
        if (thiduaProcessed) {
            pastedThiDuaReportData.set(JSON.parse(thiduaProcessed));
        }

        console.log("[dataService] Đã tải xong dữ liệu từ cache.");
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu paste từ LocalStorage:", err);
    }
}