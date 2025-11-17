// File: src/utils/formatters.js
// MODULE: UI FORMATTERS
// Chứa các hàm thuần túy để định dạng dữ liệu (tách ra từ ui-components.js)
// Những hàm này không phụ thuộc vào DOM hoặc appState.

export const formatters = {
    /**
     * Định dạng số theo chuẩn Việt Nam.
     */
    formatNumber: (value, decimals = 0) => {
        if (isNaN(value) || value === null) return '0';
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    },

    /**
     * Định dạng doanh thu (chia cho 1 triệu) và trả về chuỗi.
     */
    formatRevenue(value, decimals = 1) {
         if (!isFinite(value) || value === null || value === 0) return '-';
         const millions = value / 1000000;
         const roundedValue = parseFloat(millions.toFixed(decimals));
         if (roundedValue === 0 && millions !== 0) {
              return millions > 0 ? '> 0' : '< 0';
         }
         return new Intl.NumberFormat('vi-VN', {
             minimumFractionDigits: 0,
             maximumFractionDigits: decimals
         }).format(roundedValue);
     },

     /**
      * Định dạng số, trả về '-' nếu là 0.
      */
     formatNumberOrDash: (value, decimals = 1) => {
         if (!isFinite(value) || value === null || value === 0) return '-';
          const roundedValue = parseFloat(value.toFixed(decimals));
          if (roundedValue === 0 && value !== 0) {
               return value > 0 ? '> 0' : '< 0';
          }
           if (roundedValue === 0) return '-';
          return new Intl.NumberFormat('vi-VN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: decimals
          }).format(roundedValue);
      },

      /**
       * Định dạng số thành phần trăm (nhân 100).
       */
     formatPercentage: (value, decimals = 0) => {
         if (!isFinite(value) || value === null) return '-';
          if (value === 0) return '-';
          const percentageValue = value * 100;
          const roundedValue = parseFloat(percentageValue.toFixed(decimals));
          if (roundedValue === 0 && percentageValue !== 0) {
             return percentageValue > 0 ? '> 0%' : '< 0%';
          }
         return new Intl.NumberFormat('vi-VN', {
             minimumFractionDigits: decimals,
              maximumFractionDigits: decimals
          }).format(roundedValue) + '%';
      },

    /**
     * Lấy tên rút gọn của nhân viên (Tên cuối + MSNV).
     */
    getShortEmployeeName(hoTen, maNV) {
        if (!hoTen) return maNV || '';
        const nameParts = hoTen.split(' ').filter(p => p);
        let displayName = hoTen;
        if (nameParts.length > 2) {
            displayName = nameParts.slice(-2).join(' ');
        }
        return `${displayName} - ${maNV}`;
    },
};