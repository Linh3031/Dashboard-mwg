import { formatters } from '../../../utils/formatters.js';
import { helpers } from '../helpers.js'; // [SỬA LỖI CRASH] Gọi trực tiếp helper, tránh vòng lặp Import

// Helper chuẩn hóa chuỗi
const normalizeStr = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
};

// Helper bóc tách ID tuyệt đối để đồng bộ với cơ chế của hệ thống gốc
const extractId = (str) => {
    if (!str) return 'unknown';
    const match = String(str).trim().match(/^(\d+)\s*[-–]/);
    return match ? match[1] : normalizeStr(str);
};

export const dailyTrendProcessor = {
    parseUniversalDate(val) {
        if (!val) return null;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'number') {
            const jsEpoch = Math.round((val - 25569) * 86400 * 1000);
            const tempDate = new Date(jsEpoch);
            return new Date(tempDate.getUTCFullYear(), tempDate.getUTCMonth(), tempDate.getUTCDate()).getTime();
        }
        const str = String(val).trim();
        const parts = str.split(/[\s,T]+/); 
        const datePart = parts[0]; 
        if (datePart.includes('/')) {
            const dParts = datePart.split('/');
            if (dParts.length >= 3) {
                const p1 = parseInt(dParts[0], 10), p2 = parseInt(dParts[1], 10), p3 = parseInt(dParts[2], 10);
                if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
                return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
            }
        } else if (datePart.includes('-')) {
            const dParts = datePart.split('-');
            if (dParts.length >= 3) {
                const p1 = parseInt(dParts[0], 10), p2 = parseInt(dParts[1], 10), p3 = parseInt(dParts[2], 10);
                if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
                return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
            }
        }
        const fallbackDate = new Date(val);
        if (!isNaN(fallbackDate.getTime())) return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).setHours(0,0,0,0);
        return null;
    },

    buildPivotMatrix(ycxData, employees, settings, allMetricsConfig = [], heSoMap = {}) {
        const empMap = new Map();
        const empList = [];
        
        employees.forEach(emp => {
            const id = String(emp.maNV || '').trim().toLowerCase();
            if (id) {
                empMap.set(id, emp);
                empList.push({
                    maNV: emp.maNV, hoTen: emp.hoTen, maKho: emp.maKho,
                    displayName: formatters.getShortEmployeeName(emp.hoTen, emp.maNV)
                });
            }
        });

        const startTimestamp = settings.startDate ? new Date(settings.startDate).setHours(0,0,0,0) : null;
        const endTimestamp = settings.endDate ? new Date(settings.endDate).setHours(23,59,59,999) : null;

        const dayMap = new Map();
        const matrixData = {};
        empList.forEach(emp => { matrixData[emp.maNV] = {}; });
        
        let activeMetricCfg = settings.viewMode === 'METRIC' ? allMetricsConfig.find(m => m.id === settings.metricId) : null;
        
        // [SỬA LỖI] Ép về chữ thường (lowercase) để so sánh 100% không trật
        const validHTX = helpers.getHinhThucXuatTinhDoanhThu();
        const validHTXLower = new Set(Array.from(validHTX).map(s => s.toLowerCase()));

        for (let i = 0; i < ycxData.length; i++) {
            const row = ycxData[i];

            // BỘ LỌC 1: TRẠNG THÁI ĐƠN HÀNG (So sánh tuyệt đối)
            const trangThaiHuy = String(row.trangThaiHuy || row['Trạng thái hủy'] || '').trim().toLowerCase();
            if (trangThaiHuy === 'đã hủy' || trangThaiHuy === 'hủy') {
                continue; 
            }

            // BỘ LỌC 2: HÌNH THỨC XUẤT
            const htxRaw = String(row.hinhThucXuat || row['Hình thức xuất'] || '').trim().toLowerCase();
            if (settings.viewMode !== 'RAW' && !validHTXLower.has(htxRaw)) {
                continue; 
            }

            if (settings.warehouse && settings.warehouse !== 'ALL') {
                const wh = row.maKhoTao || row.maKho || row['Mã kho tạo'] || row['Kho tạo'];
                if (wh && String(wh).trim() !== String(settings.warehouse).trim()) continue;
            }

            const rowTime = this.parseUniversalDate(row.ngayTao || row['Ngày tạo'] || row.date);
            if (!rowTime) continue;
            if (startTimestamp && rowTime < startTimestamp) continue;
            if (endTimestamp && rowTime > endTimestamp) continue;

            const dObj = new Date(rowTime);
            const dateStr = `${dObj.getFullYear()}-${dObj.getMonth() + 1 < 10 ? '0'+(dObj.getMonth() + 1) : dObj.getMonth() + 1}-${dObj.getDate() < 10 ? '0'+dObj.getDate() : dObj.getDate()}`;
            dayMap.set(dateStr, rowTime);

            let empId = null;
            const rowMaNV = String(row.maNV || row.manv || row.maNhanVien || '').trim().toLowerCase();
            if (rowMaNV && empMap.has(rowMaNV)) {
                empId = empMap.get(rowMaNV).maNV;
            } else {
                const nguoiTao = String(row.nguoiTao || row['Người tạo'] || '').trim();
                const numMatch = nguoiTao.match(/(NV\d+|\d+)/i);
                if (numMatch && empMap.has(numMatch[1].toLowerCase())) {
                    empId = empMap.get(numMatch[1].toLowerCase()).maNV;
                } else {
                    const cleanName = nguoiTao.split('-')[0].trim().toLowerCase();
                    if (empMap.has(cleanName)) empId = empMap.get(cleanName).maNV;
                }
            }

            if (!empId || !matrixData[empId]) continue;
            
            if (!matrixData[empId][dateStr]) {
                matrixData[empId][dateStr] = { 
                    doanhThuTheoNganhHang: {}, 
                    doanhThuTheoNhomHang: {}, 
                    totalRevenue: 0, 
                    totalQuantity: 0,
                    traGopRevenue: 0,
                    rawRows: []
                };
            }
            const cell = matrixData[empId][dateStr];

            const quantity = parseInt(row.soLuong || 0);
            let revenue = parseFloat(String(row.thanhTien || 0).replace(/[^0-9.-]+/g, "")) || 0;
            const isTraGop = htxRaw.includes('trả') || htxRaw.includes('chậm');

            const nhomHang = String(row.nhomHang || '');
            const nganhHang = String(row.nganhHang || '');
            const nhomId = extractId(nhomHang);
            const nganhId = extractId(nganhHang);

            let hs = heSoMap[nhomId] !== undefined ? heSoMap[nhomId] : 1;
            if (isTraGop) hs += 0.3;
            const revenueQuyDoi = revenue * hs;

            if (!cell.doanhThuTheoNhomHang[nhomId]) cell.doanhThuTheoNhomHang[nhomId] = { quantity: 0, revenue: 0, revenueQuyDoi: 0 };
            cell.doanhThuTheoNhomHang[nhomId].quantity += quantity;
            cell.doanhThuTheoNhomHang[nhomId].revenue += revenue;
            cell.doanhThuTheoNhomHang[nhomId].revenueQuyDoi += revenueQuyDoi;

            if (!cell.doanhThuTheoNganhHang[nganhId]) cell.doanhThuTheoNganhHang[nganhId] = { quantity: 0, revenue: 0, revenueQuyDoi: 0 };
            cell.doanhThuTheoNganhHang[nganhId].quantity += quantity;
            cell.doanhThuTheoNganhHang[nganhId].revenue += revenue;
            cell.doanhThuTheoNganhHang[nganhId].revenueQuyDoi += revenueQuyDoi;

            cell.totalRevenue += revenue;
            cell.totalQuantity += quantity;
            if (isTraGop) cell.traGopRevenue += revenue;
            
            if (settings.viewMode === 'RAW') cell.rawRows.push(row);
        }

        const sortedDates = Array.from(dayMap.keys()).sort();
        const columnDays = sortedDates.map(dStr => ({ dateStr: dStr, display: `${dStr.split('-')[2]}/${dStr.split('-')[1]}` }));
        const colTotals = {}; 
        let grandRaw = 0, grandNum = 0, grandDen = 0;

        const finalRows = empList.map(emp => {
            const rowCells = {};
            let rowRaw = 0, rowNum = 0, rowDen = 0;

            sortedDates.forEach(dStr => {
                const cellBucket = matrixData[emp.maNV][dStr] || { 
                    doanhThuTheoNganhHang: {}, doanhThuTheoNhomHang: {}, 
                    totalRevenue: 0, totalQuantity: 0, traGopRevenue: 0, rawRows: [] 
                };
                
                let val = 0, displayStr = '-', num = 0, den = 0, rawValue = 0;

                if (settings.viewMode === 'RAW') {
                    let cellRawSum = 0;
                    const checkArrayMatch = (filterArray, rowValue) => {
                        if (!filterArray || filterArray.length === 0) return true;
                        return filterArray.some(f => normalizeStr(rowValue).includes(normalizeStr(f)));
                    };

                    cellBucket.rawRows.forEach(row => {
                        let isMatch = true;
                        if (!checkArrayMatch(settings.filters.nganhHang, row.nganhHang)) isMatch = false;
                        if (!checkArrayMatch(settings.filters.nhomHang, row.nhomHang)) isMatch = false;
                        if (!checkArrayMatch(settings.filters.nhaSanXuat, row.nhaSanXuat)) isMatch = false;
                        if (settings.filters.tenSanPham && !normalizeStr(row.tenSanPham).includes(normalizeStr(settings.filters.tenSanPham))) isMatch = false;

                        if (isMatch) {
                            const quantity = parseInt(row.soLuong || 0);
                            let revenue = parseFloat(String(row.thanhTien || 0).replace(/[^0-9.-]+/g, "")) || 0;
                            cellRawSum += (settings.rawType === 'quantity' ? quantity : revenue);
                        }
                    });
                    rawValue = cellRawSum;
                } 
                else if (settings.metricId === 'DTTL') {
                    rawValue = cellBucket.totalRevenue;
                }
                else if (settings.metricId === 'SL') {
                    rawValue = cellBucket.totalQuantity;
                }
                else if (settings.metricId === 'TY_LE_QUY_DOI') {
                    let totalDTQD = 0;
                    Object.values(cellBucket.doanhThuTheoNhomHang).forEach(b => totalDTQD += b.revenueQuyDoi);
                    num = totalDTQD;
                    den = cellBucket.totalRevenue;
                }
                else if (settings.metricId === 'TY_LE_TRA_CHAM') {
                    num = cellBucket.traGopRevenue;
                    den = cellBucket.totalRevenue;
                }
                else if (activeMetricCfg) {
                    const metricType = activeMetricCfg.percentMetric || activeMetricCfg.typeA || activeMetricCfg.type || 'DTTL';
                    const denType = activeMetricCfg.typeB || metricType;
                    const modeA = activeMetricCfg.modeA || 'group';
                    const modeB = activeMetricCfg.modeB || (activeMetricCfg.modeA === 'category' ? 'category' : 'group');

                    const calcValue = (groupList, type, mode) => {
                        let total = 0;
                        if (!Array.isArray(groupList)) return 0;
                        
                        groupList.forEach(targetId => {
                            if (!targetId) return;
                            const cleanTargetId = extractId(targetId); 

                            const bucketToScan = (mode === 'category') 
                                ? cellBucket.doanhThuTheoNganhHang 
                                : cellBucket.doanhThuTheoNhomHang;

                            const bucketVal = bucketToScan[cleanTargetId];
                            if (bucketVal) {
                                if (type === 'SL') total += bucketVal.quantity || 0;
                                else if (type === 'DTQD') total += bucketVal.revenueQuyDoi || 0;
                                else total += bucketVal.revenue || 0;
                            }
                        });
                        return total;
                    };

                    num = calcValue(activeMetricCfg.groupA, metricType, modeA);
                    den = calcValue(activeMetricCfg.groupB, denType, modeB);
                }

                if (settings.viewMode === 'RAW' || settings.metricId === 'DTTL' || settings.metricId === 'SL') {
                    val = rawValue;
                    displayStr = val > 0 ? (settings.rawType === 'quantity' || settings.metricId === 'SL' ? formatters.formatNumber(val) : formatters.formatRevenue(val, 1)) : '-';
                    rowRaw += val; 
                    colTotals[dStr] = colTotals[dStr] || { raw: 0 }; colTotals[dStr].raw += val;
                } else if (settings.metricId === 'TY_LE_QUY_DOI') {
                    val = den > 0 ? (num / den) - 1 : 0;
                    displayStr = den > 0 ? formatters.formatPercentage(val, 1) : '-';
                    rowNum += num; rowDen += den;
                    colTotals[dStr] = colTotals[dStr] || { num: 0, den: 0 }; colTotals[dStr].num += num; colTotals[dStr].den += den;
                } else {
                    val = den > 0 ? num / den : 0;
                    displayStr = den > 0 ? formatters.formatPercentage(val, 1) : '-';
                    rowNum += num; rowDen += den;
                    colTotals[dStr] = colTotals[dStr] || { num: 0, den: 0 }; colTotals[dStr].num += num; colTotals[dStr].den += den;
                }
                rowCells[dStr] = { value: val, display: displayStr, num, den, rawValue };
            });

            grandRaw += rowRaw; grandNum += rowNum; grandDen += rowDen;
            
            let sumVal = 0, sumDisplay = '-';
            if (settings.viewMode === 'RAW' || settings.metricId === 'DTTL' || settings.metricId === 'SL') {
                sumVal = rowRaw;
                sumDisplay = sumVal > 0 ? (settings.rawType === 'quantity' || settings.metricId === 'SL' ? formatters.formatNumber(sumVal) : formatters.formatRevenue(sumVal, 1)) : '-';
            } else if (settings.metricId === 'TY_LE_QUY_DOI') {
                sumVal = rowDen > 0 ? (rowNum / rowDen) - 1 : 0;
                sumDisplay = rowDen > 0 ? formatters.formatPercentage(sumVal, 1) : '-';
            } else {
                sumVal = rowDen > 0 ? rowNum / rowDen : 0;
                sumDisplay = rowDen > 0 ? formatters.formatPercentage(sumVal, 1) : '-';
            }

            return { ...emp, cells: rowCells, summaryValue: sumVal, summaryDisplay: sumDisplay };
        });

        Object.keys(colTotals).forEach(dStr => {
            if (settings.viewMode === 'RAW' || settings.metricId === 'DTTL' || settings.metricId === 'SL') {
                colTotals[dStr].value = colTotals[dStr].raw;
                colTotals[dStr].display = colTotals[dStr].raw > 0 ? (settings.rawType === 'quantity' || settings.metricId === 'SL' ? formatters.formatNumber(colTotals[dStr].raw) : formatters.formatRevenue(colTotals[dStr].raw, 1)) : '-';
            } else if (settings.metricId === 'TY_LE_QUY_DOI') {
                colTotals[dStr].value = colTotals[dStr].den > 0 ? (colTotals[dStr].num / colTotals[dStr].den) - 1 : 0;
                colTotals[dStr].display = colTotals[dStr].den > 0 ? formatters.formatPercentage(colTotals[dStr].value, 1) : '-';
            } else {
                colTotals[dStr].value = colTotals[dStr].den > 0 ? colTotals[dStr].num / colTotals[dStr].den : 0;
                colTotals[dStr].display = colTotals[dStr].den > 0 ? formatters.formatPercentage(colTotals[dStr].value, 1) : '-';
            }
        });

        let grandVal = 0, grandDisplay = '-';
        if (settings.viewMode === 'RAW' || settings.metricId === 'DTTL' || settings.metricId === 'SL') {
            grandVal = grandRaw;
            grandDisplay = grandVal > 0 ? (settings.rawType === 'quantity' || settings.metricId === 'SL' ? formatters.formatNumber(grandVal) : formatters.formatRevenue(grandVal, 1)) : '-';
        } else if (settings.metricId === 'TY_LE_QUY_DOI') {
            grandVal = grandDen > 0 ? (grandNum / grandDen) - 1 : 0;
            grandDisplay = grandDen > 0 ? formatters.formatPercentage(grandVal, 1) : '-';
        } else {
            grandVal = grandDen > 0 ? grandNum / grandDen : 0;
            grandDisplay = grandDen > 0 ? formatters.formatPercentage(grandVal, 1) : '-';
        }

        return { rows: finalRows.filter(r => r.summaryDisplay !== '-'), columns: columnDays, colTotals, grandSummaryDisplay: grandDisplay };
    }
};