/* global XLSX */
import { 
    danhSachNhanVien,
    rawGioCongData,
    // --- Thêm 4 store còn lại ---
    ycxData,
    thuongNongData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc
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
 * Xử lý file DSNV. (ĐÃ SỬA LỖI)
 * Logic được chuyển từ DataSection.svelte và data.service.js (gốc).
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
            // (Không còn lỗi 'cite_start' ở đây)
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