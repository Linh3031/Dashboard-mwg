// src/services/processing/parsers/luyke.parser.js
import { competitionData, luykeNameMappings } from '../../../stores.js';
import { get } from 'svelte/store';

export const luykeParser = {
    // --- [NEW]: BỘ GIẢI MÃ BÁO CÁO TỔNG HỢP CỤM ---
    parseClusterSummaryData: (text) => {
        if (!text || !text.trim()) throw new Error("Dữ liệu rỗng");
        
        // Cắt dòng và loại bỏ toàn bộ các dòng trống/khoảng trắng thừa
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        let result = {};
        let dtlkCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';

            // 1. DTLK thứ 2
            if (line === 'DTLK') {
                dtlkCount++;
                if (dtlkCount === 2) {
                    result.doanhThuThuc = parseFloat(nextLine.replace(/,/g, '')) || 0;
                }
            }
            // 2. DT Dự kiến
            else if (line === 'DT Dự Kiến') {
                result.doanhThuThucDuKien = parseFloat(nextLine.replace(/,/g, '')) || 0;
            }
            // 3. DTQĐ
            else if (line === 'DTQĐ') {
                result.doanhThuQuyDoi = parseFloat(nextLine.replace(/,/g, '')) || 0;
            }
            // 4. DT Dự Kiến (QĐ)
            else if (line === 'DT Dự Kiến (QĐ)') {
                result.doanhThuQuyDoiDuKien = parseFloat(nextLine.replace(/,/g, '')) || 0;
            }
            // 5. Target (QĐ)
            else if (line === 'Target (QĐ)') {
                result.targetDTQD = parseFloat(nextLine.replace(/,/g, '')) || 0;
            }
            // 6. % HT Target Dự Kiến (QĐ)
            else if (line === '% HT Target Dự Kiến (QĐ)') {
                result.tyLeHoanThanh = nextLine;
            }
            // 7. DTCK Tháng (Cắt làm 2: Giá trị & %)
            else if (line === 'DTCK Tháng') {
                const parts = nextLine.split(/\s+/);
                result.dtckThangGiaTri = parts[0] ? parseFloat(parts[0].replace(/,/g, '')) : 0;
                result.dtckThangTangTruong = parts[1] || '0%';
            }
            // 8. Lượt Khách CK Tháng (Cắt làm 2: Giá trị & %)
            else if (line === 'Lượt Khách CK Tháng') {
                const parts = nextLine.split(/\s+/);
                result.luotKhachCKGiaTri = parts[0] ? parseFloat(parts[0].replace(/,/g, '')) : 0;
                result.luotKhachCKTangTruong = parts[1] || '0%';
            }
            // 9. Tỷ Trọng Trả Chậm
            else if (line === 'Tỷ Trọng Trả Chậm') {
                result.tyLeTraCham = nextLine;
            }
            // 10. DT Siêu thị (Trả chậm)
            else if (line === 'DT Siêu thị') {
                result.dtTraCham = parseFloat(nextLine.replace(/,/g, '')) || 0;
            }
        }

        if (Object.keys(result).length === 0) {
            throw new Error("Không tìm thấy từ khóa hợp lệ. Vui lòng copy đúng bảng báo cáo BI.");
        }

        return result;
    },

    // --- (GIỮ NGUYÊN LOGIC CŨ Ở DƯỚI) ---
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
        defaults.tyLeTraCham = findValueAfterKeyword(allLines, "Tỷ Trọng Trả Chậm");

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

        const currentMappings = get(luykeNameMappings) || {};
        let hasChanges = false;
        results.forEach(item => {
            if (!currentMappings[item.name]) {
                currentMappings[item.name] = item.name;
                hasChanges = true;
            }
        });
        if (hasChanges) {
            luykeNameMappings.set(currentMappings);
        }

        competitionData.set(results);
        return results;
    }
};