// src/components/luyke/dtcknam/SsgCalendarLogic.js
import { lunarUtils } from '../../../utils/lunar.utils.js';
import { salesProcessor } from '../../../services/reports/master/salesProcessor.js';
import { dataProcessing } from '../../../services/dataProcessing.js';

const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
    const str = String(dateVal).trim();
    const parts = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (parts) return new Date(parts[3], parts[2] - 1, parts[1]);
    return null;
};

// Hàm lấy ngày tạo an toàn
const getNgayTao = (row) => row.ngayTao || row.NGAY_TAO || row['Ngày tạo'];

// Hàm xác định xem ngày nào là Tương Lai, ngày nào là Quá Khứ
const getCurrentDayToRender = (month, year2026) => {
    const now = new Date();
    if (month === now.getMonth() + 1 && year2026 === now.getFullYear()) {
        return now.getDate() - 1; // Số liệu đến hôm qua
    }
    if (new Date(year2026, month - 1, 1) < now) {
        return new Date(year2026, month, 0).getDate();
    }
    return 0; // Tháng tương lai hoàn toàn
};

export function generateCalendarData(data2025, data2026, month, year2026, targetGrowthPct) {
    const daysInMonth = new Date(year2026, month, 0).getDate();
    const firstDayOfWeek = new Date(year2026, month - 1, 1).getDay(); 
    const currentDay = getCurrentDayToRender(month, year2026);
    const isCurrentMonth = currentDay < daysInMonth;

    let daysArray = [];
    let map25 = new Map(), map26 = new Map();
    
    let totals = { 
        dt25: 0, qd25: 0, tc25: 0, 
        dt26: 0, qd26: 0, tc26: 0,
        daysInMonth, currentDay, isCurrentMonth
    };

    // LẤY NGỮ CẢNH (CONTEXT) TỪ LÕI HỆ THỐNG ĐỂ KIỂM TRA ĐƠN HÀNG
    const context = {
        hinhThucXuatTinhDoanhThu: dataProcessing.getHinhThucXuatTinhDoanhThu(),
        hinhThucXuatTraGop: dataProcessing.getHinhThucXuatTraGop(),
        heSoQuyDoi: dataProcessing.getHeSoQuyDoi()
    };

    const processData = (data, map, is2025) => {
        if (!data || !Array.isArray(data)) return;
        data.forEach(row => {
            const dRaw = getNgayTao(row);
            if (!dRaw) return;
            const d = parseSafeDate(dRaw);
            
            // Loại bỏ ngày rác, chỉ tính đúng tháng đang xem
            if (!d || isNaN(d) || d.getMonth() + 1 !== month) return;

            // GỌI HÀM CORE ĐỂ ĐÁNH GIÁ ĐƠN HÀNG (GIỐNG HỆT TAB LŨY KẾ & BÁO CÁO NHÂN VIÊN)
            const evalResult = salesProcessor.evaluateTransaction(row, context);

            // Chỉ cộng tiền nếu đơn hàng HỢP LỆ và ĐÃ XUẤT (bỏ qua hủy, chưa xuất, chưa thu tiền)
            if (evalResult.isValid && evalResult.isDaXuat) {
                const dayNum = d.getDate();
                if (!map.has(dayNum)) map.set(dayNum, { dt: 0, qd: 0 });
                const dayData = map.get(dayNum);
                
                // Cộng số liệu vào Ngày
                dayData.dt += evalResult.thanhTien;
                dayData.qd += evalResult.revenueQuyDoi;
                
                // Cộng số liệu vào Tổng Tháng (Dùng cho Thẻ KPI)
                if (is2025) {
                    totals.dt25 += evalResult.thanhTien; 
                    totals.qd25 += evalResult.revenueQuyDoi; 
                    if (evalResult.isTraGop) totals.tc25 += evalResult.thanhTien;
                } else {
                    // Cắt rác tương lai: Chỉ cộng cho những ngày đã đi qua
                    if (dayNum <= currentDay) {
                        totals.dt26 += evalResult.thanhTien; 
                        totals.qd26 += evalResult.revenueQuyDoi; 
                        if (evalResult.isTraGop) totals.tc26 += evalResult.thanhTien;
                    }
                }
            }
        });
    };

    // Chạy vòng lặp xử lý dữ liệu 2 năm
    processData(data2025, map25, true);
    processData(data2026, map26, false);

    // MỤC TIÊU: Tính trên DOANH THU THỰC
    const targetRev2026 = totals.dt25 * (1 + targetGrowthPct); 
    const remainingTarget = Math.max(0, targetRev2026 - totals.dt26);

    // Tính tổng lịch sử năm 2025 của các ngày chưa tới để chia trọng số phân bổ
    let sum2025Future = 0; let numFutureDays = 0;
    for (let i = currentDay + 1; i <= daysInMonth; i++) {
        sum2025Future += (map25.get(i)?.dt || 0); 
        numFutureDays++;
    }

    // Xây dựng mảng vẽ Lịch
    const emptyCells = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; 
    for (let i = 0; i < emptyCells; i++) daysArray.push({ isEmpty: true });

    for (let i = 1; i <= daysInMonth; i++) {
        const isFuture = i > currentDay;
        const d25 = map25.get(i) || { dt: 0, qd: 0 };
        const d26 = map26.get(i) || { dt: 0, qd: 0 };
        
        let dailyTarget = 0;
        if (isFuture) {
            dailyTarget = (sum2025Future > 0) 
                ? remainingTarget * (d25.dt / sum2025Future) 
                : (numFutureDays > 0 ? remainingTarget / numFutureDays : 0);
        }

        daysArray.push({
            isEmpty: false, dayNum: i, isFuture: isFuture,
            lunar: lunarUtils.getLunarDate(i, month, year2026).display,
            rev25: d25.dt, revQd25: d25.qd,
            rev26: d26.dt, revQd26: d26.qd,
            target: dailyTarget,
            growthVal: d26.dt - d25.dt, 
            growthPct: d25.dt > 0 ? (d26.dt - d25.dt) / d25.dt : 0
        });
    }

    return { calendarGrid: daysArray, kpiTotals: totals };
}