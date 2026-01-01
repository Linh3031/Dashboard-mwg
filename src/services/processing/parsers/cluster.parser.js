// src/services/processing/parsers/cluster.parser.js
import { formatters } from '../../../utils/formatters.js';

export const clusterParser = {
    /**
     * 1. Xử lý "Thi đua siêu thị lũy kế" (Logic 3 Tầng)
     */
    parseCompetitionStr: (text) => {
        if (!text) return null;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        // Tầng 1: Tìm danh sách Ngành hàng
        let categories = [];
        const domainIndex = lines.findIndex(l => l.toLowerCase().includes('tên miền'));
        if (domainIndex !== -1 && domainIndex + 1 < lines.length) {
            // Lấy dòng ngay sau "tên miền"
            // Tách theo tab hoặc khoảng trắng lớn (2 spaces trở lên)
            categories = lines[domainIndex + 1].split(/\t|\s{2,}/).filter(s => s.trim());
        }

        // Tầng 2: Tìm tỷ trọng % Tổng
        let totalPercents = [];
        const totalIndex = lines.findIndex(l => l.toLowerCase() === 'tổng' || l.toLowerCase().startsWith('tổng '));
        if (totalIndex !== -1 && totalIndex + 1 < lines.length) {
            totalPercents = lines[totalIndex + 1].split(/\t|\s+/).filter(s => s.includes('%'));
        }

        // Tầng 3: Tìm Siêu thị và Data chi tiết
        const stores = [];
        // Bắt đầu quét từ sau dòng Tổng + 1 (dòng chứa %)
        let startIndex = totalIndex !== -1 ? totalIndex + 2 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            
            // Nhận diện Tên siêu thị: Là dòng chứa ký tự chữ, KHÔNG chứa quá nhiều số
            // Logic: Nếu dòng tiếp theo (i+1) chứa cặp giá trị (% và số) -> Dòng hiện tại là Tên Siêu Thị
            const nextLine = lines[i+1];
            if (nextLine && /[\d]+/.test(nextLine) && nextLine.includes('%')) {
                const storeName = line;
                const rawValues = nextLine.split(/\t|\s+/).filter(s => s);
                
                // Parse cặp giá trị: Xen kẽ % (Thực hiện) và Số (Doanh thu)
                // Cấu trúc mong đợi: [Val1_%, Val1_DT, Val2_%, Val2_DT...]
                const storeData = categories.map((cat, idx) => {
                    // Mỗi category chiếm 2 vị trí trong mảng rawValues
                    const pIndex = idx * 2;
                    const vIndex = idx * 2 + 1;
                    
                    return {
                        category: cat,
                        percent: rawValues[pIndex] || '0%',
                        revenue: formatters.parseNumber(rawValues[vIndex] || '0')
                    };
                });

                stores.push({
                    name: storeName,
                    data: storeData
                });
                
                i++; // Nhảy qua dòng dữ liệu để tiếp tục vòng lặp
            }
        }

        return {
            categories,
            totalPercents,
            stores
        };
    },

    /**
     * 2. Xử lý "Data lũy kế" (Tổng Cụm + Chi tiết 16 cột)
     */
    parseCumulativeStr: (text) => {
        if (!text) return null;
        const lines = text.split('\n').map(l => l.trim());
        const fullText = lines.join(' ');

        // A. Parse Tổng Cụm (KPI Cards)
        const kpiMapping = {
            'DTLK': { key: 'dtThuc', type: 'money' },
            'DT Dự Kiến': { key: 'dtThucDuKien', type: 'money' },
            'DTQĐ': { key: 'dtQuyDoi', type: 'money' },
            'DT Dự Kiến (QĐ)': { key: 'dtQuyDoiDuKien', type: 'money' },
            '% HT Target Dự Kiến (QĐ)': { key: 'percentQuyDoi', type: 'percent' },
            'DTCK Tháng': { key: 'growth', type: 'growth' }, // Lấy cả 2 giá trị
            'Tỷ Trọng Trả Góp': { key: 'traGopPercent', type: 'percent' },
            'DT Siêu thị': { key: 'traGopRevenue', type: 'money' }
        };

        const generalStats = {};

        // Helper regex tìm giá trị sau từ khóa
        const findVal = (keyword) => {
            // Regex: Tìm keyword -> bỏ qua khoảng trắng/dấu : -> lấy cụm số (có thể có dấu , . % - +)
            const escaped = keyword.replace('(', '\\(').replace(')', '\\)');
            const regex = new RegExp(`${escaped}\\s*[:]?\\s*([\\d,.]+%?)`, 'i');
            const match = fullText.match(regex);
            return match ? match[1] : '0';
        };

        Object.keys(kpiMapping).forEach(label => {
            const config = kpiMapping[label];
            if (config.key === 'growth') {
                // Xử lý riêng cho Tăng trưởng (lấy 2 giá trị: số tiền và %)
                const regex = /DTCK Tháng\s*[:]?\s*([+\-\d,.]+)\s+([+\-\d,.]+%)/i;
                const match = fullText.match(regex);
                if (match) {
                    generalStats[config.key] = {
                        value: formatters.parseNumber(match[1]),
                        percent: match[2]
                    };
                }
            } else {
                const raw = findVal(label);
                generalStats[config.key] = config.type === 'percent' ? raw : formatters.parseNumber(raw);
            }
        });

        // B. Parse Chi tiết Siêu thị (16 cột ngang)
        const storeDetails = [];
        
        // Tìm dòng chứa từ khóa "Tổng" -> Sau đó là Tên Siêu Thị -> Sau đó là Data
        // Regex: Tìm chữ "Tổng" -> (Nhóm 1: Tên siêu thị) -> (Nhóm 2: Chuỗi số liệu còn lại)
        // Giả định Tên siêu thị không chứa số, hoặc ít số. Data bắt đầu bằng số.
        lines.forEach(line => {
            if (line.includes('Tổng')) {
                // Tách phần sau chữ Tổng
                const afterTong = line.split('Tổng')[1].trim();
                
                // Tách Tên siêu thị và Dữ liệu
                // Cách tách: Tìm vị trí của con số đầu tiên
                const firstDigitIndex = afterTong.search(/[\d-]/); // Tìm số hoặc dấu âm
                
                if (firstDigitIndex !== -1) {
                    const storeName = afterTong.substring(0, firstDigitIndex).trim();
                    const dataPart = afterTong.substring(firstDigitIndex).trim();
                    
                    // Tách các cột dữ liệu (Space hoặc Tab)
                    const cols = dataPart.split(/\s+/);
                    
                    // Map 16 cột cố định
                    if (cols.length >= 15) { // Chấp nhận thiếu 1 vài cột cuối nếu data lỗi
                         storeDetails.push({
                            name: storeName,
                            dtHomQua: formatters.parseNumber(cols[0]),
                            dtLuyKe: formatters.parseNumber(cols[1]),
                            dtDuKien: formatters.parseNumber(cols[2]),
                            dtQuyDoi: formatters.parseNumber(cols[3]),
                            dtQuyDoiDuKien: formatters.parseNumber(cols[4]),
                            percentHTQuyDoi: cols[5],
                            growthNum: formatters.parseNumber(cols[6]),
                            growthPercent: cols[7], // +/- DTCK Tháng (QĐ) ??? Cần check lại thứ tự
                            laiGopQuyDoi: formatters.parseNumber(cols[8]),
                            percentLNTT: cols[9],
                            luotKhachLK: formatters.parseNumber(cols[10]),
                            growthLuotKhach: cols[11],
                            tlpvtcLK: cols[12],
                            growthTlpvtc: cols[13],
                            tyTrongTraGop: cols[14],
                            growthTraGop: cols[15] || '0%'
                        });
                    }
                }
            }
        });

        return {
            generalStats,
            storeDetails
        };
    }
};