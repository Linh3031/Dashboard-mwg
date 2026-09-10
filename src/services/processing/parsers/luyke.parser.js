import { competitionData, luykeNameMappings } from '../../../stores.js';
import { get } from 'svelte/store';
import { competitionProcessor } from '../logic/competition.processor.js';

export const luykeParser = {
    // --- BỘ GIẢI MÃ BÁO CÁO TỔNG HỢP CỤM (V4.0) ---
    parseClusterSummaryData: (text) => {
        if (!text || !text.trim()) throw new Error("Dữ liệu rỗng");
        
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        let result = {
            chiTietKho: []
        };
        let dtlkCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';

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
            
            if (/^(ĐML|ĐMM|ĐMS|TGD|AAR)/.test(line)) {
                let storeName = "";
                let valuesArray = [];

                if (line.includes('\t')) {
                    const parts = line.split('\t').map(p => p.trim()).filter(p => p !== '');
                    storeName = parts[0];
                    valuesArray = parts.slice(1);
                } 
                else if (i + 1 < lines.length && /^[-0-9]/.test(lines[i + 1])) {
                    storeName = line;
                    let j = i + 1;
                    while (j < lines.length && !/^(ĐML|ĐMM|ĐMS|TGD|AAR|Tổng)/.test(lines[j]) && /^[-\d]/.test(lines[j])) {
                        valuesArray.push(lines[j]);
                        j++;
                    }
                } 
                else {
                    const match = line.match(/^(ĐML|ĐMM|ĐMS|AAR|TGD.*?[a-zA-ZáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ()]+)\s*(.*)/i);
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

        console.group("=== DỮ LIỆU CỤM ĐÃ TRÍCH XUẤT ===");
        console.log(JSON.parse(JSON.stringify(result)));
        console.groupEnd();

        return result;
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

    // --- BỘ GIẢI MÃ THI ĐUA SIÊU THỊ LŨY KẾ (V6 - NEW FORMAT BI) ---
    parseCompetitionDataFromLuyKe: (text) => {
        if (!text || !text.trim()) return [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === 'TỔNG') {
                if (i < 2 || i + 3 >= lines.length) continue;
                
                let nameLine = lines[i-2];
                let typeLine = lines[i-1];
                
                let progMatch = nameLine.match(/^\d+-(.*)$/);
                let cleanName = progMatch ? progMatch[1].trim() : nameLine;
                let prefix = typeLine.includes('DOANH THU') ? 'DT' : (typeLine.includes('SỐ LƯỢNG') ? 'SL' : '');
                
                if (!prefix) continue; 
                let currentProgram = `${prefix} ${cleanName}`;

                let shopName = lines[i+2];
                let dataLine = lines[i+3];

                if (!shopName.match(/(ĐML|ĐMS|ĐMM|TGD|AAR)/i)) continue;

                let parts = dataLine.split(/\s+/).filter(p => p);
                
                if (parts.length >= 4) {
                    let lk = Math.floor(parseFloat(parts[0].replace(/,/g, '')) || 0);
                    let target = Math.floor(parseFloat(parts[1].replace(/,/g, '')) || 0);
                    let htThang = Math.ceil(parseFloat(parts[2].replace(/%/g, '')) || 0);
                    let htDuBao = Math.ceil(parseFloat(parts[3].replace(/%/g, '')) || 0);

                    // [PHẪU THUẬT LOGIC]: Xuất thêm biến hoanThanhDuKien
                    results.push({
                        name: currentProgram,
                        type: prefix === 'DT' ? 'doanhThu' : 'soLuong',
                        luyKe: lk,
                        target: target,
                        hoanThanh: htThang + '%',
                        hoanThanhDuKien: htDuBao + '%'
                    });
                }
            }
        }

        // Tích hợp logic cập nhật Name Mappings gốc để Tab Admin tự động nhận diện
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

        // [AUTO-LINK] ST vừa có dữ liệu mới -> thử ghép tự động với các chương trình NV chưa có link
        competitionProcessor.autoLinkPrograms(results);

        return results;
    }
};