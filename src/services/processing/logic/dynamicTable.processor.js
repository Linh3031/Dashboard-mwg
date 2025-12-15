/* src/services/processing/logic/dynamicTable.processor.js */
import { get } from 'svelte/store';
import { formatters } from '../../../utils/formatters.js';
import { parseIdentity } from '../../../utils.js';
import { macroCategoryConfig, macroProductGroupConfig } from '../../../stores.js';

export const dynamicTableProcessor = {
    // Tìm dữ liệu trong object nhân viên theo ID (O(1))
    findItemData(employee, targetId) {
        if (!employee || !targetId) return null;
        
        // 1. Chuẩn hóa ID (nếu targetId dạng "304 - Tivi" thì lấy "304")
        const parsed = parseIdentity(targetId);
        const searchKey = parsed.id !== 'unknown' ? parsed.id : targetId;

        // 2. Ưu tiên tìm trong Nhóm Hàng (doanhThuTheoNhomHang)
        if (employee.doanhThuTheoNhomHang && employee.doanhThuTheoNhomHang[searchKey]) {
            return employee.doanhThuTheoNhomHang[searchKey];
        }
        // 3. Tìm trong Ngành Hàng (doanhThuTheoNganhHang)
        if (employee.doanhThuTheoNganhHang && employee.doanhThuTheoNganhHang[searchKey]) {
            return employee.doanhThuTheoNganhHang[searchKey];
        }
        
        return null;
    },

    /**
     * Tính tổng giá trị từ danh sách ID (Hỗ trợ cả ID đơn và ID nhóm gộp Macro)
     * @param {Object} employee - Dữ liệu nhân viên
     * @param {Array} items - Danh sách ID cần tính (có thể chứa macro_id)
     * @param {String} type - Loại dữ liệu ('DT', 'SL', 'DTQD')
     */
    calculateGroupValue(employee, items, type = 'DT') {
        if (!items || items.length === 0) return 0;

        // Lấy cấu hình Macro từ Store
        const macroCats = get(macroCategoryConfig) || [];
        const macroGroups = get(macroProductGroupConfig) || [];

        let total = 0;
        // Set để tránh cộng trùng lặp nếu 1 ID xuất hiện nhiều lần hoặc trong nhiều Macro lồng nhau
        const processedIds = new Set();

        // Hàm đệ quy để xử lý ID
        const processId = (id) => {
            // Nếu đã xử lý ID này rồi thì bỏ qua
            if (processedIds.has(id)) return;
            
            // 1. Kiểm tra xem ID này có phải là Macro Category không?
            const macroCat = macroCats.find(m => m.id === id || m.name === id);
            if (macroCat && macroCat.items) {
                processedIds.add(id); // Đánh dấu đã xử lý macro này
                macroCat.items.forEach(childId => processId(childId));
                return;
            }

            // 2. Kiểm tra xem ID này có phải là Macro Product Group không?
            const macroGroup = macroGroups.find(m => m.id === id || m.name === id);
            if (macroGroup && macroGroup.items) {
                processedIds.add(id);
                macroGroup.items.forEach(childId => processId(childId));
                return;
            }

            // 3. Nếu không phải Macro, coi đây là ID gốc (Raw ID) -> Tìm dữ liệu
            // Chỉ đánh dấu processed nếu tìm thấy dữ liệu để tránh bỏ sót nếu ID trùng tên Macro
            const data = this.findItemData(employee, id);
            if (data) {
                processedIds.add(id); // Đánh dấu đã cộng ID này
                if (type === 'SL') total += (data.quantity || 0);
                else if (type === 'DTQD') total += (data.revenueQuyDoi || 0);
                else total += (data.revenue || 0); // Default DT
            }
        };

        // Bắt đầu vòng lặp
        items.forEach(id => processId(id));

        return total;
    },

    // Hàm chính: Xử lý dữ liệu bảng
    processTableData(reportData, config) {
        if (!reportData || !config) return { processedData: [], totals: {} };

        // [DETECT TYPE] Xác định cấu trúc config
        const columnsConfig = config.columns || config.subColumns || [];
        
        // Khởi tạo dòng tổng
        const totalRow = {
            maNV: 'TOTAL',
            hoTen: 'TỔNG CỘNG',
            isTotal: true,
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
                const colId = col.id || col.header;
                let value = 0;
                let displayValue = '';
                
                // --- LOGIC MỚI: BẢNG HIỆU QUẢ ---
                if (col.type === 'PERCENT') {
                    // 1. Tính Tử số (Dùng hàm calculateGroupValue mới hỗ trợ Macro)
                    const numVal = this.calculateGroupValue(employee, col.numerator, col.typeA || 'DT');
                    // 2. Tính Mẫu số
                    const denVal = this.calculateGroupValue(employee, col.denominator, col.typeB || 'DT');
                    
                    value = denVal > 0 ? numVal / denVal : 0;
                    displayValue = formatters.formatPercentage(value);
                    
                    // Cộng dồn cho dòng tổng
                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { num: 0, den: 0, type: 'PERCENT' };
                    totalRow.cells[colId].num += numVal;
                    totalRow.cells[colId].den += denVal;

                } else {
                    // --- LOGIC THƯỜNG: SL, DT, DTQD ---
                    const calcType = col.type === 'DTQD' ? 'DTQD' : (col.type === 'SL' ? 'SL' : 'DT');
                    
                    // Tính tổng (Hỗ trợ Macro)
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

    // Hàm sắp xếp (Giữ nguyên)
    sortTableData(data, key, direction) {
        return [...data].sort((a, b) => {
            if (key === 'hoTen') {
                return direction === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
            }
            const valA = a.cells[key]?.value || 0;
            const valB = b.cells[key]?.value || 0;
            return direction === 'asc' ? valA - valB : valB - valA;
        });
    }
};