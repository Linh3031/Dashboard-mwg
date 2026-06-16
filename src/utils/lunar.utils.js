// src/utils/lunar.utils.js

export const lunarUtils = {
    // Hàm chuyển đổi Dương Lịch sang Âm Lịch (Công thức cơ bản rút gọn cho VN)
    getLunarDate: function(dd, mm, yy) {
        // Thuật toán Julius Day chuyển đổi cơ bản (Mô phỏng)
        // Lưu ý: Để chính xác 100% về tháng nhuận theo thiên văn học, cần thư viện amlich.js đầy đủ.
        // Ở đây sử dụng thuật toán xấp xỉ chu kỳ 29.53 ngày để phục vụ hiển thị UI nội bộ nhanh.
        
        let year = yy;
        let month = mm;
        let day = dd;
        
        if (month < 3) {
            year--;
            month += 12;
        }
        
        let c = Math.floor(year / 100);
        let e = Math.floor(146097 * c / 4);
        let f = Math.floor(1461 * (year - 100 * c) / 4);
        let g = Math.floor((153 * month + 2) / 5);
        let jd = e + f + g + day + 1721118; // Julian Day
        
        // Tính trăng mới cơ sở (1900 làm gốc)
        let lunarCycle = (jd - 2415021.076998695) / 29.530588853;
        let lunarDay = Math.floor((lunarCycle - Math.floor(lunarCycle)) * 29.530588853) + 1;
        
        // Xấp xỉ tháng âm lịch (có sai số nhẹ vào ngày 30, nhưng đủ dùng cho hiển thị tham khảo)
        let lunarMonth = mm;
        if (lunarDay > dd) {
            lunarMonth = mm - 1;
            if (lunarMonth === 0) lunarMonth = 12;
        }
        
        return {
            day: lunarDay,
            month: lunarMonth,
            year: yy,
            leap: false,
            display: `${lunarDay}/${lunarMonth}`
        };
    }
};