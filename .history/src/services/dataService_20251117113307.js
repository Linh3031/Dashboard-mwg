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
import { storage } from '../modules/storage.js';

const LOCAL_DSNV_FILENAME_KEY = '_localDsnvFilename';
const RAW_PASTE_THIDUANV_KEY = 'raw_paste_thiduanv';

// === BƯỚC 1: TẠO BẢNG ÁNH XẠ (MAPPING) ===
// Ánh xạ SaveKey (từ UI) tới Store và Loại chuẩn hóa
const FILE_MAPPING = {
    'saved_danhsachnv': { store: danhSachNhanVien, normalizeType: 'danhsachnv' },
    'saved_giocong': { store: rawGioCongData, normalizeType: 'giocong' },
    'saved_ycx': { store: ycxData, normalizeType: 'ycx' },
    'saved_thuongnong': { store: thuongNongData, normalizeType: 'thuongnong' },
    'saved_ycx_thangtruoc': { store: ycxDataThangTruoc, normalizeType: 'ycx' }, // normalizeType là 'ycx'
    'saved_thuongnong_thangtruoc': { store: thuongNongDataThangTruoc, normalizeType: 'thuongnong' } // normalizeType là 'thuongnong'
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
        // Hàm này phức tạp, cần logic đặc biệt
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
/**
 * Xử lý TẤT CẢ các sự kiện tải file.
 */
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
            // Cập nhật Svelte store
            mapping.store.set(normalizedData);
            
            // Lưu vào IndexedDB
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
/**
 * Xử lý TẤT CẢ các sự kiện dán text.
 */
export function handlePasteChange(pastedText, saveKeyPaste, saveKeyRaw, saveKeyProcessed) {
    // Xác định đúng key (hầu hết dùng saveKeyPaste, trừ thi đua NV)
    const primaryKey = saveKeyProcessed || saveKeyPaste;
    const mapping = PASTE_MAPPING[primaryKey];
    
    if (!mapping) {
        return { success: false, message: `❌ Lỗi: Không tìm thấy mapping cho key ${primaryKey}` };
    }

    try {
        let processedData;
        let message = "";

        if (mapping.isThiDuaNV) {
            // Logic đặc biệt cho Thi Đua NV
            const parsedData = dataProcessing.parsePastedThiDuaTableData(pastedText);
            if (!parsedData.success) {
                throw new Error(parsedData.error || "Lỗi phân tích cú pháp bảng.");
            }
            dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
            const $competitionData = get(competitionData); // Lấy data Lũy kế
            processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
            
            mapping.store.set(processedData);
            
            // Lưu 2 key
            localStorage.setItem(saveKeyRaw, pastedText);
            localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
            message = `✅ Đã xử lý ${processedData.length} nhân viên.`;

        } else if (mapping.processFunc) {
            // Logic cho các ô paste còn lại (ERP, Lũy Kế)
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


// === BƯỚC 4: HÀM TẢI CACHE (GIỮ NGUYÊN) ===
/**
 * Tải tất cả dữ liệu từ IndexedDB và LocalStorage khi khởi động ứng dụng.
 */
export async function loadAllFromCache() {
    console.log("[dataService] Bắt đầu tải dữ liệu từ cache...");
    
    try {
        await storage.openDB();
    } catch (err) {
        console.error("Lỗi nghiêm trọng: Không thể mở IndexedDB. Dữ liệu cache file sẽ không được tải.", err);
    }

    // 1. Tải dữ liệu FILE từ IndexedDB
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

    // 2. Tải dữ liệu PASTE từ LocalStorage
    try {
        // Data Lũy Kế (phải chạy trước Thi Đua NV)
        const luykeText = localStorage.getItem('daily_paste_luyke');
        if (luykeText) {
            dataProcessing.parseLuyKePastedData(luykeText);
            dataProcessing.parseCompetitionDataFromLuyKe(luykeText);
        }

        // Thi Đua Nhân Viên (tải data đã xử lý)
        const thiduaProcessed = localStorage.getItem('daily_paste_thiduanv');
        if (thiduaProcessed) {
            pastedThiDuaReportData.set(JSON.parse(thiduaProcessed));
        }

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

        console.log("[dataService] Đã tải xong dữ liệu từ cache.");
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu paste từ LocalStorage:", err);
    }
}

/**
 * Tải file mẫu DSNV. (Hàm này không đổi)
 */
export async function handleTemplateDownload() {
    // Tạm thời hardcode, sau này sẽ thay bằng Firebase Storage
    console.warn("handleTemplateDownload: Chưa kết nối Firebase Storage, tạm thời chưa làm gì.");
    alert("Chức năng tải file mẫu sẽ được kết nối sau.");
    // try {
    //     const url = await storageService.getTemplateDownloadURL();
    //     const link = document.createElement('a');
    //     link.href = url;
    //     link.download = 'Danh_Sach_Nhan_Vien_Mau.xlsx';
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    // } catch (error) {
    //     console.error("Lỗi khi tải file mẫu:", error);
    // }
}