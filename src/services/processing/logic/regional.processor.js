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
    // Xử lý file Excel Thi Đua Vùng - Bản Debug Chi Tiết
    processThiDuaVungFile(workbook) {
        console.group('🚀 [RegionalProcessor] Bắt đầu xử lý file...');

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            console.error('❌ Lỗi: Workbook không có sheet nào.');
            console.groupEnd();
            throw new Error('File Excel không chứa sheet dữ liệu nào.');
        }

        const sheetName = workbook.SheetNames[0];
        console.log(`ℹ️ Đang đọc sheet: "${sheetName}"`);
        const sheet = workbook.Sheets[sheetName];

        // 2. KHAI BÁO TỪ KHÓA
        const KEYWORDS = {
            tinh: 'tỉnh',
            boss: 'boss',
            kenh: 'kênh',
            sieuThi: 'siêu thị',
            nganhHang: 'ngành hàng thi đua',
            duKienHoanThanh: 'dự kiến hoàn thành',
            duKienVuot: 'dự kiến dt/sl vượt',
            rankTop10: 'top 10% kênh',
            rankVuotTroi: 'hạng vượt trội dt/sl theo kênh',
            rankTarget: 'hạng h.t target theo kênh',
            thuongVuotTroi: 'thưởng top vượt trội dt/sl',
            thuongTarget: 'thưởng top hoàn thành target',
            tongThuong: 'tổng thưởng'
        };

        const REQUIRED_MATCHES = [
            KEYWORDS.sieuThi, 
            KEYWORDS.nganhHang, 
            KEYWORDS.tongThuong
        ];

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
        console.log(`ℹ️ Tổng số dòng quét được: ${maxRowIndex}`);

        for (let r = 1; r <= Math.min(50, maxRowIndex); r++) {
            const rowTexts = [];
            const colToText = {}; 

            cellKeys.forEach(key => {
                const match = key.match(/^([A-Z]+)(\d+)$/);
                if (match && parseInt(match[2]) === r) {
                    const cellVal = sheet[key].v;
                    if (typeof cellVal === 'string') {
                        const cleanText = cellVal
                            .replace(/[\r\n]+/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .toLowerCase();
                        
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
                        const strictKeys = ['sieuThi', 'kenh', 'tinh', 'boss'];
                        if (!strictKeys.includes(keyId) && text.includes(keyText)) {
                            if (!columnMap[keyId]) {
                                columnMap[keyId] = colLetter;
                            }
                        }
                    }
                });
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error('❌ Không tìm thấy Header chứa các cột:', REQUIRED_MATCHES);
            console.groupEnd();
            throw new Error(`Không tìm thấy dòng tiêu đề hợp lệ.`);
        }

        console.log(`✅ Đã tìm thấy Header tại dòng ${headerRowIndex}`);
        console.table(columnMap); // In bảng map cột để kiểm tra

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
            
            // Log dòng đầu tiên để kiểm tra dữ liệu thô
            if (r === headerRowIndex + 1) {
                console.log(`🔎 [Row ${r}] Raw Siêu Thị: "${sieuThiName}"`);
            }

            if (!sieuThiName || typeof sieuThiName !== 'string') {
                skippedRows++;
                continue;
            }
            
            sieuThiName = sieuThiName.replace(/\s+/g, ' ').trim(); 
            if (sieuThiName === '') {
                skippedRows++;
                continue;
            }

            const rowItem = {
                id: `${r}`,
                sieuThi: sieuThiName,
                kenh: getVal('kenh') || '',
                nganhHang: getVal('nganhHang') || '',
                duKienHoanThanh: parseFloat(getVal('duKienHoanThanh')) || 0, 
                tongThuong: parseFloat(getVal('tongThuong')) || 0,
                rankTop10: getVal('rankTop10'),
                rankVuotTroi: getVal('rankVuotTroi'),
                rankTarget: getVal('rankTarget')
            };
            rawData.push(rowItem);

            if (!supermarketMap.has(sieuThiName)) {
                supermarketMap.set(sieuThiName, {
                    // QUAN TRỌNG: Đây là cấu trúc Object trả về. 
                    // Kiểm tra xem Component có gọi đúng tên biến này không?
                    sieuThi: sieuThiName, 
                    kenh: rowItem.kenh, 
                    tongThuong: 0,
                    soNganhHang: 0,
                    soNganhHangDat: 0,
                    rankTop10: rowItem.rankTop10, 
                    rankVuotTroi: rowItem.rankVuotTroi,
                    rankTarget: rowItem.rankTarget,
                    details: []
                });
            }

            const stData = supermarketMap.get(sieuThiName);
            stData.tongThuong += rowItem.tongThuong;
            stData.soNganhHang += 1;
            
            if (rowItem.duKienHoanThanh >= 1.0) {
                stData.soNganhHangDat += 1;
            }
            
            stData.details.push(rowItem);
        }

        const aggregatedData = Array.from(supermarketMap.values())
            .map(item => {
                item.evaluation = evaluatePerformance(item.soNganhHangDat, item.soNganhHang);
                return item;
            })
            .sort((a, b) => a.sieuThi.localeCompare(b.sieuThi));

        console.log(`📊 Tổng kết:`);
        console.log(`   - Tổng dòng dữ liệu đọc được: ${rawData.length}`);
        console.log(`   - Số dòng bị bỏ qua (trống/lỗi): ${skippedRows}`);
        console.log(`   - Số siêu thị duy nhất (Kết quả cuối): ${aggregatedData.length}`);

        if (aggregatedData.length > 0) {
            console.log('👀 [DEBUG] Mẫu dữ liệu đầu tiên trả về cho UI (Hãy so sánh Key với Component):');
            console.log(aggregatedData[0]); 
            // Tip: Mở console trình duyệt, bấm mũi tên vào object này để xem tên thuộc tính
        } else {
            console.warn('⚠️ Cảnh báo: Không có siêu thị nào được tạo ra!');
        }

        console.groupEnd();

        return {
            chiTietData: rawData, 
            tongData: aggregatedData 
        };
    }
};