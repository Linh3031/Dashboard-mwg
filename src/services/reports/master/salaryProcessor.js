// src/services/reports/master/salaryProcessor.js
import { get } from 'svelte/store';
import {
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    employeeNameToMaNVMap
} from '../../../stores.js';
import { dataProcessing } from '../../dataProcessing.js';

export const salaryProcessor = {
    prepareSalaryData() {
        const $thuongNongData = get(thuongNongData) || [];
        const $employeeNameToMaNVMap = get(employeeNameToMaNVMap);
        const $thuongERPData = get(thuongERPData) || [];
        const $thuongNongDataThangTruoc = get(thuongNongDataThangTruoc) || [];
        const $thuongERPDataThangTruoc = get(thuongERPDataThangTruoc) || [];

        const thuongNongByMSNV = {};
        $thuongNongData.forEach(row => {
            const msnv = String(row.maNV || '').trim() || $employeeNameToMaNVMap.get(String(row.hoTen).toLowerCase());
            if(msnv) thuongNongByMSNV[msnv] = (thuongNongByMSNV[msnv]||0) + (parseFloat(String(row.diemThuong||0).replace(/,/g,''))||0);
        });

        const thuongNongThangTruocByMSNV = {};
        $thuongNongDataThangTruoc.forEach(row => {
            const msnv = String(row.maNV || '').trim() || $employeeNameToMaNVMap.get(String(row.hoTen).toLowerCase());
            if(msnv) thuongNongThangTruocByMSNV[msnv] = (thuongNongThangTruocByMSNV[msnv]||0) + (parseFloat(String(row.diemThuong||0).replace(/,/g,''))||0);
        });

        const gioCongByMSNV = dataProcessing.processGioCongData();

        return {
            thuongNongByMSNV,
            thuongNongThangTruocByMSNV,
            gioCongByMSNV,
            $thuongERPData,
            $thuongERPDataThangTruoc
        };
    },

    calculateEmployeeSalary(employee, salaryData) {
        const { 
            thuongNongByMSNV, thuongNongThangTruocByMSNV, gioCongByMSNV, 
            $thuongERPData, $thuongERPDataThangTruoc 
        } = salaryData;

        const gioCong = gioCongByMSNV[employee.maNV] || 0;
        const thuongNong = thuongNongByMSNV[employee.maNV] || 0;
        
        const erpEntry = $thuongERPData.find(e => e.name.includes(employee.hoTen));
        const thuongERP = erpEntry ? parseFloat(erpEntry.bonus.replace(/,/g, '')) : 0;
        const tongThuNhap = thuongNong + thuongERP;

        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        let thuNhapDuKien = 0;
        if (today.getDate() > 1) {
            thuNhapDuKien = (tongThuNhap / (today.getDate() - 1)) * daysInMonth;
        } else {
            thuNhapDuKien = tongThuNhap * daysInMonth;
        }

        const thuongNongThangTruoc = thuongNongThangTruocByMSNV[employee.maNV] || 0;
        const erpEntryThangTruoc = $thuongERPDataThangTruoc.find(e => e.name.includes(employee.hoTen));
        const thuongERPThangTruoc = erpEntryThangTruoc ? parseFloat(erpEntryThangTruoc.bonus.replace(/,/g, '')) : 0;
        const thuNhapThangTruoc = (thuongNongThangTruoc || 0) + thuongERPThangTruoc;
        const chenhLechThuNhap = thuNhapDuKien - thuNhapThangTruoc;

        return {
            gioCong, thuongNong, thuongERP, tongThuNhap, 
            thuNhapDuKien, thuNhapThangTruoc, chenhLechThuNhap
        };
    }
};