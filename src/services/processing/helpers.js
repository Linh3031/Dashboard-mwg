/* global XLSX */
import { get } from 'svelte/store';
import { config } from '../../config.js';
import { declarations, efficiencyConfig } from '../../stores.js';

const normalizeStr = (str) => {
    if (!str) return '';
    return str.toString()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .trim();
};

const extractKey = (str) => {
    if (!str) return 'unknown';
    const rawStr = str.toString().trim();
    const match = rawStr.match(/^(\d+)\s*[-–]/);
    if (match) return match[1]; 
    return normalizeStr(rawStr);
};

export const helpers = {
    findColumnName(header, aliases) {
        if (!header || !Array.isArray(header) || !aliases || !Array.isArray(aliases)) return null;
        const normalizedHeader = header.map(col => ({ original: col, norm: normalizeStr(col) }));
        for (const alias of aliases) {
            const normAlias = normalizeStr(alias);
            const found = normalizedHeader.find(h => h.norm === normAlias);
            if (found) return found.original; 
        }
        return null;
    },

    // --- [PHẪU THUẬT LOGIC]: ĐỔI TỪ KIỂU SET SANG KIỂU MAP ĐỂ LƯU HỆ SỐ ---
    getHinhThucXuatTinhDoanhThu: () => {
        const declarationData = get(declarations).hinhThucXuat;
        const map = new Map();
        if (declarationData) {
            declarationData.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const lastComma = trimmed.lastIndexOf(',');
                if (lastComma > -1) {
                    const name = trimmed.substring(0, lastComma).trim();
                    const heSo = parseFloat(trimmed.substring(lastComma + 1).trim().replace(',', '.')) || 0;
                    map.set(name, heSo);
                } else {
                    map.set(trimmed, 0); // Mặc định hệ số cộng thêm là 0
                }
            });
        }
        return map;
    },

    getHinhThucXuatTraGop: () => {
        const declarationData = get(declarations).hinhThucXuatGop;
        const map = new Map();
        if (declarationData) {
            declarationData.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const lastComma = trimmed.lastIndexOf(',');
                if (lastComma > -1) {
                    const name = trimmed.substring(0, lastComma).trim();
                    const heSo = parseFloat(trimmed.substring(lastComma + 1).trim().replace(',', '.')) || 0;
                    map.set(name, heSo);
                } else {
                    map.set(trimmed, 0.3); // Mặc định fallback là 0.3 nếu data cũ chưa có cấu trúc dấu phẩy
                }
            });
        }
        return map;
    },
    // ----------------------------------------------------------------------

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
                         if (heSoMap[safeKey] === undefined) heSoMap[safeKey] = value;
                    }
                }
            });
        }
        return heSoMap;
    },

    getHeSoForCategory: (nganhHangRaw, mapHeSo) => {
        const safeKey = extractKey(nganhHangRaw);
        return mapHeSo[safeKey] !== undefined ? mapHeSo[safeKey] : 1;
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