/* src/services/processing/logic/dynamicTable.processor.js */
import { formatters } from '../../../utils/formatters.js';

export const dynamicTableProcessor = {
    // Tìm dữ liệu theo ID (O(1))
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

    // Hàm tính tổng giá trị từ danh sách ID
    calculateGroupValue(employee, items, type = 'DT') {
        if (!items || items.length === 0) return 0;
        
        return items.reduce((sum, itemId) => {
            const data = this.findItemData(employee, itemId);
            if (!data) return sum;

            if (type === 'SL') return sum + (data.quantity || 0);
            if (type === 'DTQD') return sum + (data.revenueQuyDoi || 0);
            return sum + (data.revenue || 0); // Default DT
        }, 0);
    },

    // Hàm chính: Xử lý dữ liệu bảng
    processTableData(reportData, config) {
        if (!reportData || !config) return { processedData: [], totals: {} };

        // [DETECT TYPE] Xác định cấu trúc config mới hay cũ
        const columnsConfig = config.columns || config.subColumns || [];
        
        // Khởi tạo dòng tổng
        const totalRow = {
            maNV: 'TOTAL',
            hoTen: 'TỔNG CỘNG',
            isTotal: true,
            // Dynamic cells
            cells: {} 
        };

        const processedData = reportData.map(employee => {
            const row = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                mucTieu: employee.mucTieu || {}, // Lấy mục tiêu cá nhân
                cells: {}
            };

            let hasData = false;

            columnsConfig.forEach(col => {
                const colId = col.id || col.header; // Fallback cho bảng cũ
                let value = 0;
                let displayValue = '';
                let rawData = {};
                
                // --- LOGIC MỚI: BẢNG HIỆU QUẢ ---
                if (col.type === 'PERCENT') {
                    // 1. Tính Tử số
                    const numVal = this.calculateGroupValue(employee, col.numerator, 'DT'); // Mặc định DT, có thể mở rộng sau
                    // 2. Tính Mẫu số
                    const denVal = this.calculateGroupValue(employee, col.denominator, 'DT');
                    
                    value = denVal > 0 ? numVal / denVal : 0;
                    displayValue = formatters.formatPercentage(value);
                    
                    // Cộng dồn cho dòng tổng (Tử & Mẫu riêng)
                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { num: 0, den: 0, type: 'PERCENT' };
                    totalRow.cells[colId].num += numVal;
                    totalRow.cells[colId].den += denVal;

                } else {
                    // --- LOGIC CŨ/THƯỜNG: SL, DT, DTQD ---
                    // Map type config sang type tính toán
                    const calcType = col.type === 'DTQD' ? 'DTQD' : (col.type === 'SL' ? 'SL' : 'DT');
                    
                    // Nếu là bảng cũ (subColumns), items nằm ở col.items
                    // Nếu là bảng mới (columns), items cũng nằm ở col.items
                    value = this.calculateGroupValue(employee, col.items, calcType);
                    
                    if (calcType === 'SL') displayValue = formatters.formatNumber(value);
                    else displayValue = formatters.formatRevenue(value);

                    // Cộng dồn dòng tổng
                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { val: 0, type: col.type || 'DT' };
                    totalRow.cells[colId].val += value;
                }

                if (value > 0) hasData = true;

                // Lưu vào cell
                row.cells[colId] = {
                    value,
                    display: displayValue,
                    config: col
                };
            });

            return hasData ? row : null;
        }).filter(Boolean);

        // Tính toán hiển thị cho dòng Tổng
        Object.keys(totalRow.cells).forEach(key => {
            const cell = totalRow.cells[key];
            if (cell.type === 'PERCENT') {
                const val = cell.den > 0 ? cell.num / cell.den : 0;
                cell.value = val;
                cell.display = formatters.formatPercentage(val);
            } else {
                if (cell.type === 'SL') cell.display = formatters.formatNumber(cell.val);
                else cell.display = formatters.formatRevenue(cell.val);
                cell.value = cell.val;
            }
        });

        return { processedData, totals: totalRow };
    },

    // Hàm sắp xếp
    sortTableData(data, key, direction) {
        return [...data].sort((a, b) => {
            // Sort theo tên
            if (key === 'hoTen') {
                return direction === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
            }
            
            // Sort theo giá trị cột (truy cập vào cells)
            const valA = a.cells[key]?.value || 0;
            const valB = b.cells[key]?.value || 0;
            
            return direction === 'asc' ? valA - valB : valB - valA;
        });
    }
};