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

const getValueFromMultiKeys = (obj, keys) => {
    if (!obj) return 0;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
            return getSafeNumber(obj[key]);
        }
    }
    return 0;
};

export const dynamicTableProcessor = {
    findItemData(employee, targetId) {
        if (!employee || !targetId) return null;
        const parsed = parseIdentity(targetId);
        const searchKey = (parsed.id !== 'unknown' ? parsed.id : targetId).toString().trim();
        if (employee.doanhThuTheoNhomHang && employee.doanhThuTheoNhomHang[searchKey]) {
            return employee.doanhThuTheoNhomHang[searchKey];
        }
        if (employee.doanhThuTheoNganhHang && employee.doanhThuTheoNganhHang[searchKey]) {
            return employee.doanhThuTheoNganhHang[searchKey];
        }
        return null;
    },

    /**
     * Tính tổng giá trị (CÓ LOG CHI TIẾT)
     * @param logger: Mảng để lưu log truy vết
     */
    calculateGroupValue(employee, items, type = 'DT', logger = null) {
        if (!items || items.length === 0) return 0;

        const macroCats = get(macroCategoryConfig) || [];
        const macroGroups = get(macroProductGroupConfig) || [];

        let total = 0;
        const processedIds = new Set();

        const processId = (id) => {
            const safeId = id ? id.toString().trim() : '';
            if (!safeId || processedIds.has(safeId)) return;
            
            // 1. Check Macro Category
            const macroCat = macroCats.find(m => m.id == safeId || m.name === safeId);
            if (macroCat && macroCat.items) {
                processedIds.add(safeId);
                if (logger) logger.push(`   📂 [MACRO CAT] ${safeId}:`);
                macroCat.items.forEach(childId => processId(childId));
                return;
            }

            // 2. Check Macro Product Group
            const macroGroup = macroGroups.find(m => m.id == safeId || m.name === safeId);
            if (macroGroup && macroGroup.items) {
                processedIds.add(safeId);
                if (logger) logger.push(`   📂 [MACRO GROUP] ${safeId}:`);
                macroGroup.items.forEach(childId => processId(childId));
                return;
            }

            // 3. Raw ID
            const data = this.findItemData(employee, safeId);
            let val = 0;
            if (data) {
                processedIds.add(safeId);
                if (type === 'SL') {
                    val = getValueFromMultiKeys(data, ['quantity', 'soLuong', 'sl', 'count']);
                } else if (type === 'DTQD') {
                    val = getValueFromMultiKeys(data, ['revenueQuyDoi', 'doanhThuQuyDoi', 'dtqd']);
                } else {
                    val = getValueFromMultiKeys(data, ['revenue', 'doanhThu', 'thanhTien', 'totalPrice', 'dt']);
                }
                
                total += val;
                
                // Chỉ log những mục có giá trị để đỡ rối
                if (logger && val !== 0) {
                    logger.push(`      🔹 ${safeId} (${type}): ${formatters.formatNumber(val)}`);
                }
            }
        };

        items.forEach(id => processId(id));
        return total;
    },

    processTableData(reportData, config) {
        if (!reportData || !config) return { processedData: [], totals: {} };

        const mainColConfig = config.mainColumn ? { ...config.mainColumn, id: 'mainValue', isMain: true } : null;
        const subColsConfig = config.subColumns || [];
        const effectiveSubCols = config.columns || subColsConfig;
        
        const allColumnsToProcess = mainColConfig ? [mainColConfig, ...effectiveSubCols] : [...effectiveSubCols];

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
                mucTieu: employee.mucTieu || {},
                cells: {}
            };

            let hasAnyData = false;

            allColumnsToProcess.forEach(col => {
                const colId = col.id || col.header;
                const cellData = { sl: 0, dt: 0, dtqd: 0, value: 0, display: '', config: col };

                if (col.type === 'PERCENT') {
                    // Logic % (Bảng hiệu quả)
                    
                    // --- 🔍 TRACE DEBUG START ---
                    let traceLog = [];
                    // Chỉ debug cho một vài nhân viên mẫu để đỡ spam
                    const isTargetDebug = employee.hoTen.includes('Tú Phương') || employee.hoTen.includes('Tien'); 
                    
                    // [LOGIC MỚI] Lấy loại Metric từ cấu hình (Ưu tiên percentMetric -> mặc định DT)
                    const metricType = col.percentMetric || 'DT';

                    const numVal = this.calculateGroupValue(employee, col.numerator, metricType, isTargetDebug ? traceLog : null);
                    // Mẫu số dùng chung loại Metric với Tử số (trừ khi có config riêng typeB - mà hiện tại UI chưa hỗ trợ separate config nên cứ dùng chung)
                    const denVal = this.calculateGroupValue(employee, col.denominator, metricType, isTargetDebug ? traceLog : null);

                    if (isTargetDebug) { 
                         // Điều kiện lọc log: In ra nếu có mẫu số > 0 để kiểm tra
                         if (denVal > 0) {
                             console.groupCollapsed(`🕵️ [TRACE] ${employee.hoTen} - ${col.header} (% ${metricType})`);
                             console.log(`%c Tử số (${metricType}): ${formatters.formatNumber(numVal)}`, 'color: green');
                             console.log(`%c Mẫu số (${metricType}): ${formatters.formatNumber(denVal)}`, 'color: red; font-weight: bold');
                             console.log(`👇 CHI TIẾT CÁC MÓN CỘNG VÀO:`);
                             traceLog.forEach(log => console.log(log));
                             console.groupEnd();
                         }
                    }
                    // --- TRACE DEBUG END ---

                    const val = denVal > 0 ? numVal / denVal : 0;
                    cellData.value = val;
                    cellData.display = formatters.formatPercentage(val);
                    
                    if (numVal > 0 || denVal > 0) hasAnyData = true;

                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { num: 0, den: 0, type: 'PERCENT' };
                    totalRow.cells[colId].num += numVal;
                    totalRow.cells[colId].den += denVal;

                } else {
                    // Logic Cột thường (DT, SL, DTQD)
                    cellData.sl = this.calculateGroupValue(employee, col.items, 'SL');
                    cellData.dt = this.calculateGroupValue(employee, col.items, 'DT');
                    cellData.dtqd = this.calculateGroupValue(employee, col.items, 'DTQD');

                    if (col.type === 'SL') {
                        cellData.value = cellData.sl;
                        cellData.display = formatters.formatNumber(cellData.sl);
                    } else if (col.type === 'DTQD') {
                        cellData.value = cellData.dtqd;
                        cellData.display = formatters.formatRevenue(cellData.dtqd);
                    } else {
                        cellData.value = cellData.dt;
                        cellData.display = formatters.formatRevenue(cellData.dt);
                    }

                    if (cellData.value > 0 || cellData.sl > 0 || cellData.dt > 0 || cellData.dtqd > 0) hasAnyData = true;

                    if (!totalRow.cells[colId]) totalRow.cells[colId] = { sl: 0, dt: 0, dtqd: 0, val: 0, type: col.type || 'DT' };
                    totalRow.cells[colId].sl += cellData.sl;
                    totalRow.cells[colId].dt += cellData.dt;
                    totalRow.cells[colId].dtqd += cellData.dtqd;
                    totalRow.cells[colId].val += cellData.value;
                }

                row.cells[colId] = cellData;
                if (col.isMain) {
                    row.mainValue = cellData.value;
                    row.mainValue_sl = cellData.sl;
                    row.mainValue_dtqd = cellData.dtqd;
                }
            });

            return hasAnyData ? row : null;
        }).filter(Boolean);

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