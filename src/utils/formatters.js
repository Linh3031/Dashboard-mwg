// src/utils/formatters.js
// Version 4.1 - Format 0 as "-", Added parseNumber to prevent system crash
export const formatters = {
    /**
     * Bổ sung hàm parseNumber để lấp lỗ hổng crash khi xử lý chuỗi (Surgical Fix)
     */
    parseNumber: (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        // Lọc bỏ các ký tự không phải số, dấu chấm, dấu trừ
        const cleanStr = String(value).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleanStr);
        return isNaN(parsed) ? 0 : parsed;
    },

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