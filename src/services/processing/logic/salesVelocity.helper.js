// File: src/services/processing/logic/salesVelocity.helper.js

// [GENESIS HELPER] Chuẩn hóa key (bỏ dấu, viết thường, bỏ khoảng trắng)
const normalizeKey = (key) => {
    if (!key) return '';
    return key.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
        .replace(/\s+/g, ""); // Bỏ khoảng trắng
};

// [GENESIS HELPER] Parse ngày Việt Nam (dd/mm/yyyy) an toàn
const parseDateVN = (dateStr) => {
    if (!dateStr) return null;
    // Nếu là object Date sẵn
    if (dateStr instanceof Date && !isNaN(dateStr)) return dateStr.getTime();

    const str = String(dateStr).trim();
    
    // Thử regex dd/mm/yyyy
    const parts = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // JS month 0-11
        const year = parseInt(parts[3], 10);
        return new Date(year, month, day).getTime();
    }
    
    // Fallback cho format chuẩn (yyyy-mm-dd hoặc ISO)
    const timestamp = Date.parse(str);
    return isNaN(timestamp) ? null : timestamp;
};

export const filterDataByDate = (data, fromDate, toDate) => {
    if (!data || data.length === 0) return [];
    if (!fromDate && !toDate) return data;

    // Chuyển mốc thời gian lọc về timestamp (đầu ngày và cuối ngày)
    const from = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
    const to = toDate ? new Date(toDate).setHours(23,59,59,999) : null;

    // Cache key ngày tháng tìm được để không phải loop keys mỗi dòng
    let foundDateKey = null;

    return data.filter(row => {
        let dateVal = null;

        // 1. Nếu đã tìm được key ngày trước đó, dùng luôn cho nhanh
        if (foundDateKey) {
            dateVal = row[foundDateKey];
        } else {
            // 2. Nếu chưa, quét keys để tìm cột "Ngày tạo"
            const keys = Object.keys(row);
            for (const key of keys) {
                const cleanKey = normalizeKey(key);
                // Ưu tiên các từ khóa: ngaytao, ngaychungtu, date
                if (cleanKey === 'ngaytao' || cleanKey === 'ngaychungtu' || cleanKey === 'date' || cleanKey === 'ngay') {
                    foundDateKey = key;
                    dateVal = row[key];
                    break;
                }
            }
        }

        // Nếu không có ngày, mặc định giữ lại (an toàn)
        if (!dateVal) return true;

        const rowTime = parseDateVN(dateVal);
        if (rowTime === null) return true; // Parse lỗi thì giữ lại

        if (from && rowTime < from) return false;
        if (to && rowTime > to) return false;
        return true;
    });
};

export const transformVelocityTree = (nodes, divisor) => {
    if (!nodes || nodes.length === 0) return [];
    if (divisor <= 1) return nodes;

    return nodes.map(node => {
        const newNode = { ...node };
        const divide = (val) => parseFloat(((val || 0) / divisor).toFixed(1));

        newNode.quantity = divide(node.quantity);
        newNode.revenue = divide(node.revenue);
        newNode.revenueQD = divide(node.revenueQD);
        newNode.revenueTraCham = divide(node.revenueTraCham);

        if (newNode.children && newNode.children.length > 0) {
            newNode.children = transformVelocityTree(newNode.children, divisor);
        }
        return newNode;
    });
};