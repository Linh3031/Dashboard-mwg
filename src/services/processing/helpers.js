/* global XLSX */
import { get } from 'svelte/store';
import { config } from '../../config.js';
import { declarations, efficiencyConfig, quantityCompetitionTypeCodes } from '../../stores.js';

// [CODEGENESIS] Hàm vũ khí: Chuẩn hóa chuỗi (Xóa dấu tiếng Việt, viết thường, xóa khoảng trắng)
const normalizeStr = (str) => {
    if (!str) return '';
    return str.toString()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Xóa dấu
        .trim();
};

// [PHẪU THUẬT LOGIC]: Bóc tách ID - Dùng ID làm chìa khóa tuyệt đối an toàn
const extractKey = (str) => {
    if (!str) return 'unknown';
    const rawStr = str.toString().trim();
    const match = rawStr.match(/^(\d+)\s*[-–]/);
    if (match) {
        return match[1]; 
    }
    return normalizeStr(rawStr);
};

export const helpers = {
    findColumnName(header, aliases) {
        if (!header || !Array.isArray(header) || !aliases || !Array.isArray(aliases)) return null;
        
        const normalizedHeader = header.map(col => ({ original: col, norm: normalizeStr(col) }));
        
        for (const alias of aliases) {
            const normAlias = normalizeStr(alias);
            const found = normalizedHeader.find(h => h.norm === normAlias);
            if (found) {
                return found.original; 
            }
        }
        return null;
    },

    getHinhThucXuatTinhDoanhThu: () => {
        const declarationData = get(declarations).hinhThucXuat;
        if (declarationData) {
            return new Set(declarationData.split(/[,;\n]/).map(l => l.trim()).filter(Boolean));
        }
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU || []);
    },

    getHinhThucXuatTraGop: () => {
        const declarationData = get(declarations).hinhThucXuatGop;
        if (declarationData) {
            return new Set(declarationData.split(/[,;\n]/).map(l => l.trim()).filter(Boolean));
        }
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP || []);
    },

    getHeSoQuyDoi: () => {
        const heSoMap = {};
        
        const dynamicConfig = get(efficiencyConfig);
        if (dynamicConfig && dynamicConfig.length > 0) {
            dynamicConfig.forEach(item => {
                if (item.id && item.heSo !== undefined && item.heSo !== null) {
                    heSoMap[extractKey(item.id)] = parseFloat(item.heSo);
                }
            });
        }

        const declarationData = get(declarations).heSoQuyDoi;
        if (declarationData) {
            declarationData.split('\n').filter(l => l.trim()).forEach(line => {
                const lastCommaIndex = line.lastIndexOf(',');
                if (lastCommaIndex > -1) {
                    const rawKey = line.substring(0, lastCommaIndex);
                    const rawVal = line.substring(lastCommaIndex + 1);
                    
                    const safeKey = extractKey(rawKey);
                    const value = parseFloat(rawVal.trim().replace(',', '.')); 
                    
                    if (safeKey && !isNaN(value)) {
                         if (heSoMap[safeKey] === undefined) {
                             heSoMap[safeKey] = value;
                         }
                    }
                }
            });
        }

        return heSoMap;
    },

    // [CODEGENESIS v4.2]: Đa hình (Overload) - Đã gỡ bỏ console.warn theo yêu cầu
    getHeSoForCategory: (arg1, arg2, arg3) => {
        let nhomHangRaw, nganhHangRaw, mapHeSo;

        // KIỂM TRA ĐA HÌNH: Nếu file cũ gọi kiểu (nganhHang, mapHeSo) -> arg3 sẽ rỗng
        if (arg3 === undefined && typeof arg2 === 'object' && arg2 !== null) {
            nhomHangRaw = null; 
            nganhHangRaw = arg1;
            mapHeSo = arg2;
        } else {
            // Nếu gọi kiểu mới (nhomHang, nganhHang, mapHeSo)
            nhomHangRaw = arg1;
            nganhHangRaw = arg2;
            mapHeSo = arg3;
        }

        // Khóa bảo vệ cuối cùng: Ép kiểu tránh Crash toàn hệ thống
        mapHeSo = mapHeSo || {};

        const safeNhomKey = nhomHangRaw ? extractKey(nhomHangRaw) : 'unknown';
        const safeNganhKey = nganhHangRaw ? extractKey(nganhHangRaw) : 'unknown';

        // Ưu tiên 1: Tìm Nhóm con (Xét xem nhóm con có bị ghi đè Ngoại lệ không)
        if (safeNhomKey !== 'unknown' && mapHeSo[safeNhomKey] !== undefined) {
            return mapHeSo[safeNhomKey];
        }

        // Ưu tiên 2: Kế thừa (Nếu Nhóm con không có, lấy Hệ số của Ngành cha)
        if (safeNganhKey !== 'unknown' && mapHeSo[safeNganhKey] !== undefined) {
            return mapHeSo[safeNganhKey];
        }

        // Ưu tiên 3: Fallback ngầm định (Đã gỡ bỏ còi báo động)
        return 1;
    },

    cleanCompetitionName(name) {
        return name.replace(/thi đua doanh thu bán hàng|thi đua doanh thu|thi đua số lượng/gi, "").trim();
    },

    // [FIX] Chuẩn hoá tên chương trình thi đua NV để so khớp/gộp khi cùng 1 chương trình
    // bị lưu dưới nhiều cách viết hoa/thường khác nhau (VD: "Sim Tổng" vs "SIM TỔNG") do
    // dữ liệu từng được nhập bằng cả 2 cách (dán bảng và upload Excel) ở các thời điểm khác nhau.
    normalizeCompetitionKey(name) {
        return normalizeStr(name).replace(/\s+/g, ' ');
    },

    // [MỚI] Xác định 1 chương trình thi đua tính theo Số Lượng hay Doanh Thu, dựa vào mã
    // Loại TĐ (cột "LOẠI TĐ" trong file nguồn) đối chiếu với danh sách mã admin đã khai báo
    // là Số Lượng (quantityCompetitionTypeCodes) — mã nào không có trong danh sách thì mặc
    // định tính theo Doanh Thu.
    isQuantityCompetitionType(loaiTdCode) {
        const codes = get(quantityCompetitionTypeCodes) || [];
        return codes.map(Number).includes(Number(loaiTdCode));
    },

    // [FIX] Tính target thi đua/người cho ĐÚNG 1 kho. Trước đây các màn hình "Thi đua NV" duyệt
    // qua toàn bộ competitionData (nhiều kho trong 1 cụm) mà không lọc theo maKho, nên kho đọc
    // sau cùng ghi đè kho đọc trước và mọi nhân viên trong cụm bị gán chung 1 target sai — không
    // phải target của kho họ đang làm việc. Trả về map { tên chương trình NV đã chuẩn hoá: target/người }.
    computeCategoryTargetsForStore(competitionData, luykeNameMappings, maKho, employeeCountForKho, ratioPct = 100) {
        const result = {};
        const kho = String(maKho || '').trim();
        if (!kho || !employeeCountForKho || employeeCountForKho <= 0) return result;

        (competitionData || []).forEach(item => {
            if (String(item.maKho || '').trim() !== kho) return;

            const luykeMap = luykeNameMappings && luykeNameMappings[item.name];
            const linkedEmpProg = (typeof luykeMap === 'object' && luykeMap !== null) ? luykeMap.linkedEmpProgram : '';
            if (!linkedEmpProg) return;

            const rawTarget = (parseFloat(item.target) || 0) * (ratioPct / 100);
            const isQty = item.type === 'soLuong';
            const pTarget = isQty ? Math.ceil(rawTarget / employeeCountForKho) : Math.round(rawTarget / employeeCountForKho);
            result[helpers.normalizeCompetitionKey(linkedEmpProg)] = pTarget;
        });

        return result;
    },

    classifyInsurance: (productName) => {
        if (!productName || typeof productName !== 'string') return null;
        const name = productName.trim().toLowerCase();
        if (name.includes('bảo hành mở rộng')) return 'BHMR';
        if (name.includes('1 đổi 1')) return 'BH1d1';
        if (name.includes('khoản vay')) return 'BHKV';
        if (name.includes('rơi vỡ')) return 'BHRV';
        if (name.includes('samsung care+')) return 'BHSC';
        if (name.includes('ô tô') || name.includes('vật chất ô tô')) return 'BHOTO';
        if (name.includes('xe máy') || name.includes('xe moto')) return 'BHXM';
        if (name.includes('xã hội') || name.includes('y tế')) return 'BHYT';
        return null;
    },

    findHeaderAndProcess(sheet, requiredKeywords) {
        if (!sheet) return [];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        if (rows.length === 0) return [];

        let headerRowIndex = -1;
        let foundHeaders = [];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            const lowerCaseRow = row.map(cell => String(cell || '').trim().toLowerCase());

            const allKeywordsFound = requiredKeywords.every(keyword =>
                lowerCaseRow.some(cell => cell.includes(keyword))
            );

            if (allKeywordsFound) {
                headerRowIndex = i;
                foundHeaders = rows[i].map(cell => String(cell || '').trim());
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error(`Không tìm thấy dòng tiêu đề chứa đủ các từ khóa: ${requiredKeywords.join(', ')}.`);
        }

        const dataRows = rows.slice(headerRowIndex + 1);
        const jsonData = dataRows.map(row => {
            const obj = {};
            foundHeaders.forEach((header, index) => {
                if (header) {
                    const value = row[index];
                    const upperKey = header.toUpperCase();
                    if (upperKey.includes('KÊNH') || upperKey.includes('SIÊU THỊ') || upperKey.includes('NGÀNH HÀNG') || upperKey.includes('TỈNH') || upperKey.includes('BOSS')) {
                        obj[header] = value;
                    } else if (typeof value === 'string' && value.includes('%')) {
                        obj[header] = parseFloat(value.replace(/%|,/g, '')) / 100 || 0;
                    } else if (value !== null && value !== undefined) {
                        obj[header] = parseFloat(String(value).replace(/,/g, '')) || 0;
                    } else {
                        obj[header] = 0;
                    }
                }
            });
            return obj;
        }).filter(obj => {
            const supermarketKey = Object.keys(obj).find(k => k.toLowerCase().includes('siêu thị'));
            return supermarketKey && obj[supermarketKey];
        });

        return jsonData;
    }
};