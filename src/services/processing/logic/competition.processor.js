// src/services/processing/logic/competition.processor.js
import { get } from 'svelte/store';
import {
    danhSachNhanVien,
    employeeMaNVMap,
    competitionNameMappings,
    luykeNameMappings,
    competitionData,
    debugInfo
} from '../../../stores.js';
import { helpers } from '../helpers.js';
import { normalizers } from '../normalizers.js';

// [AUTO-LINK] Chuẩn hoá tên chương trình để so khớp ST <-> NV: bỏ tiền tố DT/SL, bỏ dấu, thường hoá
const normalizeForMatch = (name) => {
    return String(name || '')
        .replace(/^(DT|SL)\s+/i, '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// [AUTO-LINK] Độ giống nhau giữa 2 chuỗi đã chuẩn hoá, theo tỉ lệ bigram trùng nhau (Dice coefficient), 0..1
const similarity = (a, b) => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const toBigrams = (s) => {
        const arr = [];
        for (let i = 0; i < s.length - 1; i++) arr.push(s.slice(i, i + 2));
        return arr;
    };
    const bigramsA = toBigrams(a);
    const bigramsB = toBigrams(b);
    if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

    const poolB = new Map();
    bigramsB.forEach(bg => poolB.set(bg, (poolB.get(bg) || 0) + 1));

    let matches = 0;
    bigramsA.forEach(bg => {
        const count = poolB.get(bg) || 0;
        if (count > 0) {
            matches++;
            poolB.set(bg, count - 1);
        }
    });
    return (2 * matches) / (bigramsA.length + bigramsB.length);
};

const AUTO_LINK_MATCH_THRESHOLD = 0.8;
const AUTO_LINK_ORDER_BONUS = 0.05;

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

        // [AUTO-LINK] NV vừa có dữ liệu mới -> thử ghép tự động với các chương trình ST chưa có link
        // Lưu ý: gọi qua tên module `competitionProcessor`, không dùng `this` — hàm này được re-export dạng
        // tham chiếu hàm trần qua processors.js/dataProcessing.js nên `this` không còn trỏ về object gốc.
        competitionProcessor.autoLinkPrograms();
    },

    // [AUTO-LINK] Tự động điền "Link Data Nhân Viên" cho chương trình ST dựa theo tên giống nhau bên NV.
    // Chỉ điền cho chương trình ST đang chưa có link (không bao giờ ghi đè link admin đã tự chọn).
    autoLinkPrograms(stItemsOverride) {
        const stItems = stItemsOverride || get(competitionData) || [];
        const empNames = Object.keys(get(competitionNameMappings) || {});
        if (stItems.length === 0 || empNames.length === 0) return;

        const normEmpNames = empNames.map(normalizeForMatch);
        const currentLuyke = get(luykeNameMappings) || {};
        const newLuyke = { ...currentLuyke };

        const usedEmpNames = new Set(
            Object.values(currentLuyke)
                .map(v => (typeof v === 'object' && v !== null) ? v.linkedEmpProgram : null)
                .filter(Boolean)
        );

        let hasChanges = false;

        stItems.forEach((stItem, stIndex) => {
            const stName = stItem.name;
            const existing = newLuyke[stName];
            const alreadyLinked = (typeof existing === 'object' && existing !== null) ? existing.linkedEmpProgram : null;
            if (alreadyLinked) return;

            const normSt = normalizeForMatch(stName);
            let bestIndex = -1;
            let bestScore = 0;

            empNames.forEach((empName, empIndex) => {
                if (usedEmpNames.has(empName)) return;
                let score = similarity(normSt, normEmpNames[empIndex]);
                if (score > 0 && stIndex === empIndex) score += AUTO_LINK_ORDER_BONUS;
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = empIndex;
                }
            });

            if (bestIndex !== -1 && bestScore >= AUTO_LINK_MATCH_THRESHOLD) {
                const matchedEmpName = empNames[bestIndex];
                const newObj = (typeof existing === 'object' && existing !== null) ? { ...existing } : { shortName: existing || stName, linkedEmpProgram: '' };
                newObj.linkedEmpProgram = matchedEmpName;
                newLuyke[stName] = newObj;
                usedEmpNames.add(matchedEmpName);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            console.log("[Processors] Auto-link: đã tự động ghép chương trình ST <-> NV theo tên giống nhau.");
            luykeNameMappings.set(newLuyke);
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
        // Gọi qua tên module `competitionProcessor`, không dùng `this` (xem giải thích ở updateCompetitionNameMappings)
        competitionProcessor.updateCompetitionNameMappings(mainHeaders);

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
                employee = { hoTen: row.name, maNV: msnv || 'N/A', boPhan: 'Nhân viên không tìm thấy', maKho: '' };
            }

            const employeeResult = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                boPhan: employee.boPhan,
                maKho: employee.maKho || employee.ma_kho || '',
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