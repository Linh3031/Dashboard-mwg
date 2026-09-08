// src/services/processing/logic/biExcel.processor.js
// Dò mã kho theo "Tên Kho" (DSNV) và tạo hình dạng dữ liệu cuối cho 2 loại file không có cột mã
// kho: Thi đua ST (Excel) và Doanh thu BI. Dùng CHUNG cho cả lúc upload (fileHandler.js) lẫn lúc
// tự đồng bộ lại từ Cloud (syncHandler.js) — để 2 luồng không bao giờ lệch nhau nữa.
import { get } from 'svelte/store';
import { danhSachNhanVien, luykeNameMappings } from '../../../stores.js';
import { helpers } from '../helpers.js';
import { competitionProcessor } from './competition.processor.js';

export function buildTenKhoToMaKhoMap() {
    const currentDSNV = get(danhSachNhanVien) || [];
    const tenKhoToMaKho = new Map();
    currentDSNV.forEach(nv => {
        const maKhoNv = String(nv.maKho || '').trim();
        const tenKhoNv = String(nv.tenKho || '').trim();
        if (maKhoNv && tenKhoNv) {
            const key = helpers.normalizeCompetitionKey(tenKhoNv);
            if (!tenKhoToMaKho.has(key)) tenKhoToMaKho.set(key, maKhoNv);
        }
    });
    return tenKhoToMaKho;
}

export function resolveThiDuaStRows(normalizedData) {
    const tenKhoToMaKho = buildTenKhoToMaKhoMap();
    const results = [];
    const unresolvedTenKho = new Set();

    normalizedData.forEach(row => {
        const tenKhoRaw = String(row.donVi || '').trim();
        if (!tenKhoRaw) return;

        const maKhoResolved = tenKhoToMaKho.get(helpers.normalizeCompetitionKey(tenKhoRaw));
        if (!maKhoResolved) {
            unresolvedTenKho.add(tenKhoRaw);
            return;
        }

        const progName = String(row.chuongTrinh || '').trim();
        if (!progName) return;

        const loaiTdRaw = row.loaiTd;
        const loaiTd = (loaiTdRaw !== undefined && loaiTdRaw !== null && String(loaiTdRaw).trim() !== '')
            ? parseInt(loaiTdRaw, 10)
            : null;
        const isQty = helpers.isQuantityCompetitionType(loaiTd);
        const pctHtThang = parseFloat(row.pctHtThang) || 0;
        const pctDuBao = parseFloat(row.pctDuBao) || 0;

        results.push({
            name: progName,
            loaiTd: loaiTd,
            type: isQty ? 'soLuong' : 'doanhThu',
            luyKe: isQty ? (parseFloat(row.soLuong) || 0) : (parseFloat(row.doanhThu) || 0),
            target: parseFloat(row.target) || 0,
            hoanThanh: `${pctHtThang}%`,
            hoanThanhDuKien: `${pctDuBao}%`,
            maKho: maKhoResolved
        });
    });

    // Đăng ký tên chương trình mới + tự ghép với dữ liệu Thi đua NV, giống hệt lúc upload — để dữ
    // liệu tự đồng bộ lại từ Cloud cũng "Link Data Nhân Viên" được như lúc upload tay.
    if (results.length > 0) {
        const currentLuykeMappings = get(luykeNameMappings) || {};
        let hasNewLuykeMapping = false;
        results.forEach(item => {
            if (!currentLuykeMappings[item.name]) {
                currentLuykeMappings[item.name] = item.name;
                hasNewLuykeMapping = true;
            }
        });
        if (hasNewLuykeMapping) luykeNameMappings.set(currentLuykeMappings);
        competitionProcessor.autoLinkPrograms(results);
    }

    return { results, unresolvedTenKho };
}

export function resolveDoanhThuBiRows(normalizedData) {
    const tenKhoToMaKho = buildTenKhoToMaKhoMap();
    const results = [];
    const unresolvedTenKho = new Set();
    const goalUpdatesByKho = new Map();

    normalizedData.forEach(row => {
        const tenKhoRaw = String(row.tenDonVi || '').trim();
        if (!tenKhoRaw) return;

        const maKhoResolved = tenKhoToMaKho.get(helpers.normalizeCompetitionKey(tenKhoRaw));
        if (!maKhoResolved) {
            unresolvedTenKho.add(tenKhoRaw);
            return;
        }

        results.push({
            tenDonVi: tenKhoRaw,
            doanhThu: parseFloat(row.doanhThu) || 0,
            doanhThuQD: parseFloat(row.doanhThuQD) || 0,
            tb3Thang: parseFloat(row.tb3Thang) || 0,
            tb3ThangQD: parseFloat(row.tb3ThangQD) || 0,
            dtTraGop: parseFloat(row.dtTraGop) || 0,
            dtTraGopQD: parseFloat(row.dtTraGopQD) || 0,
            luyKeToiNgay: row.luyKeToiNgay || null,
            maKho: maKhoResolved
        });

        const targetThuc = parseFloat(row.target) || 0;
        const targetQD = parseFloat(row.targetQD) || 0;
        if (targetThuc > 0 || targetQD > 0) {
            goalUpdatesByKho.set(maKhoResolved, { doanhThuThuc: targetThuc, doanhThuQD: targetQD });
        }
    });

    return { results, unresolvedTenKho, goalUpdatesByKho };
}
