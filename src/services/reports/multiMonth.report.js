// src/services/reports/multiMonth.report.js
import { salesProcessor } from './master/salesProcessor.js';
import { dataProcessing } from '../dataProcessing.js';

function parseUniversalDate(val) {
    if (val === null || val === undefined || val === '') return null;
    if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
    if (typeof val === 'number') {
        const jsEpoch = Math.round((val - 25569) * 86400 * 1000);
        const tempDate = new Date(jsEpoch);
        return new Date(tempDate.getUTCFullYear(), tempDate.getUTCMonth(), tempDate.getUTCDate()).getTime();
    }
    const str = String(val).trim();
    const parts = str.split(/[\s,T]+/); 
    if (parts[0].includes('/')) {
        const dParts = parts[0].split('/');
        if (dParts.length >= 3) {
            const p1 = parseInt(dParts[0], 10);
            const p2 = parseInt(dParts[1], 10); 
            const p3 = parseInt(dParts[2], 10);
            if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
            return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
        }
    } else if (parts[0].includes('-')) {
        const dParts = parts[0].split('-');
        if (dParts.length >= 3) {
            const p1 = parseInt(dParts[0], 10);
            const p2 = parseInt(dParts[1], 10); 
            const p3 = parseInt(dParts[2], 10);
            if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
            return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
        }
    }
    const fallbackDate = new Date(val);
    if (!isNaN(fallbackDate.getTime())) return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).setHours(0,0,0,0);
    return null;
}

const normStr = (val) => String(val || "").trim();

export const multiMonthReportLogic = {
    generateMultiMonthReport(rawData, danhSachNhanVien) {
        const map = new Map();
        const monthsSet = new Set();
        if (!rawData || !Array.isArray(rawData)) return { processedMap: map, allMonths: [] };

        const validEmpIds = new Set((danhSachNhanVien || []).map(e => String(e.maNV || e.ma_nv || '').trim()));

        // [XÂY DỰNG NGỮ CẢNH] 1 lần duy nhất cho Nhiều tháng
        const context = {
            hinhThucXuatTinhDoanhThu: dataProcessing.getHinhThucXuatTinhDoanhThu(),
            hinhThucXuatTraGop: dataProcessing.getHinhThucXuatTraGop(),
            heSoQuyDoi: dataProcessing.getHeSoQuyDoi()
        };

        rawData.forEach(row => {
            const evalResult = salesProcessor.evaluateTransaction(row, context);
            if (!evalResult.isValid) return;

            const empId = evalResult.empId;
            if (!empId) return;
            if (validEmpIds.size > 0 && !validEmpIds.has(empId)) return;

            let dateVal = row.ngayTao || row.ngayHenGiao;
            const parsedDate = parseUniversalDate(dateVal);
            if (!parsedDate) return;
            
            const d = new Date(parsedDate);
            const monthKey = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            monthsSet.add(monthKey);
            
            if (!map.has(empId)) {
                const empFromList = (danhSachNhanVien || []).find(e => normStr(e.maNV || e.ma_nv) === empId);
                map.set(empId, { 
                    maNV: empId, 
                    hoTen: empFromList ? empFromList.hoTen : 'Unknown', 
                    months: {} 
                });
            }
            
            const emp = map.get(empId);
            if (!emp.months[monthKey]) {
                emp.months[monthKey] = { dtqd: 0, dt: 0 };
            }
            
            if (evalResult.isDaXuat) {
                emp.months[monthKey].dt += evalResult.thanhTien;
                emp.months[monthKey].dtqd += evalResult.revenueQuyDoi;
            }
        });

        const sortedAll = Array.from(monthsSet).sort((a,b) => {
            const [ma, ya] = a.split('/'); const [mb, yb] = b.split('/');
            return new Date(ya, ma-1) - new Date(yb, mb-1);
        });

        return { processedMap: map, allMonths: sortedAll };
    }
};