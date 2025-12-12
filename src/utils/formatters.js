// src/utils/formatters.js
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
         if (!isFinite(value) || value === null) return '-';
         
         // [FIX] Xử lý số 0 tuyệt đối hoặc rất nhỏ
         if (Math.abs(value) < 1000) return '0'; 

         const millions = value / 1000000;
         const roundedValue = parseFloat(millions.toFixed(decimals));
         
         if (roundedValue === 0 && Math.abs(millions) > 0.000001) {
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
          if (!isFinite(value) || value === null) return '-';
          if (Math.abs(value) < 0.01) return '-'; // Coi như bằng 0

          const roundedValue = parseFloat(value.toFixed(decimals));
          return new Intl.NumberFormat('vi-VN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: decimals
          }).format(roundedValue);
      },

      /**
       * Định dạng số thành phần trăm (nhân 100).
       */
     formatPercentage: (value, decimals = 0) => {
         if (!isFinite(value) || value === null) return '0%';
         
         // [FIX] Sửa lỗi hiển thị >0% cho số 0 hoặc số cực nhỏ
         if (Math.abs(value) < 0.0001) return '0%';

         const percentageValue = value * 100;
         const roundedValue = parseFloat(percentageValue.toFixed(decimals));
         
         if (roundedValue === 0 && Math.abs(percentageValue) > 0.000001) {
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