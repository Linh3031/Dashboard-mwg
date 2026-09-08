// src/services/processing/parsers/biPaste.parser.js
// Giải mã dữ liệu dán trực tiếp từ trang BI (revenue-consolidated) khi công ty chặn xuất Excel.
// Mỗi lần dán có thể gồm nhiều siêu thị (nhiều dòng "mã kho - tên kho" liên tiếp), kết thúc bằng
// dòng "Tổng (N dòng)" chứa số tổng cụm — dùng để đối chiếu, KHÔNG đẩy vào kết quả (tránh cộng trùng).
import { get } from 'svelte/store';
import { danhSachNhanVien } from '../../../stores.js';

const STORE_LINE_REGEX = /^(\d+)\s*-\s*((?:ĐMS|TGD|ĐML|ĐMM)[^\t]*)/;
const TOTAL_LINE_REGEX = /^Tổng\s*\(\s*\d+\s*dòng\s*\)/i;

function parseNum(v) {
    return parseFloat(String(v ?? '').replace(/,/g, '').replace(/%/g, '').trim()) || 0;
}

// Gom tối đa 10 giá trị số ngay sau dòng "mã kho - tên kho" hoặc dòng "Tổng (...)", khi các số
// KHÔNG nằm ngay trên cùng dòng nhãn — mỗi số có thể nằm riêng 1 dòng, hoặc nhiều số/dòng.
function collectValuesFromFollowingLines(lines, startIdx) {
    let j = startIdx;
    let values = [];

    while (j < lines.length && values.length < 10 && !STORE_LINE_REGEX.test(lines[j]) && !TOTAL_LINE_REGEX.test(lines[j])) {
        const tokens = lines[j].includes('\t')
            ? lines[j].split('\t').map(t => t.trim()).filter(t => t !== '')
            : lines[j].split(/\s+/).filter(t => t !== '');
        values.push(...tokens);
        j++;
    }

    return { values: values.slice(0, 10), nextIdx: j };
}

// Lấy phần còn lại của dòng SAU nhãn (mã kho - tên kho, hoặc "Tổng (N dòng)") — trường hợp copy
// dán 10 số nằm ngay trên cùng dòng với nhãn (cách nhau bằng tab hoặc khoảng trắng).
function extractSameLineValues(line, labelLength) {
    const remainder = line.slice(labelLength).trim();
    if (!remainder) return null;
    const tokens = remainder.includes('\t')
        ? remainder.split('\t').map(t => t.trim()).filter(t => t !== '')
        : remainder.split(/\s+/).filter(t => t !== '');
    return tokens.length > 0 ? tokens.slice(0, 10) : null;
}

function buildRowFromValues(maKho, tenKho, values) {
    // Thứ tự đã xác nhận: SL, DT quy đổi, %Tỉ trọng, DT thực, Target(QĐ), %HT Target(QĐ),
    // TB 3 tháng(QĐ), %TT, DT trả góp, %Trả góp. Các cột %... chỉ dùng để đối chiếu, không lưu lại
    // (KPI hiển thị tự tính lại từ số liệu thô để tránh 2 nguồn sự thật lệch nhau).
    return {
        tenDonVi: tenKho,
        maKho,
        soLuong: parseNum(values[0]),
        doanhThuQD: parseNum(values[1]),
        doanhThu: parseNum(values[3]),
        targetQD: parseNum(values[4]),
        tb3ThangQD: parseNum(values[6]),
        dtTraGop: parseNum(values[8])
    };
}

export function parseDoanhThuBiPasted(text) {
    if (!text || !text.trim()) return { results: [], unresolvedMaKho: [], totalMismatch: false };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const dsnv = get(danhSachNhanVien) || [];
    const validMaKho = new Set(dsnv.map(nv => String(nv.maKho || '').trim()).filter(Boolean));

    const results = [];
    const unresolvedMaKho = new Set();
    let totalMismatch = false;
    let groupStart = 0;

    let i = 0;
    while (i < lines.length) {
        const storeMatch = lines[i].match(STORE_LINE_REGEX);
        if (storeMatch) {
            const maKho = storeMatch[1].trim();
            const tenKho = storeMatch[2].trim();

            let values = extractSameLineValues(lines[i], storeMatch[0].length);
            let nextIdx;
            if (values) {
                nextIdx = i + 1;
            } else {
                ({ values, nextIdx } = collectValuesFromFollowingLines(lines, i + 1));
            }

            if (values.length >= 9) {
                if (validMaKho.size > 0 && !validMaKho.has(maKho)) {
                    unresolvedMaKho.add(maKho);
                } else {
                    results.push(buildRowFromValues(maKho, tenKho, values));
                }
            }
            i = nextIdx;
            continue;
        }

        const totalMatch = lines[i].match(TOTAL_LINE_REGEX);
        if (totalMatch) {
            let values = extractSameLineValues(lines[i], totalMatch[0].length);
            let nextIdx;
            if (values) {
                nextIdx = i + 1;
            } else {
                ({ values, nextIdx } = collectValuesFromFollowingLines(lines, i + 1));
            }

            if (values.length >= 9) {
                const groupRows = results.slice(groupStart);
                const sumDtQd = groupRows.reduce((s, r) => s + r.doanhThuQD, 0);
                const sumDt = groupRows.reduce((s, r) => s + r.doanhThu, 0);
                const sumTraGop = groupRows.reduce((s, r) => s + r.dtTraGop, 0);
                const totalDtQd = parseNum(values[1]);
                const totalDt = parseNum(values[3]);
                const totalTraGop = parseNum(values[8]);
                const TOL = 1; // sai số làm tròn (đơn vị triệu đồng)
                if (Math.abs(sumDtQd - totalDtQd) > TOL || Math.abs(sumDt - totalDt) > TOL || Math.abs(sumTraGop - totalTraGop) > TOL) {
                    totalMismatch = true;
                }
            }
            groupStart = results.length;
            i = nextIdx;
            continue;
        }

        i++;
    }

    return { results, unresolvedMaKho: Array.from(unresolvedMaKho), totalMismatch };
}
