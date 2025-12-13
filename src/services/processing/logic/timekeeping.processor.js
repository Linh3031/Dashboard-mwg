// src/services/processing/logic/timekeeping.processor.js
import { get } from 'svelte/store';
import { rawGioCongData, employeeNameToMaNVMap } from '../../../stores.js';

export const timekeepingProcessor = {
    // Xử lý dữ liệu giờ công
    processGioCongData() {
        const gioCongByMSNV = {};
        let currentMaNV = null;
        if (!get(rawGioCongData) || get(rawGioCongData).length === 0) return gioCongByMSNV;

        for (const row of get(rawGioCongData)) {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            
            // Tìm MSNV nếu file giờ công không có cột MSNV (dùng tên để map)
            let foundMaNV = maNV || get(employeeNameToMaNVMap).get(hoTen.toLowerCase()) || null;
            
            if (foundMaNV) currentMaNV = foundMaNV;

            if (currentMaNV && gioCongByMSNV[currentMaNV] === undefined) {
                gioCongByMSNV[currentMaNV] = 0;
            }

            const gioCongValue = parseFloat(String(row.tongGioCong || '0').replace(/,/g, '')) || 0;
            if (currentMaNV && gioCongValue > 0) {
                gioCongByMSNV[currentMaNV] += gioCongValue;
            }
        }
        return gioCongByMSNV;
    }
};