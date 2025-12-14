/* src/services/processing/logic/dynamicTable.processor.js */
import { formatters } from '../../../utils/formatters.js';

export const dynamicTableProcessor = {
    // [LOGIC MỚI] Tìm kiếm dữ liệu trực tiếp bằng ID (O(1))
    findItemData(employee, targetId) {
        if (!employee || !targetId) return null;

        // Ưu tiên 1: Tìm trong Nhóm Hàng
        if (employee.doanhThuTheoNhomHang && employee.doanhThuTheoNhomHang[targetId]) {
            return employee.doanhThuTheoNhomHang[targetId];
        }
        // Ưu tiên 2: Tìm trong Ngành Hàng
        if (employee.doanhThuTheoNganhHang && employee.doanhThuTheoNganhHang[targetId]) {
            return employee.doanhThuTheoNganhHang[targetId];
        }
        return null;
    },

    // Hàm chính: Biến đổi dữ liệu thô thành dữ liệu hiển thị
    processTableData(reportData, config) {
        if (!reportData || !config) return { processedData: [], totals: {} };

        const processedData = reportData.map(employee => {
            const row = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                mainValue: 0,      // Tổng DT
                mainValue_dtqd: 0, // Tổng DTQĐ
                mainValue_sl: 0,   // Tổng SL
                columns: {}        // Data chi tiết từng cột phụ
            };

            // --- BƯỚC 1: TÍNH TOÁN CỘT TỔNG (MAIN COLUMN) ---
            // Nếu người dùng CÓ chọn items cho cột tổng -> Tính theo items đó
            if (config.mainColumn && config.mainColumn.items && config.mainColumn.items.length > 0) {
                config.mainColumn.items.forEach(itemId => {
                    const itemData = this.findItemData(employee, itemId);
                    if (itemData) {
                        row.mainValue_sl += (itemData.quantity || 0);
                        row.mainValue += (itemData.revenue || 0);
                        row.mainValue_dtqd += (itemData.revenueQuyDoi || 0);
                    }
                });
            } 
            // Nếu KHÔNG chọn items (để trống) -> Logic cũ: Sẽ cộng dồn từ cột phụ ở Bước 2
            
            // --- BƯỚC 2: TÍNH TOÁN CỘT PHỤ (SUB COLUMNS) ---
            if (config.subColumns && Array.isArray(config.subColumns)) {
                config.subColumns.forEach(col => {
                    let sl = 0, dt = 0, dtqd = 0;
                    let details = [];

                    col.items.forEach(itemId => {
                        const itemData = this.findItemData(employee, itemId);
                        if (itemData) {
                            const qty = itemData.quantity || 0;
                            const rev = itemData.revenue || 0;
                            const revQd = itemData.revenueQuyDoi || 0;

                            sl += qty;
                            dt += rev;
                            dtqd += revQd;
                            
                            if (qty > 0 || rev > 0) {
                                details.push(`${itemData.name}: ${formatters.formatNumber(qty)} / ${formatters.formatRevenue(rev)}`);
                            }
                        }
                    });

                    row.columns[col.header] = { sl, dt, dtqd, tooltip: details.join('\n') };
                    
                    // Fallback Logic: Nếu cột tổng chưa được tính (không có items), thì cộng dồn từ cột phụ
                    if (!config.mainColumn || !config.mainColumn.items || config.mainColumn.items.length === 0) {
                        const metrics = config.mainColumn?.metrics || { dt: true }; // Mặc định DT
                        if (metrics.dt) row.mainValue += dt;
                        if (metrics.dtqd) row.mainValue_dtqd += dtqd;
                        if (metrics.sl) row.mainValue_sl += sl;
                    }
                });
            }
            
            // Chỉ trả về nếu có dữ liệu ở cột tổng hoặc bất kỳ cột phụ nào
            const hasData = row.mainValue > 0 || row.mainValue_sl > 0 || row.mainValue_dtqd > 0 || Object.values(row.columns).some(c => c.dt > 0 || c.sl > 0);
            return hasData ? row : null;

        }).filter(Boolean);

        // Tính tổng toàn bảng (Totals Row)
        const totals = processedData.reduce((acc, row) => {
            acc.mainValue += row.mainValue;
            acc.mainValue_dtqd += row.mainValue_dtqd;
            acc.mainValue_sl += row.mainValue_sl;

            Object.keys(row.columns).forEach(key => {
                if (!acc.columns[key]) acc.columns[key] = { sl: 0, dt: 0, dtqd: 0 };
                acc.columns[key].sl += row.columns[key].sl;
                acc.columns[key].dt += row.columns[key].dt;
                acc.columns[key].dtqd += row.columns[key].dtqd;
            });
            return acc;
        }, { mainValue: 0, mainValue_dtqd: 0, mainValue_sl: 0, columns: {} });

        return { processedData, totals };
    },

    // Hàm sắp xếp (Giữ nguyên)
    sortTableData(data, key, direction) {
        return [...data].sort((a, b) => {
            if (key === 'hoTen') {
                return direction === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
            }
            if (key === 'mainValue') return direction === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
            if (key === 'totalSL') return direction === 'asc' ? a.mainValue_sl - b.mainValue_sl : b.mainValue_sl - a.mainValue_sl;
            if (key === 'totalDTQD') return direction === 'asc' ? a.mainValue_dtqd - b.mainValue_dtqd : b.mainValue_dtqd - a.mainValue_dtqd;

            if (key.includes('|')) {
                const [colHeader, type] = key.split('|');
                const valA = a.columns[colHeader]?.[type] || 0;
                const valB = b.columns[colHeader]?.[type] || 0;
                return direction === 'asc' ? valA - valB : valB - valA;
            }
     
            return direction === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
        });
    }
};