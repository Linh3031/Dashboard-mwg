/* global XLSX */
import { 
    danhSachNhanVien,
    rawGioCongData,
    // --- BẮT ĐẦU THÊM MỚI ---
    ycxData,
    thuongNongData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc
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
 * Xử lý file DSNV.
 * [cite_start]Logic được chuyển từ DataSection.svelte [cite: 1890-1903] [cite_start]và data.service.js (gốc) [cite: 2203-2207].
 */
export async function handleFileDSNV(file) {
    // File DSNV có logic đặc biệt (cập nhật map) nên không dùng hàm chung
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');

        if (success) {
            danhSachNhanVien.set(normalizedData);
            // Logic `updateEmployeeMaps` đã được chuyển vào `services.js` 
            [cite_start]// và tự động chạy khi `danhSachNhanVien` thay đổi [cite: 2361-2366].
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
 * [cite_start]Logic dựa trên file data.service.js (gốc) [cite: 2191-2203].
 */
export async function handleFileGioCong(file) {
    return _processFile(file, 'giocong', rawGioCongData);
}

// === BẮT ĐẦU THÊM MỚI ===

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
// === KẾT THÚC THÊM MỚI ===