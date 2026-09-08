// src/services/processing/parsers/thiduaNvPaste.parser.js
// Giải mã dữ liệu "Thi đua nhân viên" dán trực tiếp từ trang BI (thay cho Excel bị công ty chặn
// xuất). Cấu trúc: nhiều khối "tên ngành hàng" liên tiếp, mỗi khối liệt kê các dòng
// "MSNV - Họ tên" + dòng số liệu ngay bên dưới. Dữ liệu dán KHÔNG có mã kho — phải so khớp MSNV
// với DSNV để biết nhân viên thuộc kho nào, và đối chiếu với `targetKho` (kho của ô đang dán).
import { get } from 'svelte/store';
import { danhSachNhanVien } from '../../../stores.js';
import { competitionProcessor } from '../logic/competition.processor.js';

const ANCHOR = 'Toàn công ty';
const EMP_LINE_REGEX = /^(\S+)\s*-\s*(.+)$/;

function isNumericLine(line) {
    return /^\d+([.,]\d+)?$/.test(line.trim());
}

// Dòng số liệu luôn bắt đầu bằng số (hoặc dấu -), khác với dòng tiêu đề cột ("DOANH THU...")
// hay tên ngành hàng có dấu "-" bên trong (VD "Cáp - Sạc") — dùng để phân biệt dòng
// "MSNV - Họ tên" thật với tên ngành hàng trùng cấu trúc "X - Y".
function looksLikeValueLineStart(line) {
    return /^-?\d/.test(line || '');
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

function parseNum(v) {
    return parseFloat(String(v ?? '').replace(/,/g, '').trim()) || 0;
}

function splitValueLine(line) {
    return line.includes('\t')
        ? line.split('\t').map(f => f.trim())
        : line.split(/\s+/).filter(f => f !== '');
}

export function parseThiDuaNvPasted(text, targetKho) {
    const empty = { results: [], unresolvedMaNV: [], wrongKhoEmployees: [], programCount: 0, employeeCount: 0, error: null };
    if (!text || !text.trim()) return empty;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');

    let i = lines.findIndex(l => l === ANCHOR);
    if (i === -1) {
        return { ...empty, error: `Không tìm thấy dòng "Toàn công ty" — dán thiếu phần đầu dữ liệu.` };
    }
    i++;
    while (i < lines.length && isNumericLine(lines[i])) i++;

    const byMaNV = new Map(); // maNV -> { hoTen, competitions: [] }
    const programNames = [];

    while (i < lines.length) {
        const programName = lines[i];
        i++;
        if (i >= lines.length) break;
        const headerLine = lines[i]; i++; // dòng tiêu đề cột: "DOANH THU..." hoặc "SỐ LƯỢNG..."
        if (i >= lines.length) break;
        i++; // bỏ dòng "TỔNG"
        if (i >= lines.length) break;
        i++; // bỏ dòng số liệu tổng ngành hàng (toàn công ty, không lấy)

        const isQuantity = headerLine.toUpperCase().includes('SỐ LƯỢNG');
        const loaiTd = isQuantity ? 2 : null; // 2 nằm trong quantityCompetitionTypeCodes mặc định
        programNames.push(programName);

        while (i < lines.length) {
            const empMatch = lines[i].match(EMP_LINE_REGEX);
            if (!empMatch || !looksLikeValueLineStart(lines[i + 1])) break;

            const maNV = empMatch[1].trim();
            const hoTen = empMatch[2].trim();
            i++;
            const valueLine = lines[i]; i++;
            const fields = splitValueLine(valueLine);
            const value = round1(parseNum(fields[0]));
            const hang = parseInt(fields[1], 10) || 0;

            if (!byMaNV.has(maNV)) byMaNV.set(maNV, { hoTen, competitions: [] });
            byMaNV.get(maNV).competitions.push({
                tenGoc: programName,
                loaiTd,
                doanhThu: isQuantity ? 0 : value,
                soLuong: isQuantity ? value : 0,
                hang
            });
        }
    }

    if (programNames.length > 0) {
        competitionProcessor.updateCompetitionNameMappings(programNames);
    }

    const dsnv = get(danhSachNhanVien) || [];
    const dsnvByMaNV = new Map();
    dsnv.forEach(nv => {
        const code = String(nv.maNV || nv.ma_nv || '').trim();
        if (code) {
            dsnvByMaNV.set(code, {
                maKho: String(nv.maKho || nv.ma_kho || '').trim(),
                hoTen: nv.hoTen || nv.ho_ten || ''
            });
        }
    });

    const results = [];
    const unresolvedMaNV = [];
    const wrongKhoEmployees = [];
    const targetKhoStr = String(targetKho || '').trim();

    byMaNV.forEach((emp, maNV) => {
        const dsnvInfo = dsnvByMaNV.get(maNV);
        if (!dsnvInfo) {
            unresolvedMaNV.push(maNV);
            return;
        }
        if (targetKhoStr && dsnvInfo.maKho !== targetKhoStr) {
            wrongKhoEmployees.push({ maNV, hoTen: dsnvInfo.hoTen || emp.hoTen, actualKho: dsnvInfo.maKho });
            return;
        }
        results.push({ maNV, maKho: dsnvInfo.maKho, competitions: emp.competitions });
    });

    return {
        results,
        unresolvedMaNV,
        wrongKhoEmployees,
        programCount: programNames.length,
        employeeCount: results.length,
        error: null
    };
}
