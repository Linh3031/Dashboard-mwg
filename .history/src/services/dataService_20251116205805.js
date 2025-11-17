/* global XLSX */
import { 
    danhSachNhanVien,
    rawGioCongData // Import store mới cho giờ công
} from '../stores.js';
import { dataProcessing } from './dataProcessing.js';

/**
 * Đọc file Excel/CSV bằng FileReader và XLSX.
 * Đây là hàm helper được lấy từ logic dự án cũ [cite: 2186-2189].
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
 * Xử lý file DSNV.
 * Logic được chuyển từ DataSection.svelte [cite: 1890-1903] và data.service.js (gốc) [cite: 2203-2207].
 */
export async function handleFileDSNV(file) {
    try {
        const workbook = await _handleFileRead(file);
        // Đọc sheet đầu tiên, dùng { raw: false } để tôn trọng 'cellText'
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        
        // Gọi hàm chuẩn hóa từ service Svelte
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');

        if (success) {
            // Cập nhật Svelte store
            danhSachNhanVien.set(normalizedData);
            
            // Trả về kết quả thành công
            return { success: true, count: normalizedData.length, message: `✅ Tải thành công ${normalizedData.length} nhân viên.` };
        } else {
            // Trả về lỗi
            const errorMessage = `Lỗi: File thiếu cột: ${missingColumns.join(', ')}`;
            return { success: false, message: `❌ ${errorMessage}` };
        }
    } catch (err) {
        console.error("Lỗi xử lý file DSNV:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}

/**
 * MỚI: Xử lý file Giờ Công.
 * Logic dựa trên file data.service.js (gốc) [cite: 2191-2203].
 */
export async function handleFileGioCong(file) {
    const fileType = 'giocong';
    const stateKeyStore = rawGioCongData; // Ánh xạ tới Svelte store

    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });

        // Gọi hàm chuẩn hóa
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, fileType);

        if (success) {
            // Cập nhật Svelte store
            stateKeyStore.set(normalizedData);
            
            // Trả về kết quả thành công
            return { success: true, count: normalizedData.length, message: `✅ Tải thành công ${normalizedData.length} dòng giờ công.` };
        } else {
            const errorMessage = `Lỗi: File thiếu cột: ${missingColumns.join(', ')}`;
            return { success: false, message: `❌ ${errorMessage}` };
        }
    } catch (err) {
        console.error("Lỗi xử lý file Giờ Công:", err);
        return { success: false, message: `❌ Lỗi: ${err.message}` };
    }
}