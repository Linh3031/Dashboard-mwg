// src/services/processing/parsers/thiduaStPaste.parser.js
// Giải mã dữ liệu "Thi đua siêu thị" dán trực tiếp từ trang BI (thay Excel bị công ty chặn xuất).
// Cấu trúc: nhiều khối "tên ngành hàng" liên tiếp, mỗi khối có dòng TỔNG (số liệu cả cụm — trích
// xuất sẵn nhưng chưa dùng) rồi tới danh sách siêu thị (tên kho, không có mã kho đi kèm — phải so
// khớp DSNV qua tên, dùng lại buildTenKhoToMaKhoMap).
import { get } from 'svelte/store';
import { luykeNameMappings } from '../../../stores.js';
import { helpers } from '../helpers.js';
import { buildTenKhoToMaKhoMap } from '../logic/biExcel.processor.js';
import { competitionProcessor } from '../logic/competition.processor.js';

const ANCHOR = 'Toàn công ty';
const STORE_PREFIX_REGEX = /^(ĐMS|TGD|ĐML|ĐMM)/;

function isNumericLine(line) {
    return /^\d+([.,]\d+)?$/.test(line.trim());
}

// Vài ngành hàng (VD "Camera") xen thêm dòng nhân viên cá nhân nổi bật giữa dòng TỔNG và các dòng
// siêu thị — không bắt đầu bằng ĐMS/TGD/ĐML/ĐMM nhưng dòng kế vẫn là dòng số liệu. Dùng để phân
// biệt với tên ngành hàng tiếp theo (dòng kế của tên ngành hàng luôn là dòng chữ, VD "DOANH THU...").
function looksLikeValueLineStart(line) {
    return /^-?\d/.test(line || '');
}

function parseNum(v) {
    return parseFloat(String(v ?? '').replace(/,/g, '').trim()) || 0;
}

function splitValueLine(line) {
    return line.includes('\t')
        ? line.split('\t').map(f => f.trim())
        : line.split(/\s+/).filter(f => f !== '');
}

export function parseThiDuaStPasted(text) {
    const empty = { results: [], unresolvedTenKho: [], clusterTotals: {}, programCount: 0, error: null };
    if (!text || !text.trim()) return empty;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');

    let i = lines.findIndex(l => l === ANCHOR);
    if (i === -1) {
        return { ...empty, error: `Không tìm thấy dòng "Toàn công ty" — dán thiếu phần đầu dữ liệu.` };
    }
    i++;
    while (i < lines.length && isNumericLine(lines[i])) i++;

    const tenKhoToMaKho = buildTenKhoToMaKhoMap();
    const results = [];
    const unresolvedTenKho = new Set();
    const clusterTotals = {};
    const programNames = [];

    while (i < lines.length) {
        const programName = lines[i]; i++;
        if (i >= lines.length) break;
        const headerLine = lines[i]; i++; // "DOANH THU..." hoặc "SỐ LƯỢNG..."
        if (i >= lines.length) break;
        i++; // bỏ dòng "TỔNG"
        if (i >= lines.length) break;
        const totalValueLine = lines[i]; i++;

        const isQuantity = headerLine.toUpperCase().includes('SỐ LƯỢNG');
        const prefix = isQuantity ? 'SL' : 'DT';
        const type = isQuantity ? 'soLuong' : 'doanhThu';
        const fullName = `${prefix} ${programName}`;
        programNames.push(fullName);

        const totalFields = splitValueLine(totalValueLine);
        clusterTotals[fullName] = {
            luyKe: parseNum(totalFields[0]),
            target: parseNum(totalFields[1]),
            hoanThanh: (totalFields[2] || '').trim(),
            hoanThanhDuKien: (totalFields[3] || '').trim()
        };

        while (i < lines.length) {
            if (STORE_PREFIX_REGEX.test(lines[i])) {
                const tenKho = lines[i]; i++;
                if (i >= lines.length) break;
                const valueLine = lines[i]; i++;
                const fields = splitValueLine(valueLine);
                const maKho = tenKhoToMaKho.get(helpers.normalizeCompetitionKey(tenKho));
                if (!maKho) { unresolvedTenKho.add(tenKho); continue; }

                results.push({
                    name: fullName,
                    type,
                    luyKe: parseNum(fields[0]),
                    target: parseNum(fields[1]),
                    hoanThanh: (fields[2] || '').trim(),
                    hoanThanhDuKien: (fields[3] || '').trim(),
                    maKho
                });
                continue;
            }

            if (looksLikeValueLineStart(lines[i + 1])) {
                // Dòng nhiễu (VD nhân viên cá nhân nổi bật) — bỏ qua cả cặp, tiếp tục dò kho.
                i += 2;
                continue;
            }

            break; // dòng kế không phải số liệu -> đây là tên ngành hàng tiếp theo
        }
    }

    if (programNames.length > 0) {
        const currentLuyke = get(luykeNameMappings) || {};
        const newLuyke = { ...currentLuyke };
        let hasChanges = false;
        programNames.forEach(name => {
            if (!newLuyke[name]) { newLuyke[name] = name; hasChanges = true; }
        });
        if (hasChanges) luykeNameMappings.set(newLuyke);
        competitionProcessor.autoLinkPrograms(results);
    }

    return {
        results,
        unresolvedTenKho: Array.from(unresolvedTenKho),
        clusterTotals,
        programCount: programNames.length,
        error: null
    };
}
