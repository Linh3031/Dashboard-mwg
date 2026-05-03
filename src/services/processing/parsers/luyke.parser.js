// src/services/processing/parsers/luyke.parser.js
import { competitionData, luykeNameMappings } from '../../../stores.js';
import { get } from 'svelte/store';

export const luykeParser = {
    // --- BỘ GIẢI MÃ BÁO CÁO TỔNG HỢP CỤM (V4.0 - THÊM CHI TIẾT TỪNG KHO) ---
    parseClusterSummaryData: (text) => {
        if (!text || !text.trim()) throw new Error("Dữ liệu rỗng");
        
        // Tách dòng và bảo toàn khoảng trắng/tab để xử lý
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        let result = {
            chiTietKho: [] // Mảng chứa dữ liệu từng Shop
        };
        let dtlkCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';

            // [PHẦN 1: LOGIC CŨ LẤY TỔNG QUAN CỤM]
            if (line === 'DTLK') {
                dtlkCount++;
                if (dtlkCount === 2) result.doanhThuThuc = parseFloat(nextLine.replace(/,/g, '')) || 0;
            } else if (line === 'DT Dự Kiến') {
                result.doanhThuThucDuKien = parseFloat(nextLine.replace(/,/g, '')) || 0;
            } else if (line === 'DTQĐ') {
                result.doanhThuQuyDoi = parseFloat(nextLine.replace(/,/g, '')) || 0;
            } else if (line === 'DT Dự Kiến (QĐ)') {
                result.doanhThuQuyDoiDuKien = parseFloat(nextLine.replace(/,/g, '')) || 0;
            } else if (line === 'Target (QĐ)') {
                result.targetDTQD = parseFloat(nextLine.replace(/,/g, '')) || 0;
            } else if (line === '% HT Target Dự Kiến (QĐ)') {
                result.tyLeHoanThanh = nextLine;
            } else if (line === 'DTCK Tháng') {
                const parts = nextLine.split(/\s+/);
                result.dtckThangGiaTri = parts[0] ? parseFloat(parts[0].replace(/,/g, '')) : 0;
                result.dtckThangTangTruong = parts[1] || '0%';
            } else if (line === 'Lượt Khách CK Tháng') {
                const parts = nextLine.split(/\s+/);
                result.luotKhachCKGiaTri = parts[0] ? parseFloat(parts[0].replace(/,/g, '')) : 0;
                result.luotKhachCKTangTruong = parts[1] || '0%';
            } else if (line === 'Tỷ Trọng Trả Chậm') {
                result.tyLeTraCham = nextLine;
            } else if (line === 'DT Siêu thị') {
                result.dtTraCham = parseFloat(nextLine.replace(/,/g, '')) || 0;
            }
            
            // [PHẦN 2: LOGIC MỚI - LẤY CHI TIẾT TỪNG KHO]
            if (/^(ĐML|ĐMM|ĐMS|TGD)/.test(line)) {
                let storeName = "";
                let valuesArray = [];

                // KỊCH BẢN 1: Copy dán giữ được Tab (\t) (Khi copy từ web BI)
                if (line.includes('\t')) {
                    const parts = line.split('\t').map(p => p.trim()).filter(p => p !== '');
                    storeName = parts[0];
                    valuesArray = parts.slice(1);
                } 
                // KỊCH BẢN 2: Copy dán bị tách mỗi ô 1 dòng (Excel behavior)
                else if (i + 1 < lines.length && /^[-0-9]/.test(lines[i + 1])) {
                    storeName = line;
                    let j = i + 1;
                    while (j < lines.length && !/^(ĐML|ĐMM|ĐMS|TGD|Tổng)/.test(lines[j]) && /^[-\d]/.test(lines[j])) {
                        valuesArray.push(lines[j]);
                        j++;
                    }
                } 
                // KỊCH BẢN 3: Dán dính chùm. Dùng Regex ép kiểu để lấy số.
                else {
                    const match = line.match(/^(ĐML|ĐMM|ĐMS|TGD.*?[a-zA-ZáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ()]+)\s*(.*)/i);
                    if (match) {
                        storeName = match[1].trim();
                        const numbersStr = match[2];
                        if (numbersStr.includes(' ')) {
                            valuesArray = numbersStr.split(/\s+/).filter(v => v !== '');
                        } else {
                            valuesArray = numbersStr.match(/(?:-?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|undefined%)/g) || [];
                        }
                    }
                }

                if (storeName && valuesArray.length >= 15) {
                    result.chiTietKho.push({
                        tenKho: storeName,
                        dtHomQua: parseFloat(String(valuesArray[0]).replace(/,/g, '')) || 0,
                        dtThucLK: parseFloat(String(valuesArray[1]).replace(/,/g, '')) || 0,
                        dtThucDuKien: parseFloat(String(valuesArray[2]).replace(/,/g, '')) || 0,
                        dtqdLK: parseFloat(String(valuesArray[3]).replace(/,/g, '')) || 0,
                        dtqdDuKien: parseFloat(String(valuesArray[4]).replace(/,/g, '')) || 0,
                        tyLeTargetDuKien: valuesArray[5] || '0%',
                        tangTruongDTQDCungKy: valuesArray[7] || '0%', 
                        tyTrongTraCham: valuesArray[14] || '0%'       
                    });
                }
            }
        }

        if (Object.keys(result).length === 1 && result.chiTietKho.length === 0) {
            throw new Error("Không tìm thấy từ khóa hợp lệ. Vui lòng copy đúng bảng báo cáo BI.");
        }

        // TỰ ĐỘNG IN RA CONSOLE Ở ĐÂY - BẠN CHỈ CẦN MỞ F12 ĐỂ XEM
        console.group("=== DỮ LIỆU CỤM ĐÃ TRÍCH XUẤT ===");
        console.log(JSON.parse(JSON.stringify(result)));
        console.groupEnd();

        return result;
    },

    // --- CÁC HÀM CŨ GIỮ NGUYÊN BÊN DƯỚI ---
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