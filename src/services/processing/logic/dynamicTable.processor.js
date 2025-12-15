/* src/services/processing/logic/dynamicTable.processor.js */
import { get } from 'svelte/store';
import { formatters } from '../../../utils/formatters.js';
import { parseIdentity } from '../../../utils.js';
import { macroCategoryConfig, macroProductGroupConfig } from '../../../stores.js';

// Helper: Làm sạch và ép kiểu số an toàn
const getSafeNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    if (typeof value === 'string') {
        const cleanStr = value.replace(/[^0-9.-]+/g, ""); 
        return parseFloat(cleanStr) || 0;
    }
    return 0;
};

// [FIX] Helper: Lấy giá trị từ object, trả về ngay khi tìm thấy key tồn tại (kể cả 0)
const getValueFromMultiKeys = (obj, keys) => {
    if (!obj) return 0;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
            // Nếu key tồn tại, trả về giá trị ngay lập tức, không bỏ qua số 0
            return getSafeNumber(obj[key]);
        }
    }
    return 0;
};

export const dynamicTableProcessor = {
    // Tìm dữ liệu trong object nhân viên theo ID (O(1))
    findItemData(employee, targetId) {
        if (!employee || !targetId) return null;
        
        // 1. Chuẩn hóa ID
        const parsed = parseIdentity(targetId);
        // Trim khoảng trắng thừa trong ID nếu có. Chuyển về string để so khớp key object.
        const searchKey = (parsed.id !== 'unknown' ? parsed.id : targetId).toString().trim();

        // 2. Ưu tiên tìm trong Nhóm Hàng
        if (employee.doanhThuTheoNhomHang && employee.doanhThuTheoNhomHang[searchKey]) {
            return employee.doanhThuTheoNhomHang[searchKey];
        }
        // 3. Tìm trong Ngành Hàng
        if (employee.doanhThuTheoNganhHang && employee.doanhThuTheoNganhHang[searchKey]) {
            return employee.doanhThuTheoNganhHang[searchKey];
        }
        
        return null;
    },

    /**
     * Tính tổng giá trị từ danh sách ID
     */
    calculateGroupValue(employee, items, type = 'DT') {
        if (!items || items.length === 0) return 0;

        const macroCats = get(macroCategoryConfig) || [];
        const macroGroups = get(macroProductGroupConfig) || [];

        let total = 0;
        const processedIds = new Set();

        const processId = (id) => {
            // Chuẩn hóa ID input
            const safeId = id ? id.toString().trim() : '';
            if (!safeId || processedIds.has(safeId)) return;
            
            // 1. Check Macro Category
            const macroCat = macroCats.find(m => m.id == safeId || m.name === safeId);
            if (macroCat && macroCat.items) {
                processedIds.add(safeId);
                macroCat.items.forEach(childId => processId(childId));
                return;
            }

            // 2. Check Macro Product Group
            const macroGroup = macroGroups.find(m => m.id == safeId || m.name === safeId);
            if (macroGroup && macroGroup.items) {
                processedIds.add(safeId);
                macroGroup.items.forEach(childId => processId(childId));
                return;
            }

            // 3. Raw ID
            const data = this.findItemData(employee, safeId);
            if (data) {
                processedIds.add(safeId);
                
                if (type === 'SL') {
                    // Tìm trong quantity, soLuong, sl
                    total += getValueFromMultiKeys(data, ['quantity', 'soLuong', 'sl', 'count']);
                } else if (type === 'DTQD') {
                    // Tìm trong revenueQuyDoi, doanhThuQuyDoi
                    total += getValueFromMultiKeys(data, ['revenueQuyDoi', 'doanhThuQuyDoi', 'dtqd']);
                } else {
                    // Mặc định là DT (Doanh thu)
                    // [FIX] Ưu tiên 'revenue' vì salesProcessor lưu vào biến này
                    total += getValueFromMultiKeys(data, ['revenue', 'doanhThu', 'thanhTien', 'totalPrice', 'dt']);
                }
            }
        };

        items.forEach(id => processId(id));
        return total;
    },

    // --- REWRITE: Xử lý dữ liệu bảng toàn diện ---
    processTableData(reportData, config) {
        if (!reportData || !config) return { processedData: [], totals: {} };

        // 1. Chuẩn bị danh sách cột cần tính
        const mainColConfig = config.mainColumn ? { ...config.mainColumn, id: 'mainValue', isMain: true } : null;
        const subColsConfig = config.subColumns || [];
        const effectiveSubCols = config.columns || subColsConfig;
        
        const allColumnsToProcess = mainColConfig ? [mainColConfig, ...effectiveSubCols] : [...effectiveSubCols];

        // 2. Khởi tạo dòng tổng
        const totalRow = {
            maNV: 'TOTAL',
            hoTen: 'TỔNG CỘNG',
            isTotal: true,
            cells: {} 
        };

        // 3. Loop qua từng nhân viên
        const processedData = reportData.map(employee => {
            const row = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                mucTieu: employee.mucTieu || {},
                cells: {}
            };

            let hasAnyData = false;

            allColumnsToProcess.forEach(col => {
                const colId = col.id || col.header;
                
                // Khởi tạo object cell
                const cellData = {
                    sl: 0,
                    dt: 0,
                    dtqd: 0,
                    value: 0,
                    display: '',
                    config: col
                };

                // --- LOGIC TÍNH TOÁN ---
                if (col.type === 'PERCENT') {
                    // Logic % (Bảng hiệu quả)
                    const numVal = this.calculateGroupValue(employee, col.numerator, col.typeA || 'DT');
                    const denVal = this.calculateGroupValue(employee, col.denominator, col.typeB || 'DT');
                    const val = denVal > 0 ? numVal / denVal : 0;
                    
                    cellData.value = val;
                    cellData.display = formatters.formatPercentage(val);
                    
                    if (numVal > 0 || denVal > 0) hasAnyData = true;

                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { num: 0, den: 0, type: 'PERCENT' };
                    totalRow.cells[colId].num += numVal;
                    totalRow.cells[colId].den += denVal;

                } else {
                    // --- LOGIC DOANH THU: Tính ĐỦ cả 3 chỉ số ---
                    cellData.sl = this.calculateGroupValue(employee, col.items, 'SL');
                    cellData.dt = this.calculateGroupValue(employee, col.items, 'DT');
                    cellData.dtqd = this.calculateGroupValue(employee, col.items, 'DTQD');

                    // Xác định giá trị chính
                    if (col.type === 'SL') {
                        cellData.value = cellData.sl;
                        cellData.display = formatters.formatNumber(cellData.sl);
                    } else if (col.type === 'DTQD') {
                        cellData.value = cellData.dtqd;
                        cellData.display = formatters.formatRevenue(cellData.dtqd);
                    } else {
                        cellData.value = cellData.dt; // Mặc định DT
                        cellData.display = formatters.formatRevenue(cellData.dt);
                    }

                    // Đánh dấu có dữ liệu (Chỉ cần 1 trong 3 chỉ số > 0)
                    if (cellData.value > 0 || cellData.sl > 0 || cellData.dt > 0 || cellData.dtqd > 0) hasAnyData = true;

                    // Cộng dồn cho dòng tổng
                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { sl: 0, dt: 0, dtqd: 0, val: 0, type: col.type || 'DT' };
                    totalRow.cells[colId].sl += cellData.sl;
                    totalRow.cells[colId].dt += cellData.dt;
                    totalRow.cells[colId].dtqd += cellData.dtqd;
                    totalRow.cells[colId].val += cellData.value;
                }

                // Map vào row
                row.cells[colId] = cellData;
                
                // Map phẳng cho Main Column (Sorting support)
                if (col.isMain) {
                    row.mainValue = cellData.value;
                    row.mainValue_sl = cellData.sl;
                    row.mainValue_dtqd = cellData.dtqd;
                }
            });

            return hasAnyData ? row : null;
        }).filter(Boolean);

        // 4. Finalize dòng tổng
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
                
                if (key === 'mainValue') {
                    totalRow.mainValue = cell.val;
                    totalRow.mainValue_sl = cell.sl;
                    totalRow.mainValue_dtqd = cell.dtqd;
                }
            }
        });

        return { processedData, totals: totalRow };
    },

    // Hàm sắp xếp
    sortTableData(data, key, direction) {
        return [...data].sort((a, b) => {
            if (key === 'hoTen') {
                return direction === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
            }
            const valA = a.cells[key]?.value ?? a[key] ?? 0;
            const valB = b.cells[key]?.value ?? b[key] ?? 0;
            return direction === 'asc' ? valA - valB : valB - valA;
        });
    }
};