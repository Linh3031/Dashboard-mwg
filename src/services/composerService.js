// File: src/services/composerService.js
// MỤC ĐÍCH: Chỉ chứa logic cho Trình tạo Nhận xét.
import { get } from 'svelte/store';
import { masterReportData } from '../stores.js';
import { dataProcessing } from './dataProcessing.js';
import { utils } from '../utils.js';
import { formatters } from '../utils/formatters.js'; // <-- SỬA LỖI BUG

const composerServices = {
    // Logic `getEmployeeRanking` từ [cite: 2439-2443]
    getEmployeeRanking(reportData, key, direction = 'desc', count = 3, department = 'ALL') {
        if (!reportData || reportData.length === 0) return [];

        let filteredData = reportData;
        if (department !== 'ALL') {
            filteredData = reportData.filter(e => e.boPhan === department);
        }

        return [...filteredData]
            .filter(e => e[key] > 0)
            .sort((a, b) => direction === 'desc' ? (b[key] || 0) - (a[key] || 0) : (a[key] || 0) - (b[key] || 0))
            .slice(0, count);
    },

    // Logic `getEmployeesBelowTarget` từ [cite: 2443-2446]
    getEmployeesBelowTarget(reportData, dataKey, goalKey, department = 'ALL') {
        if (!reportData || reportData.length === 0) return [];

        let filteredData = reportData;
        if (department !== 'ALL') {
            filteredData = reportData.filter(e => e.boPhan === department);
        }

        return filteredData.filter(employee => {
            const value = employee[dataKey] || 0;
            const target = (employee.mucTieu?.[goalKey] || 0) / 100;
            return target > 0 && value < target;
        }).sort((a, b) => (b[dataKey] || 0) - (a[dataKey] || 0));
    },

    // Logic `formatEmployeeList` từ [cite: 2446-2451]
    // Sửa lỗi: Thay thế ui.formatPercentage v.v. bằng formatters.formatPercentage
    formatEmployeeList(employeeArray, valueKey, valueType = 'number') {
        if (!Array.isArray(employeeArray) || employeeArray.length === 0) {
            return " (không có)";
        }
        return "\n" + employeeArray.map((e, index) => {
            const value = e[valueKey];
            let formattedValue = '';
            if (valueType === 'percent') {
                formattedValue = formatters.formatPercentage(value);
            } else if (valueType === 'currency') {
                formattedValue = formatters.formatRevenue(value) + " tr";
            } else {
                formattedValue = formatters.formatNumberOrDash(value);
            }
            return `${index + 1}. ${formatters.getShortEmployeeName(e.hoTen, e.maNV)}: ${formattedValue} @${e.maNV}`;
        }).join("\n");
    },
    
    // ... (Toàn bộ logic `processComposerTemplate` [cite: 2451-2452] 
    //      cũng sẽ được dán vào đây, và các lệnh gọi `ui.format...` 
    //      bên trong nó cũng sẽ được đổi thành `formatters.format...`)
};

export const composerService = composerServices;