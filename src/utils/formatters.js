// src/utils/formatters.js
// Version 4.0 - Format 0 as "-"
export const formatters = {
    /**
     * Định dạng số lượng. 0 -> "-"
     */
    formatNumber: (value, decimals = 0) => {
        if (!isFinite(value) || value === null || value === 0) return '-';
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    },

    /**
     * Định dạng doanh thu (chia cho 1 triệu). 0 -> "-"
     */
    formatRevenue(value, decimals = 1) {
         if (!isFinite(value) || value === null) return '-';
         
         // Nếu giá trị quá nhỏ (gần bằng 0) -> trả về "-"
         if (Math.abs(value) < 1000) return '-'; 

         const millions = value / 1000000;
         return new Intl.NumberFormat('vi-VN', {
             minimumFractionDigits: 0,
             maximumFractionDigits: decimals
         }).format(millions);
     },

     /**
      * Định dạng số thường (giữ nguyên logic cũ cho các trường hợp khác)
      */
     formatNumberOrDash: (value, decimals = 1) => {
          if (!isFinite(value) || value === null || Math.abs(value) < 0.01) return '-';
          return new Intl.NumberFormat('vi-VN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: decimals
          }).format(value);
      },

      /**
       * Định dạng phần trăm. 0 -> "-"
       */
     formatPercentage: (value, decimals = 0) => {
          if (!isFinite(value) || value === null) return '-';
          
          // Kiểm tra số 0 tuyệt đối hoặc rất nhỏ
          if (Math.abs(value) < 0.0001) return '-';

          const percentageValue = value * 100;
          return new Intl.NumberFormat('vi-VN', {
             minimumFractionDigits: decimals,
             maximumFractionDigits: decimals
          }).format(percentageValue) + '%';
      },

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