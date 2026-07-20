/* src/services/processing/logic/dynamicTable.processor.js */
// Version 3.1 - Atomic Integrity: Brand Filtering Support for Dynamic Tables with Normalized Brand Names
import { get } from 'svelte/store';
import { formatters } from '../../../utils/formatters.js';
import { parseIdentity } from '../../../utils.js';
import { macroCategoryConfig, macroProductGroupConfig } from '../../../stores.js';

const getSafeNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    if (typeof value === 'string') {
        const cleanStr = value.replace(/[^0-9.-]+/g, ""); 
        return parseFloat(cleanStr) || 0;
    }
    return 0;
};

const isBrandMatch = (rowBrand, targetBrands) => {
    if (!targetBrands || !Array.isArray(targetBrands) || targetBrands.length === 0) return true;
    const cleanRowBrand = String(rowBrand || 'Khác').trim().toLowerCase();
    return targetBrands.some(b => String(b).trim().toLowerCase() === cleanRowBrand);
};

export const dynamicTableProcessor = {
    findItemData(employee, targetId) {
        if (!employee || !targetId) return null;
        const parsed = parseIdentity(targetId);
        const searchKey = (parsed.id !== 'unknown' ? parsed.id : targetId).toString().trim();
        
        const nh = employee.doanhThuTheoNhomHang?.[searchKey];
        const ng = employee.doanhThuTheoNganhHang?.[searchKey];
        const sp = employee.doanhThuTheoMaSanPham?.[searchKey];

        if (sp && (sp.quantity > 0 || sp.revenue > 0)) return sp;
        if (nh && (nh.quantity > 0 || nh.revenue > 0)) return nh;
        if (ng && (ng.quantity > 0 || ng.revenue > 0)) return ng;
        
        return sp || nh || ng || null;
    },

    processTableData(sourceData, tableConfig) {
        if (!sourceData || !tableConfig) return { processedData: [], totals: {} };

        const { columns = [], subColumns = [] } = tableConfig;
        const mainColumn = columns.find(c => c.id === 'mainValue') || { show: false, items: [], type: 'DT' };
        
        const usedSubColumns = (subColumns && subColumns.length > 0) 
            ? subColumns 
            : columns.filter(c => c.id !== 'mainValue');

        const $macroCategoryConfig = get(macroCategoryConfig) || [];
        const $macroProductGroupConfig = get(macroProductGroupConfig) || [];

        const calculateGroupValue = (employee, items, type, targetBrands = []) => {
            let totalVal = 0, totalSL = 0, totalDTQD = 0;
            
            const targetIds = new Set();
            items.forEach(rawId => {
                const parsedId = parseIdentity(rawId).id;
                
                const macroCat = $macroCategoryConfig.find(m => m.name === rawId);
                if (macroCat && macroCat.items) {
                    macroCat.items.forEach(subId => targetIds.add(subId));
                    return;
                }

                const macroGrp = $macroProductGroupConfig.find(m => m.name === rawId);
                if (macroGrp && macroGrp.items) {
                    macroGrp.items.forEach(subId => targetIds.add(subId));
                    return;
                }

                const finalId = parsedId !== 'unknown' ? parsedId : rawId;
                targetIds.add(finalId);
            });

            if (targetBrands && targetBrands.length > 0 && employee._rawSalesData && Array.isArray(employee._rawSalesData)) {
                employee._rawSalesData.forEach(row => {
                    const rowNhom = String(row.maNhomHang || '').trim();
                    const rowNganh = String(row.maNganhHang || '').trim();
                    const rowBrand = String(row.nhaSanXuat || row.brand || row['Hãng'] || row['Hãng sản xuất'] || row['NhaSanXuat'] || row['TEN_HANG'] || '').trim();

                    if ((targetIds.has(rowNhom) || targetIds.has(rowNganh)) && isBrandMatch(rowBrand, targetBrands)) {
                        totalVal += (row._thanhTien || 0);
                        totalSL += (row._soLuong || 0);
                        totalDTQD += (row._revenueQuyDoi || 0);
                    }
                });
            } else {
                targetIds.forEach(targetId => {
                    const data = this.findItemData(employee, targetId);
                    if (data) {
                        totalVal += data.revenue || 0;
                        totalSL += data.quantity || 0;
                        totalDTQD += data.revenueQuyDoi || 0;
                    }
                });
            }

            return {
                val: type === 'SL' ? totalSL : (type === 'DTQD' ? totalDTQD : totalVal),
                sl: totalSL,
                dtqd: totalDTQD
            };
        };

        const totalRow = { 
            hoTen: 'Tổng cộng', 
            isTotal: true, 
            mainValue: 0, mainValue_sl: 0, mainValue_dtqd: 0, 
            cells: {} 
        };
        
        usedSubColumns.forEach(col => {
            totalRow.cells[col.id] = { val: 0, sl: 0, dtqd: 0, num: 0, den: 0, type: col.type };
        });

        const processedData = sourceData.map(employee => {
            const row = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                mainValue: 0, mainValue_sl: 0, mainValue_dtqd: 0,
                cells: {}
            };
            
            let hasAnyData = false;

            if (mainColumn.show && mainColumn.items && mainColumn.items.length > 0) {
                const result = calculateGroupValue(employee, mainColumn.items, mainColumn.type);
                row.mainValue = result.val;
                row.mainValue_sl = result.sl;
                row.mainValue_dtqd = result.dtqd;
                if (result.val > 0 || result.sl > 0) hasAnyData = true;
            } else {
                row.mainValue = employee.doanhThu || 0;
                row.mainValue_sl = employee.tongSoLuong || 0;
                row.mainValue_dtqd = employee.doanhThuQuyDoi || 0;
                if (row.mainValue > 0) hasAnyData = true;
            }

            usedSubColumns.forEach(col => {
                let cellData = { val: 0, sl: 0, dtqd: 0, num: 0, den: 0, type: col.type, display: '0', value: 0 };
                
                if (col.type === 'PERCENT') {
                    const numType = col.percentMetric || col.typeA || 'DT';
                    const denType = col.percentMetric || col.typeB || 'DT';
                    
                    const numRes = calculateGroupValue(employee, col.numerator || [], numType, col.brands);
                    const denRes = calculateGroupValue(employee, col.denominator || [], denType, col.brands);
                    
                    cellData.num = numRes.val;
                    cellData.den = denRes.val;
                    
                    const val = cellData.den > 0 ? cellData.num / cellData.den : 0;
                    cellData.value = val;
                    cellData.display = formatters.formatPercentage(val);
                    
                    totalRow.cells[col.id].num += cellData.num;
                    totalRow.cells[col.id].den += cellData.den;
                    if (cellData.num > 0 || cellData.den > 0) hasAnyData = true;

                } else {
                    const result = calculateGroupValue(employee, col.items || [], col.type, col.brands);
                    cellData.val = result.val;
                    cellData.sl = result.sl;
                    cellData.dtqd = result.dtqd;
                    cellData.value = result.val;
                    
                    if (col.type === 'SL') cellData.display = formatters.formatNumber(result.val);
                    else cellData.display = formatters.formatRevenue(result.val);

                    totalRow.cells[col.id].val += result.val;
                    totalRow.cells[col.id].sl += result.sl;
                    totalRow.cells[col.id].dtqd += result.dtqd;
                    if (result.val > 0 || result.sl > 0) hasAnyData = true;
                }

                row.cells[col.id] = cellData;
                
                if (mainColumn.show && col.id === 'mainValue') {
                    row.mainValue = cellData.val;
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