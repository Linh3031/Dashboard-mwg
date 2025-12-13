// src/services/processing/logic/competition.processor.js
import { get } from 'svelte/store';
import { 
    danhSachNhanVien, 
    employeeMaNVMap, 
    competitionNameMappings, 
    debugInfo 
} from '../../../stores.js';
import { helpers } from '../helpers.js';
import { normalizers } from '../normalizers.js';

export const competitionProcessor = {
    // 1. Kiểm tra logic lọc (Debug)
    debugCompetitionFiltering(rawTestData) {
        if (!rawTestData || rawTestData.length === 0) return [];

        const { normalizedData } = normalizers.normalizeData(rawTestData, 'ycx');
        if (normalizedData.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = helpers.getHinhThucXuatTinhDoanhThu();
        const debugResults = normalizedData.map(row => {
            const checks = {
                isDoanhThuHTX: hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat),
                isThuTien: (row.trangThaiThuTien || "").trim() === 'Đã thu',
                isChuaHuy: (row.trangThaiHuy || "").trim() === 'Chưa hủy',
                isChuaTra: (row.tinhTrangTra || "").trim() === 'Chưa trả',
                isDaXuat: (row.trangThaiXuat || "").trim() === 'Đã xuất'
            };
            const isOverallValid = checks.isDoanhThuHTX && checks.isThuTien && checks.isChuaHuy && checks.isChuaTra && checks.isDaXuat;
            return { rowData: row, checks: checks, isOverallValid: isOverallValid };
        });
        return debugResults;
    },

    // 2. Cập nhật mapping tên thi đua
    updateCompetitionNameMappings(mainHeaders) {
        if (!mainHeaders || mainHeaders.length === 0) return;
        
        const oldMappings = get(competitionNameMappings) || {};
        const newMappings = { ...oldMappings };
        let hasChanges = false;

        mainHeaders.forEach(originalName => {
            // Chỉ thêm nếu tên này chưa tồn tại trong mapping
            if (!newMappings.hasOwnProperty(originalName)) {
                // [YÊU CẦU] Mặc định điền tên rút gọn = tên gốc
                newMappings[originalName] = originalName; 
                hasChanges = true;
            }
        });

        if (hasChanges) {
            console.log("[Processors] Phát hiện tên thi đua mới, cập nhật store mapping.");
            competitionNameMappings.set(newMappings);
        }
    },

    // 3. Xử lý dữ liệu thi đua nhân viên (Core Logic)
    processThiDuaNhanVienData(parsedData, luykeCompetitionData) {
        const { mainHeaders, subHeaders, dataRows } = parsedData;
        const newDebugInfo = { required: [], found: [], status: 'Đang xử lý...' };
        
        const $danhSachNhanVien = get(danhSachNhanVien);
        if ($danhSachNhanVien.length === 0) {
            newDebugInfo.status = 'Lỗi: Danh sách nhân viên (DSNV) chưa được tải lên.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return [];
        }
        if (mainHeaders.length === 0 || dataRows.length === 0 || subHeaders.length === 0) {
            newDebugInfo.status = 'Lỗi: Dữ liệu dán vào không hợp lệ.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return [];
        }

        // [QUAN TRỌNG] Gọi hàm cập nhật mapping ngay khi xử lý dữ liệu
        this.updateCompetitionNameMappings(mainHeaders);

        const nameMappings = get(competitionNameMappings) || {};
        const competitionTargets = (luykeCompetitionData || []).map(comp => ({
            ...comp,
            cleanedName: helpers.cleanCompetitionName(comp.name)
        }));
        
        const finalReport = [];
        const totalEmployeesInDSNV = $danhSachNhanVien.length;
        const $employeeMaNVMap = get(employeeMaNVMap);

        dataRows.forEach(row => {
            const nameParts = row.name.split(' - ');
            const msnv = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : null;

            let employee;
            if (msnv) {
                employee = $employeeMaNVMap.get(msnv);
            }

            if (!employee) {
                employee = { hoTen: row.name, maNV: msnv || 'N/A', boPhan: 'Nhân viên không tìm thấy' };
            }

            const employeeResult = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                boPhan: employee.boPhan,
                completedCount: 0,
                totalCompetitions: mainHeaders.length,
                competitions: []
            };

            for (let i = 0; i < mainHeaders.length; i++) {
                const originalName = mainHeaders[i];
                const loaiSoLieu = subHeaders[i];
                
                // [YÊU CẦU] Lấy tên rút gọn từ mapping, fallback về tên gốc
                const shortName = nameMappings[originalName] || originalName;
                
                const cleanedName = helpers.cleanCompetitionName(originalName);
                const matchedTarget = competitionTargets.find(t => t.cleanedName === cleanedName);
                const groupTarget = matchedTarget ? matchedTarget.target : 0;
                const individualTarget = totalEmployeesInDSNV > 0 ? groupTarget / totalEmployeesInDSNV : 0;

                const giaTri = parseFloat(String(row.values[i] || '0').replace(/,/g, '')) || 0;
                const actualSales = giaTri;
                const percentExpected = individualTarget > 0 ? actualSales / individualTarget : (actualSales > 0 ? Infinity : 0);
                
                if (percentExpected >= 1) employeeResult.completedCount++;

                employeeResult.competitions.push({
                    tenNganhHang: shortName, // Dùng tên rút gọn cho hiển thị
                    tenGoc: originalName,    // Giữ tên gốc để đối chiếu
                    loaiSoLieu: loaiSoLieu,
                    giaTri: giaTri,
                    thucHien: actualSales,
                    mucTieu: individualTarget,
                    percentExpected: percentExpected,
                });
            }

            employeeResult.completionRate = employeeResult.totalCompetitions > 0 ? employeeResult.completedCount / employeeResult.totalCompetitions : 0;
            finalReport.push(employeeResult);
        });

        newDebugInfo.status = `Thành công: Đã xử lý báo cáo cho ${finalReport.length} nhân viên.`;
        debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
        return finalReport;
    }
};