// src/ui-formatters.js
export const formatters = {
    formatNumber: (value, decimals = 0) => {
        if (isNaN(value) || value === null) return '0';
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    },
    formatRevenue(value, decimals = 1) {
         if (!isFinite(value) || value === null || value === 0) return '-';
         const millions = value / 1000000;
         const roundedValue = parseFloat(millions.toFixed(decimals));
         if (roundedValue === 0 && millions !== 0) return millions > 0 ? '> 0' : '< 0';
         return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(roundedValue);
     },
     formatNumberOrDash: (value, decimals = 1) => {
         if (!isFinite(value) || value === null || value === 0) return '-';
         const roundedValue = parseFloat(value.toFixed(decimals));
         if (roundedValue === 0 && value !== 0) return value > 0 ? '> 0' : '< 0';
         if (roundedValue === 0) return '-';
         return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(roundedValue);
      },
     formatPercentage: (value, decimals = 0) => {
         if (!isFinite(value) || value === null) return '-';
         if (value === 0) return '-';
         const percentageValue = value * 100;
         const roundedValue = parseFloat(percentageValue.toFixed(decimals));
         if (roundedValue === 0 && percentageValue !== 0) return percentageValue > 0 ? '> 0%' : '< 0%';
         return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(roundedValue) + '%';
      },
    formatTimeAgo(date) {
         if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
         const seconds = Math.floor((new Date() - date) / 1000);
         let interval = seconds / 31536000;
         if (interval > 1) return Math.floor(interval) + " năm trước";
         interval = seconds / 2592000;
         if (interval > 1) return Math.floor(interval) + " tháng trước";
         interval = seconds / 86400;
         if (interval > 1) return Math.floor(interval) + " ngày trước";
         interval = seconds / 3600;
         if (interval > 1) return Math.floor(interval) + " giờ trước";
         interval = seconds / 60;
         if (interval > 1) return Math.floor(interval) + " phút trước";
         return "vài giây trước";
     },
    getShortEmployeeName(hoTen, maNV) {
        if (!hoTen) return maNV || '';
        const nameParts = hoTen.split(' ').filter(p => p);
        let displayName = hoTen;
        if (nameParts.length > 2) displayName = nameParts.slice(-2).join(' ');
        return `${displayName} - ${maNV}`;
    },
};