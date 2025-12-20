// File: src/utils/kpi.utils.js

/**
 * Hàm thuần túy: Tính màu sắc dựa trên % hoàn thành
 * @param {number} actual - Số thực đạt
 * @param {number} target - Mục tiêu
 * @returns {string} - Class Tailwind tương ứng
 */
export const getCompletionColor = (actual, target) => {
    // 1. Bảo vệ: Nếu không có mục tiêu, hoặc mục tiêu = 0 -> Không tô màu
    if (!target || target === 0) return '';

    // 2. Tính toán % hoàn thành
    const percent = (actual / target) * 100;

    // 3. Logic Mới (Theo yêu cầu):
    // - Dưới mục tiêu (< 100%) -> Tô Đỏ
    // - Đạt trở lên (>= 100%) -> Không tô màu
    if (percent < 100) {
        return 'bg-red-50 text-red-600 font-bold'; 
    }
    
    // Đạt mục tiêu trở lên -> Trả về rỗng (giữ nguyên màu chữ mặc định của bảng)
    return '';
};

/**
 * Hàm định dạng tiền tệ VNĐ (Tiện ích đi kèm thường dùng)
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};