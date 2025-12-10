import { competitionData, debugInfo } from '../../stores.js';
import { helpers } from './helpers.js';

export const parsers = {
    processThuongERP: (pastedText) => {
        if (!pastedText || !pastedText.trim()) return [];
        const lines = pastedText.trim().split('\n');
        const results = [];
        const regex = /(ĐML_|TGD|ĐMM|ĐMS).*?(BP .*?)(?:Nhân Viên|Trưởng Ca)(.*?)([\d,]+)$/;
        lines.forEach(line => {
            const match = line.replace(/\s+/g, ' ').match(regex);
            if (match) results.push({ name: match[3].trim(), bonus: match[4].trim() });
        });
        return results;
    },

    parseLuyKePastedData: (text) => {
        const defaults = {
            mainKpis: {},
            comparisonData: { value: 0, percentage: 'N/A' },
            luotKhachData: { value: 0, percentage: 'N/A' },
            dtDuKien: 0, dtqdDuKien: 0, dtTraCham: 0, tyLeTraCham: 0 
        };
        if (!text) return defaults;

        const allLines = text.split('\n').map(line => line.trim());
        const textContent = allLines.join(' ');

        const patterns = {
            'Thực hiện DT thực': /DTLK\s+([\d,.]+)/,
            'Thực hiện DTQĐ': /DTQĐ\s+([\d,.]+)/,
            '% HT Target Dự Kiến (QĐ)': /% HT Target Dự Kiến \(QĐ\)\s+([\d.]+%?)/,
        };

        for (const [key, regex] of Object.entries(patterns)) {
            const match = textContent.match(regex);
            if (match && match[1]) {
                defaults.mainKpis[key] = match[1];
            }
        }

        const findValueAfterKeyword = (lines, keyword, isQd = false) => {
            let keywordRegex;
            if (isQd) {
                keywordRegex = new RegExp(keyword.replace('(', '\\(').replace(')', '\\)'));
            } else {
                keywordRegex = new RegExp(`^${keyword}$`);
            }

            const index = lines.findIndex(line => keywordRegex.test(line) && !/lượt khách/i.test(line));
            if (index !== -1 && index + 1 < lines.length) {
                return parseFloat(lines[index + 1].replace(/,/g, '').replace(/%/g, '')) || 0;
            }
            return 0;
        };

        defaults.dtDuKien = findValueAfterKeyword(allLines, "DT Dự Kiến");
        defaults.dtqdDuKien = findValueAfterKeyword(allLines, "DT Dự Kiến (QĐ)", true);
        defaults.dtTraCham = findValueAfterKeyword(allLines, "DT Siêu thị");
        defaults.tyLeTraCham = findValueAfterKeyword(allLines, "Tỷ Trọng Trả Góp");

        const dtckIndex = allLines.findIndex(line => line.includes('DTCK Tháng'));
        if (dtckIndex !== -1 && dtckIndex + 1 < allLines.length) {
            const valueLine = allLines[dtckIndex + 1];
            const values = valueLine.split(/\s+/);
            if (values.length >= 2) {
                defaults.comparisonData = {
                    value: parseFloat(values[0].replace(/,/g, '')) || 0,
                    percentage: values[1] || 'N/A'
                };
            }
        }

        const luotKhachIndex = allLines.findIndex(line => line.includes('Lượt Khách CK Tháng'));
        if (luotKhachIndex !== -1 && luotKhachIndex + 1 < allLines.length) {
            const valueLine = allLines[luotKhachIndex + 1];
            const values = valueLine.split(/\s+/);
            if (values.length >= 2) {
                defaults.luotKhachData = {
                    value: parseFloat(values[0].replace(/,/g, '')) || 0,
                    percentage: values[1] || 'N/A'
                };
            }
        }

        return defaults;
    },

    parseCompetitionDataFromLuyKe: (text) => {
        if (!text || !text.trim()) return [];
        const lines = text.split('\n').map(l => l.trim());
        const results = [];
        let currentCompetition = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().startsWith('thi đua')) {
                if (currentCompetition) results.push(currentCompetition);
                currentCompetition = {
                    name: line.replace("Thi đua doanh thu", "DT").replace("Thi đua số lượng", "SL"),
                    type: line.toLowerCase().includes('doanh thu') ? 'doanhThu' : 'soLuong',
                    luyKe: 0, target: 0, hoanThanh: '0%'
                };
            } else if (currentCompetition) {
                if (line.startsWith('DTLK') || line.startsWith('SLLK') || line.startsWith('DTQĐ')) {
                     if (i + 1 < lines.length) {
                         currentCompetition.luyKe = parseFloat(lines[i + 1].replace(/,/g, '')) || 0;
                    }
                } else if (line.startsWith('Target')) {
                    if (i + 1 < lines.length) {
                        currentCompetition.target = parseFloat(lines[i + 1].replace(/,/g, '')) || 0;
                    }
                } else if (line.startsWith('% HT Dự Kiến')) {
                    if (i + 1 < lines.length) {
                         currentCompetition.hoanThanh = lines[i + 1] || '0%';
                    }
                }
            }
        }
        if (currentCompetition) results.push(currentCompetition);

        competitionData.set(results);
        return results;
    },

    parsePastedThiDuaTableData(rawText) {
        const newDebugInfo = { required: [], found: [], status: 'Bắt đầu phân tích...' };

        if (!rawText || !rawText.trim()) {
            newDebugInfo.status = 'Lỗi: Dữ liệu dán vào rỗng.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: newDebugInfo.status, mainHeaders: [], subHeaders: [], dataRows: [] };
        }

        const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const splitRegex = /\s{2,}|\t/; 
        const numberCheckRegex = /^-?[\d,.]+$/;

        const mainHeaderStartIndex = lines.findIndex(line => line.includes('Phòng ban'));
        const subHeaderStartIndex = lines.findIndex(line => line.startsWith('DTLK') || line.startsWith('SLLK') || line.startsWith('DTQĐ'));
        
        let dataEndIndex = lines.findIndex(line => line.includes('Hỗ trợ BI'));
        if (dataEndIndex === -1) {
            dataEndIndex = lines.length;
        }

        const dataRowsStartIndex = lines.findIndex((line, index) => {
            if (index <= subHeaderStartIndex) return false;
            const parts = line.split(splitRegex).map(p => p.trim());
            const firstPart = parts[0] || "";

            if (firstPart.startsWith('Tổng') || firstPart.startsWith('BP ') || firstPart.startsWith('DTLK') || firstPart.startsWith('SLLK') || firstPart.startsWith('DTQĐ')) {
               return false;
            }
            return parts.length > 1 && numberCheckRegex.test(parts[1]);
        });

        if (mainHeaderStartIndex === -1 || subHeaderStartIndex === -1 || dataRowsStartIndex === -1) {
            let error = "Dữ liệu không hợp lệ thi đua ngành hàng theo nhân viên, vui lòng kiểm tra lại";
            newDebugInfo.status = error;
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: error, mainHeaders: [], subHeaders: [], dataRows: [] };
        }
        
        const mainHeaderLines = lines.slice(mainHeaderStartIndex + 1, subHeaderStartIndex);
        const mainHeaderString = mainHeaderLines.join('\t');
        const mainHeaders = mainHeaderString.split(splitRegex).filter(Boolean);
        newDebugInfo.found.push({ name: 'Tiêu đề chính (Ngành hàng)', value: `${mainHeaders.length} mục`, status: mainHeaders.length > 0 });

        const subHeaderLines = lines.slice(subHeaderStartIndex, dataRowsStartIndex);
        const subHeaderString = subHeaderLines.join('\t');
        const subHeaders = subHeaderString.split(/\s+/).filter(Boolean);
        newDebugInfo.found.push({ name: 'Tiêu đề phụ (SLLK/DTQĐ)', value: `${subHeaders.length} mục`, status: subHeaders.length > 0 });

        const potentialDataLines = lines.slice(dataRowsStartIndex, dataEndIndex);
        const dataRows = [];
        
        for (const line of potentialDataLines) {
            const parts = line.split(splitRegex).map(p => p.trim());
            const firstPart = parts[0] || "";

            if (firstPart.startsWith('Tổng') || firstPart.startsWith('BP ')) {
                continue;
            }

            if (parts.length > 1 && numberCheckRegex.test(parts[1])) {
                dataRows.push({
                    name: firstPart,
                    values: parts.slice(1)
                });
            }
        }
        newDebugInfo.found.push({ name: 'Dòng dữ liệu nhân viên', value: `${dataRows.length} dòng`, status: dataRows.length > 0 });

        if (mainHeaders.length === 0 || subHeaders.length === 0 || dataRows.length === 0) {
            newDebugInfo.status = 'Lỗi: Không thể phân tích dữ liệu. Thiếu Tiêu đề chính, Tiêu đề phụ, hoặc Dòng dữ liệu (sau khi lọc).';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: newDebugInfo.status, mainHeaders, subHeaders, dataRows };
        }
        
        const expectedDataCols = subHeaders.length;
        if (dataRows.length > 0 && dataRows[0].values.length !== expectedDataCols) {
             newDebugInfo.status = `Cảnh báo: Số cột không khớp! Tiêu đề phụ (${expectedDataCols}) vs Dữ liệu (${dataRows[0].values.length}).`;
        } else {
           newDebugInfo.status = `Phân tích thành công.`;
        }
        
        debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
        return { success: true, mainHeaders, subHeaders, dataRows };
    }
};