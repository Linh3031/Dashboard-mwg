// Version 1.0 - Pure Utility Functions
// MODULE: UTILITIES
// Chứa các hàm tiện ích chung, thuần túy, không có phụ thuộc vào UI.

/**
 * Lấy một màu sáng ngẫu nhiên từ danh sách định sẵn.
 * @returns {string} Mã màu hex.
 */
export function getRandomBrightColor() {
    const colors = [
        '#ef4444', // red-500
        '#f97316', // orange-500
        '#eab308', // yellow-500
        '#84cc16', // lime-500
        '#22c55e', // green-500
        '#10b981', // emerald-500
        '#14b8a6', // teal-500
        '#06b6d4', // cyan-500
        '#3b82f6', // blue-500
        '#8b5cf6', // violet-500
        '#d946ef', // fuchsia-500
        '#ec4899', // pink-500
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Chuẩn hóa tên ngành hàng/nhóm hàng.
 * (Bỏ mã số, viết hoa chữ cái đầu)
 * @param {string} name - Tên thô.
 * @returns {string} - Tên đã chuẩn hóa.
 */
export function cleanCategoryName(name) {
    if (!name || typeof name !== 'string') return '';
    // Bỏ mã số, khoảng trắng thừa, và viết hoa chữ cái đầu mỗi từ.
    return name
        .replace(/^\d+\s*-\s*/, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Sắp xếp danh sách bộ phận, ưu tiên "Tư Vấn - ĐM".
 * @param {Array} reportData - Dữ liệu báo cáo thô.
 * @returns {Array<string>} - Danh sách tên bộ phận đã sắp xếp.
 */
export function getSortedDepartmentList(reportData) {
    const allDepts = [...new Set(reportData.map(item => item.boPhan).filter(Boolean))];

    allDepts.sort((a, b) => {
        const aIsPriority = a.includes('Tư Vấn - ĐM');
        const bIsPriority = b.includes('Tư Vấn - ĐM');

        if (aIsPriority && !bIsPriority) {
            return -1; // a comes first
        }
        if (!aIsPriority && bIsPriority) {
            return 1; // b comes first
        }
        // If both are priority or both are not, sort alphabetically
        return a.localeCompare(b);
    });

    return allDepts;
}