import { helpers } from '../helpers.js';

// --- HELPER FUNCTIONS ---
const evaluatePerformance = (dat, tong) => {
    if (tong === 0) return 'N/A';
    const tyLe = dat / tong;
    if (tyLe >= 1) return 'Xuất sắc'; 
    if (tyLe >= 0.8) return 'Gần đạt'; 
    return 'Cần cố gắng';
};

export const regionalProcessor = {
    // Xử lý file Excel Thi Đua Vùng
    processThiDuaVungFile(workbook) {
        console.group('🚀 [RegionalProcessor] Bắt đầu xử lý file...');

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('File Excel không chứa sheet dữ liệu nào.');
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // 2. KHAI BÁO TỪ KHÓA
        const KEYWORDS = {
            tinh: 'tỉnh',
            boss: 'boss',
            kenh: 'kênh',
            sieuThi: 'siêu thị',
            nganhHang: 'ngành hàng thi đua',
            
            // Các chỉ số KPI
            duKienHoanThanh: 'dự kiến hoàn thành', 
            duKienVuot: 'dự kiến dt/sl vượt', 
            
            // Các loại Hạng
            rankTop10: 'top 10% kênh', 
            rankVuotTroi: 'hạng vượt trội dt/sl theo kênh', 
            rankTarget: 'hạng h.t target theo kênh', 
            
            // Thưởng (Lấy thêm các cột thưởng tiềm năng)
            tongThuong: 'tổng thưởng',
            thuongVuotTroi: 'thưởng top vượt trội', // Cột thưởng tiềm năng 1
            thuongTarget: 'thưởng top hoàn thành'   // Cột thưởng tiềm năng 2
        };

        const REQUIRED_MATCHES = [KEYWORDS.sieuThi, KEYWORDS.nganhHang, KEYWORDS.tongThuong];

        let headerRowIndex = -1;
        let columnMap = {}; 
        let maxRowIndex = 0;

        // 3. QUÉT SHEET TÌM HEADER
        const cellKeys = Object.keys(sheet).filter(k => !k.startsWith('!'));
        cellKeys.forEach(key => {
            const match = key.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const row = parseInt(match[2]);
                if (row > maxRowIndex) maxRowIndex = row;
            }
        });

        for (let r = 1; r <= Math.min(50, maxRowIndex); r++) {
            const rowTexts = [];
            const colToText = {}; 

            cellKeys.forEach(key => {
                const match = key.match(/^([A-Z]+)(\d+)$/);
                if (match && parseInt(match[2]) === r) {
                    const cellVal = sheet[key].v;
                    if (typeof cellVal === 'string') {
                        const cleanText = cellVal.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                        rowTexts.push(cleanText);
                        colToText[match[1]] = cleanText;
                    }
                }
            });

            const isHeader = REQUIRED_MATCHES.every(req => rowTexts.includes(req));

            if (isHeader) {
                headerRowIndex = r;
                // MAP CỘT
                Object.entries(colToText).forEach(([colLetter, text]) => {
                    for (const [keyId, keyText] of Object.entries(KEYWORDS)) {
                        if (text === keyText) { 
                            columnMap[keyId] = colLetter;
                            continue;
                        }
                        if (text.includes(keyText) && !columnMap[keyId]) {
                            columnMap[keyId] = colLetter;
                        }
                    }
                });
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error(`Không tìm thấy dòng tiêu đề hợp lệ.`);
        }

        // 4. TRÍCH XUẤT DATA
        const rawData = [];
        const supermarketMap = new Map();
        let skippedRows = 0;

        for (let r = headerRowIndex + 1; r <= maxRowIndex; r++) {
            const getVal = (keyId) => {
                const col = columnMap[keyId];
                if (!col) return null;
                const cell = sheet[`${col}${r}`];
                return cell ? cell.v : null;
            };

            let sieuThiName = getVal('sieuThi');
            
            if (!sieuThiName || typeof sieuThiName !== 'string') {
                skippedRows++; continue;
            }
            
            sieuThiName = sieuThiName.replace(/\s+/g, ' ').trim(); 
            if (sieuThiName === '') {
                skippedRows++; continue;
            }

            // Đọc dữ liệu thưởng tiềm năng
            const thuongVuotTroi = parseFloat(getVal('thuongVuotTroi')) || 0;
            const thuongTarget = parseFloat(getVal('thuongTarget')) || 0;

            const rowItem = {
                id: `${r}`,
                sieuThi: sieuThiName,
                kenh: getVal('kenh') || '',
                nganhHang: getVal('nganhHang') || '',
                
                // Số liệu
                duKienHoanThanh: parseFloat(getVal('duKienHoanThanh')) || 0, 
                duKienVuot: parseFloat(getVal('duKienVuot')) || 0, 
                tongThuong: parseFloat(getVal('tongThuong')) || 0,
                
                // Tiềm năng (Lấy số lớn nhất trong các cơ hội thưởng)
                potentialPrize: Math.max(thuongVuotTroi, thuongTarget),

                // Hạng (Rank)
                rankCutoff: parseFloat(getVal('rankTop10')) || 0, 
                rankVuotTroi: parseFloat(getVal('rankVuotTroi')) || 9999,
                rankTarget: parseFloat(getVal('rankTarget')) || 9999,
            };

            rowItem.bestRank = Math.min(rowItem.rankVuotTroi, rowItem.rankTarget);
            
            rawData.push(rowItem);

            if (!supermarketMap.has(sieuThiName)) {
                supermarketMap.set(sieuThiName, {
                    sieuThi: sieuThiName, 
                    kenh: rowItem.kenh, 
                    tongThuong: 0,
                    soNganhHang: 0,
                    soNganhHangDat: 0,
                    rankCutoff: rowItem.rankCutoff,
                    details: []
                });
            }

            const stData = supermarketMap.get(sieuThiName);
            stData.tongThuong += rowItem.tongThuong;
            stData.soNganhHang += 1;
            
            if (rowItem.duKienHoanThanh >= 1.0) {
                stData.soNganhHangDat += 1;
            }
            if (stData.rankCutoff === 0 && rowItem.rankCutoff > 0) {
                stData.rankCutoff = rowItem.rankCutoff;
            }

            stData.details.push(rowItem);
        }

        const aggregatedData = Array.from(supermarketMap.values())
            .map(item => {
                item.evaluation = evaluatePerformance(item.soNganhHangDat, item.soNganhHang);
                return item;
            })
            .sort((a, b) => a.sieuThi.localeCompare(b.sieuThi));

        console.log(`✅ Đã xử lý ${aggregatedData.length} siêu thị.`);
        console.groupEnd();

        return {
            chiTietData: rawData, 
            tongData: aggregatedData 
        };
    }
};