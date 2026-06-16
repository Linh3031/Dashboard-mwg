// src/utils/lunar.utils.js
// Thuật toán Âm lịch Việt Nam chuẩn (Dựa trên thuật toán Hồ Ngọc Đức)

export const lunarUtils = {
    getLunarDate: function(dd, mm, yy) {
        const INT = parseInt;
        function jdn(dd, mm, yy) {
            let a = INT((14 - mm) / 12);
            let y = yy + 4800 - a;
            let m = mm + 12 * a - 3;
            return dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
        }
        function jdToDate(jd) {
            let a = jd + 32044;
            let b = INT((4 * a + 3) / 146097);
            let c = a - INT((146097 * b) / 4);
            let d = INT((4 * c + 3) / 1461);
            let e = c - INT((1461 * d) / 4);
            let m = INT((5 * e + 2) / 153);
            let day = e - INT((153 * m + 2) / 5) + 1;
            let month = m + 3 - 12 * INT(m / 10);
            let year = b * 100 + d - 4800 + INT(m / 10);
            return [day, month, year];
        }
        function newMoon(k) {
            let T = k / 1236.85;
            let T2 = T * T, T3 = T2 * T;
            let dr = 7771.3771450833 + 415471.40119226 * T + 0.00068731 * T2 - 0.00000325 * T3;
            let M1 = (134.96298139 + 477198.8673981 * T + 0.0086972 * T2 + 0.0000147 * T3) * Math.PI / 180;
            let M = (359.2242 + 29.10535608 * k) * Math.PI / 180;
            let F = (93.27191 + 483202.017538 * T - 0.0036825 * T2 + 0.00000306 * T3) * Math.PI / 180;
            let O = (259.183275 - 1934.136261 * T + 0.002078 * T2 + 0.0000022 * T3) * Math.PI / 180;
            let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
                + 0.00033 * Math.sin(O)
                + (0.1734 - 0.000393 * T) * Math.sin(M1)
                + 0.0021 * Math.sin(2 * M1)
                - 0.000406 * Math.sin(M)
                + 0.011 * Math.sin(2 * F);
            return INT(jd + 0.5 + 7 / 24); // GMT+7
        }
        function getLunarMonth(mm, yy) {
            let k = INT((yy - 1900) * 12.3685);
            let jd = jdn(1, mm, yy);
            let nm = newMoon(k);
            while (nm > jd) { k--; nm = newMoon(k); }
            while (newMoon(k + 1) <= jd) { k++; nm = newMoon(k); }
            let month = k - INT((yy - 1900) * 12.3685) + 1;
            if (month < 1) month += 12;
            return month;
        }

        let jd = jdn(dd, mm, yy);
        let k = INT((yy - 1900) * 12.3685);
        let nm = newMoon(k);
        while (nm > jd) { k--; nm = newMoon(k); }
        while (newMoon(k + 1) <= jd) { k++; nm = newMoon(k); }
        
        let lunarDay = jd - nm + 1;
        let lunarMonth = getLunarMonth(mm, yy);

        return {
            day: lunarDay,
            month: lunarMonth,
            year: yy,
            display: `${lunarDay}/${lunarMonth}`
        };
    }
};