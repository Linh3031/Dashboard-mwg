/* global XLSX */
import { get } from 'svelte/store';
import { config } from '../../config.js';
// [FIX] Import thêm efficiencyConfig
import { declarations, efficiencyConfig } from '../../stores.js';

// [CODEGENESIS] Hàm vũ khí: Chuẩn hóa chuỗi (Xóa dấu tiếng Việt, viết thường, xóa khoảng trắng)
const normalizeStr = (str) => {
    if (!str) return '';
    return str.toString()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Xóa dấu
        .trim();
};

export const helpers = {
    findColumnName(header, aliases) {
        for (const colName of header) {
            const processedColName = normalizeStr(colName);
            // Chuẩn hóa luôn cả aliases để so sánh an toàn
            if (aliases.map(a => normalizeStr(a)).includes(processedColName)) {
                return colName;
            }
        }
        return null;
    },

    getHinhThucXuatTinhDoanhThu: () => {
        const declarationData = get(declarations).hinhThucXuat;
        if (declarationData) {
            // [HOTFIX] Chỉ cắt bằng phẩy/xuống dòng và trim(). Tuyệt đối không dùng normalizeStr ở đây để giữ nguyên Hoa/Thường.
            return new Set(declarationData.split(/[,;\n]/).map(l => l.trim()).filter(Boolean));
        }
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU || []);
    },

    getHinhThucXuatTraGop: () => {
        const declarationData = get(declarations).hinhThucXuatGop;
        if (declarationData) {
            // [HOTFIX] Chỉ cắt bằng phẩy/xuống dòng và trim()
            return new Set(declarationData.split(/[,;\n]/).map(l => l.trim()).filter(Boolean));
        }
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP || []);
    },

    getHeSoQuyDoi: () => {
        const heSoMap = {};
        let sourceUsed = 'DEFAULT'; 

        // ƯU TIÊN 1: Lấy từ Cấu hình Hiệu quả (Giao diện Admin mới)
        const dynamicConfig = get(efficiencyConfig);
        if (dynamicConfig && dynamicConfig.length > 0) {
            sourceUsed = 'ADMIN_CONFIG_STORE';
            dynamicConfig.forEach(item => {
                if (item.id && item.heSo !== undefined && item.heSo !== null) {
                    heSoMap[normalizeStr(item.id)] = parseFloat(item.heSo);
                }
            });
        }

        // ƯU TIÊN 2: Lấy từ Khai báo Text (Cũ - nếu Priority 1 không đủ hoặc rỗng)
        const declarationData = get(declarations).heSoQuyDoi;
        if (declarationData) {
            declarationData.split('\n').filter(l => l.trim()).forEach(line => {
                // [VÁ LỖI] Dùng lastIndexOf để tránh lỗi khi tên Ngành Hàng có chứa dấu phẩy
                const lastCommaIndex = line.lastIndexOf(',');
                if (lastCommaIndex > -1) {
                    const rawKey = line.substring(0, lastCommaIndex);
                    const rawVal = line.substring(lastCommaIndex + 1);
                    
                    const cleanKey = normalizeStr(rawKey);
                    const value = parseFloat(rawVal.trim());
                    
                    if (cleanKey && !isNaN(value)) {
                         if (heSoMap[cleanKey] === undefined) {
                             heSoMap[cleanKey] = value;
                         }
                    }
                }
            });
        }

        // ƯU TIÊN 3: Mặc định (Fallback cuối cùng)
        const defaultData = config.DEFAULT_DATA.HE_SO_QUY_DOI || {};
        Object.entries(defaultData).forEach(([key, value]) => {
             const cleanKey = normalizeStr(key);
             if (heSoMap[cleanKey] === undefined) {
                 heSoMap[cleanKey] = value;
             }
        });

        // --- [DEBUG LOG THEO YÊU CẦU] ---
        if (Object.keys(heSoMap).length > 0) {
            // console.log(`[Helpers] Đã nạp ${Object.keys(heSoMap).length} hệ số quy đổi. Nguồn chính: ${sourceUsed}`);
        }
        // -------------------------------

        return heSoMap;
    },

    // [CODEGENESIS] Thêm hàm trung gian giúp file báo cáo gọi an toàn (áp dụng Fuzzy Match)
    getHeSoForCategory: (nhomHangRaw, mapHeSo) => {
        const cleanNhomHang = normalizeStr(nhomHangRaw);
        return mapHeSo[cleanNhomHang] !== undefined ? mapHeSo[cleanNhomHang] : 1;
    },

    cleanCompetitionName(name) {
        return name.replace(/thi đua doanh thu bán hàng|thi đua doanh thu|thi đua số lượng/gi, "").trim();
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