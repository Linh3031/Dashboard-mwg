// src/services/processing/parsers/gioCongPaste.parser.js
// Giải mã dữ liệu "Giờ công" dán trực tiếp từ trang timekeeping (thay cho Excel bị công ty chặn
// xuất). Mỗi dòng dán là 1 ca làm việc của 1 nhân viên, tách bằng tab, có dòng tiêu đề ở đầu.
// Dò cột theo TÊN cột (ma_sieu_thi, ma_nv, ten_nv, tong_gio_cong...) thay vì cứng vị trí cột, để
// chịu được nếu công ty đổi thứ tự/thêm cột khu vực.
import { get } from 'svelte/store';
import { danhSachNhanVien } from '../../../stores.js';

const DATE_CELL_REGEX = /^\d{4}\/\d{2}\/\d{2}$/;

// Vị trí cột mặc định đúng theo mẫu dữ liệu đã xác nhận, dùng khi không dò được dòng tiêu đề.
const DEFAULT_COLUMNS = { ngay: 0, thang: 1, ma_sieu_thi: 6, ma_nv: 10, ten_nv: 11, tong_gio_cong: 14 };

function parseNum(v) {
    return parseFloat(String(v ?? '').replace(/,/g, '').trim()) || 0;
}

function findColumnMap(lines) {
    const wanted = ['ngay', 'thang', 'ma_sieu_thi', 'ma_nv', 'ten_nv', 'tong_gio_cong'];
    for (const line of lines) {
        if (!line.includes('\t')) continue;
        const cells = line.split('\t').map(c => c.trim().toLowerCase());
        if (wanted.every(name => cells.includes(name))) {
            const map = {};
            wanted.forEach(name => { map[name] = cells.indexOf(name); });
            return map;
        }
    }
    return null;
}

export function parseGioCongPasted(text) {
    const empty = { results: [], unresolvedMaNV: [], error: null };
    if (!text || !text.trim()) return empty;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const columns = findColumnMap(lines) || DEFAULT_COLUMNS;

    const dsnv = get(danhSachNhanVien) || [];
    const validMaNV = new Set(dsnv.map(nv => String(nv.maNV || nv.ma_nv || '').trim()).filter(Boolean));

    const results = [];
    const unresolvedMaNV = new Set();

    for (const line of lines) {
        if (!line.includes('\t')) continue;
        const cells = line.split('\t').map(c => c.trim());
        if (!DATE_CELL_REGEX.test(cells[columns.ngay] || '')) continue;

        const maNV = String(cells[columns.ma_nv] || '').trim();
        if (!maNV) continue;

        if (validMaNV.size > 0 && !validMaNV.has(maNV)) {
            unresolvedMaNV.add(maNV);
            continue;
        }

        results.push({
            maKho: String(cells[columns.ma_sieu_thi] || '').trim(),
            ngay: cells[columns.ngay] || '',
            thang: cells[columns.thang] || '',
            maNV,
            hoTen: String(cells[columns.ten_nv] || '').trim(),
            tongGioCong: parseNum(cells[columns.tong_gio_cong])
        });
    }

    if (results.length === 0 && unresolvedMaNV.size === 0) {
        return { results: [], unresolvedMaNV: [], error: 'Không tìm thấy dòng dữ liệu hợp lệ. Kiểm tra lại dữ liệu đã dán.' };
    }

    return { results, unresolvedMaNV: Array.from(unresolvedMaNV), error: null };
}
