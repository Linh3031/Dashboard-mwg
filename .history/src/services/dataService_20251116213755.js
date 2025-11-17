/* global XLSX */
import { get } from 'svelte/store'; // Import 'get'
import { 
    danhSachNhanVien,
    rawGioCongData,
    ycxData,
    thuongNongData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc,
    // --- BẮT ĐẦU THÊM MỚI (Stores cho Paste) ---
    thuongERPData,
    thuongERPDataThangTruoc,
    competitionData, // store này được cập nhật bởi parseCompetitionDataFromLuyKe
    pastedThiDuaReportData // store này được cập nhật bởi processThiDuaNhanVienData
    // --- KẾT THÚC THÊM MỚI ---
} from '../stores.js';
import { dataProcessing } from './dataProcessing.js';

/**
 * Đọc file Excel/CSV bằng FileReader và XLSX.
 * Đây là hàm helper được lấy từ logic dự án cũ.
 */
async function _handleFileRead(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided."));
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                // Đọc file với cellText: true để đảm bảo mã sản phẩm không bị lỗi E+10
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
async function _processFile(file, fileType, stateKeyStore) {
    try {
        const workbook = await _handleFileRead(file);
        // Đọc sheet đầu tiên, dùng { raw: false } để tôn trọng 'cellText'
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        
        // Lấy đúng 'normalizeType' (ví dụ: 'ycx-thangtruoc' -> 'ycx')
        const normalizeType = fileType.replace('-thangtruoc', '');
        
        // Gọi hàm chuẩn hóa
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, normalizeType);

        if (success) {
            // Cập nhật Svelte store
            stateKeyStore.set(normalizedData);
            
            // Trả về kết quả thành công
            return { success: true, count: normalizedData.length, message: `✅ Tải thành công ${normalizedData.length} dòng.` };
        } else {
            // Trả về lỗi
            const errorMessage = `Lỗi: File thiếu cột: ${missingColumns.join(', ')}`;
            return { success: false, message: `❌ ${errorMessage}` };
        }
    } catch (err) {
        console.error(`Lỗi xử lý file ${fileType}:`, err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý file DSNV. (Đã sửa lỗi)
 */
export async function handleFileDSNV(file) {
    // File DSNV có logic đặc biệt (cập nhật map) nên không dùng hàm chung
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');

        if (success) {
            danhSachNhanVien.set(normalizedData);
            // Logic `updateEmployeeMaps` sẽ tự động chạy thông qua Svelte store subscription
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
 * Xử lý file Giờ Công.
 */
export async function handleFileGioCong(file) {
    return _processFile(file, 'giocong', rawGioCongData);
}

/**
 * Xử lý file Yêu cầu xuất lũy kế.
 */
export async function handleFileYCX(file) {
    return _processFile(file, 'ycx', ycxData);
}

/**
 * Xử lý file Thưởng nóng.
 */
export async function handleFileThuongNong(file) {
    return _processFile(file, 'thuongnong', thuongNongData);
}

/**
 * Xử lý file YCX Lũy Kế tháng trước.
 */
export async function handleFileYCXThangTruoc(file) {
    return _processFile(file, 'ycx-thangtruoc', ycxDataThangTruoc);
}

/**
 * Xử lý file Thưởng nóng tháng trước.
 */
export async function handleFileThuongNongThangTruoc(file) {
    return _processFile(file, 'thuongnong-thangtruoc', thuongNongDataThangTruoc);
}

// === BẮT ĐẦU THÊM MỚI (HÀM XỬ LÝ PASTE) ===

/**
 * Xử lý dán text Thưởng ERP.
 */
export function handleErpPaste(pastedText) {
    try {
        // 1. Xử lý text
        const processedData = dataProcessing.processThuongERP(pastedText);
        // 2. Cập nhật store
        thuongERPData.set(processedData);
        // 3. Lưu text thô vào localStorage
        localStorage.setItem('daily_paste_thuongerp', pastedText);
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thưởng ERP:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý dán text Thưởng ERP Tháng Trước.
 */
export function handleErpThangTruocPaste(pastedText) {
    try {
        const processedData = dataProcessing.processThuongERP(pastedText);
        thuongERPDataThangTruoc.set(processedData);
        localStorage.setItem('saved_thuongerp_thangtruoc', pastedText);
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thưởng ERP Tháng Trước:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý dán text Data Lũy Kế (BI).
 * Hàm này có 2 nhiệm vụ: Phân tích KPI chính và phân tích dữ liệu Thi Đua.
 */
export function handleLuykePaste(pastedText) {
    try {
        // 1. Phân tích KPI chính (chỉ để lưu, chưa dùng)
        dataProcessing.parseLuyKePastedData(pastedText);
        
        // 2. Phân tích dữ liệu thi đua (QUAN TRỌNG)
        // Hàm này sẽ tự động cập nhật store `competitionData`
        const competitionResults = dataProcessing.parseCompetitionDataFromLuyKe(pastedText);
        
        // 3. Lưu text thô
        localStorage.setItem('daily_paste_luyke', pastedText);
        
        return { success: true, message: `✅ Đã xử lý. Tìm thấy ${competitionResults.length} CT thi đua.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Data Lũy Kế:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * Xử lý dán text Thi Đua Nhân Viên (BI).
 */
export function handleThiduaNVPaste(pastedText) {
    try {
        // 1. Phân tích cú pháp bảng
        const parsedData = dataProcessing.parsePastedThiDuaTableData(pastedText);
        if (!parsedData.success) {
            throw new Error(parsedData.error || "Lỗi phân tích cú pháp bảng.");
        }
        
        // 2. Cập nhật mapping tên (nếu có tên mới)
        // Hàm này tự động cập nhật store `competitionNameMappings`
        dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
        
        // 3. Xử lý dữ liệu (so khớp DSNV, tên, v.v.)
        // Cần `get` store `competitionData` (đã được cập nhật bởi handleLuykePaste)
        const $competitionData = get(competitionData);
        const processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);

        // 4. Cập nhật store chính
        pastedThiDuaReportData.set(processedData);
        
        // 5. Lưu text thô và dữ liệu đã xử lý
        localStorage.setItem(RAW_PASTE_THIDUANV_KEY, pastedText);
        localStorage.setItem('daily_paste_thiduanv', JSON.stringify(processedData)); // Giống hệt dự án cũ
        
        return { success: true, message: `✅ Đã xử lý ${processedData.length} nhân viên.` };
    } catch (err) {
        console.error("Lỗi xử lý dán Thi Đua Nhân Viên:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}
// === KẾT THÚC THÊM MỚI ===