/**
 * Utility xử lý bóc tách file Excel Thi Đua Vùng HCM (Bao gồm Sheet TAM)
 * Version: 2.5 (Atomic Integrity - Added Potential Prize for Tiem Nang)
 */
export function parseHcmExcelData(workbook, XLSX) {
    const thuongSheet = workbook.Sheets['Thuong'];
    const giaiSheet = workbook.Sheets['Giai'];
    const tamSheet = workbook.Sheets['TAM'];

    if (!thuongSheet || !giaiSheet || !tamSheet) {
        throw new Error("File HCM không hợp lệ! Cần có đủ 3 sheet: 'Thuong', 'Giai' và 'TAM'.");
    }

    const thuongData = XLSX.utils.sheet_to_json(thuongSheet, { header: 1, defval: "" });
    const giaiData = XLSX.utils.sheet_to_json(giaiSheet, { header: 1, defval: "" });
    const tamData = XLSX.utils.sheet_to_json(tamSheet, { header: 1, defval: "" });

    const normalizeText = (str) => {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .replace(/đ/g, 'd')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-z0-9]/g, ""); 
    };

    const findHeaderIndex = (data, keyword) => {
        const kw = normalizeText(keyword);
        for (let i = 0; i < Math.min(data.length, 10); i++) {
            if (data[i].some(cell => normalizeText(cell).includes(kw))) return i;
        }
        return 0;
    };

    const extractNumber = (val, defaultVal = 9999) => {
        if (val === undefined || val === null || val === '') return defaultVal;
        const strVal = String(val).trim();
        if (strVal === '-' || strVal === '0' || strVal.toLowerCase() === 'n/a') return defaultVal;
        const match = strVal.match(/\d+/);
        return match ? parseInt(match[0], 10) : defaultVal;
    };

    // --- PHẦN 1: ĐỌC SHEET THƯỞNG VÀ GIẢI ---
    const headerRowThuongIdx = findHeaderIndex(thuongData, 'sieuthi');
    const headerRowGiaiIdx = findHeaderIndex(giaiData, 'sieuthi');

    const colStThuong = thuongData[headerRowThuongIdx].findIndex(h => normalizeText(h).includes('sieuthi'));
    const colTongThuong = thuongData[headerRowThuongIdx].findIndex(h => normalizeText(h).includes('tongthuong'));
    const colStGiai = giaiData[headerRowGiaiIdx].findIndex(h => normalizeText(h).includes('sieuthi'));
    const colSoGiai = giaiData[headerRowGiaiIdx].findIndex(h => normalizeText(h).includes('sogiai'));

    const nganhHangThuong = thuongData[headerRowThuongIdx].slice(colTongThuong + 1).filter(Boolean).map(h => String(h).trim());
    const hcmDataDict = {};

    for (let i = headerRowThuongIdx + 1; i < thuongData.length; i++) {
        const row = thuongData[i];
        const tenST = String(row[colStThuong] || '').trim();
        if (!tenST) continue;

        if (!hcmDataDict[tenST]) {
            hcmDataDict[tenST] = { sieuThi: tenST, tongThuong: 0, soGiai: 0, categories: [] };
        }
        hcmDataDict[tenST].tongThuong = Number(row[colTongThuong]) || 0;

        nganhHangThuong.forEach((nh, index) => {
            const actualColIdx = colTongThuong + 1 + index;
            const cellValue = Number(row[actualColIdx]) || 0;
            hcmDataDict[tenST].categories.push({ name: nh, thuong: cellValue, loaiGiai: '', details: null, potentialPrize: 0 });
        });
    }

    // BƯỚC ĐỆM: TÌM GIÁ TRỊ GIẢI THƯỞNG NHỎ NHẤT (>0) CỦA TỪNG NGÀNH HÀNG ĐỂ LÀM TIỀN ĐỀ CHO NHÓM TIỀM NĂNG
    const minPrizeDict = {};
    for (const st in hcmDataDict) {
        hcmDataDict[st].categories.forEach(cat => {
            if (cat.thuong > 0) {
                const normName = normalizeText(cat.name);
                if (!minPrizeDict[normName] || cat.thuong < minPrizeDict[normName]) {
                    minPrizeDict[normName] = cat.thuong;
                }
            }
        });
    }

    for (let i = headerRowGiaiIdx + 1; i < giaiData.length; i++) {
        const row = giaiData[i];
        const tenST = String(row[colStGiai] || '').trim();
        if (!tenST || !hcmDataDict[tenST]) continue;

        hcmDataDict[tenST].soGiai = Number(row[colSoGiai]) || 0;
        
        for (let j = colSoGiai + 1; j < giaiData[headerRowGiaiIdx].length; j++) {
            const tenNgànhGiai = String(giaiData[headerRowGiaiIdx][j] || '').trim();
            const loaiGiai = String(row[j] || '').trim();

            if (tenNgànhGiai && loaiGiai) {
                const catIndex = hcmDataDict[tenST].categories.findIndex(c => normalizeText(c.name) === normalizeText(tenNgànhGiai));
                if (catIndex !== -1) {
                    hcmDataDict[tenST].categories[catIndex].loaiGiai = loaiGiai;
                }
            }
        }
    }

    // --- PHẦN 2: ĐỌC SHEET TAM ---
    let tamCatRowIdx = -1;
    let maxMatches = 0;
    for (let i = 0; i < Math.min(tamData.length, 20); i++) {
        let matches = 0;
        tamData[i].forEach(cell => {
            if (nganhHangThuong.some(nh => normalizeText(nh) === normalizeText(cell))) matches++;
        });
        if (matches > maxMatches) { maxMatches = matches; tamCatRowIdx = i; }
    }

    if (tamCatRowIdx !== -1) {
        const catRow = tamData[tamCatRowIdx];
        const blocks = [];

        catRow.forEach((cell, colIdx) => {
            const cellNorm = normalizeText(cell);
            const catMatch = nganhHangThuong.find(nh => normalizeText(nh) === cellNorm);
            
            if (catMatch) {
                let rawCutoff = catRow[colIdx + 2];
                if (!rawCutoff) rawCutoff = tamData[tamCatRowIdx + 1]?.[colIdx + 2];
                const cutoffRank = extractNumber(rawCutoff, 0);

                const searchCols = [];
                for (let offset = 0; offset <= 15; offset++) {
                    const v0 = normalizeText(tamData[tamCatRowIdx]?.[colIdx + offset]);
                    const v1 = normalizeText(tamData[tamCatRowIdx + 1]?.[colIdx + offset]);
                    const v2 = normalizeText(tamData[tamCatRowIdx + 2]?.[colIdx + offset]);
                    searchCols.push(v0 + v1 + v2); 
                }
                
                const findSubCol = (keywords, excludes = []) => {
                    const idx = searchCols.findIndex(sc => {
                        return keywords.some(kw => sc.includes(kw)) && !excludes.some(ex => sc.includes(ex));
                    });
                    return idx !== -1 ? colIdx + idx : -1;
                };

                blocks.push({
                    name: catMatch,
                    colST: colIdx,
                    cutoffRank: cutoffRank,
                    colLuyKe: findSubCol(['luyke', 'lk']),
                    colTarget: findSubCol(['target', 'chitieu']),
                    colDKHT: findSubCol(['dkht', 'dukien']),
                    colHT: findSubCol(['ht', 'tyle']),
                    colXHDoLon: findSubCol(['xhdolon', 'hangdolon', 'xhdl', 'hangdl', 'xhdtsl', 'hangdtsl']),
                    colXHTarget: findSubCol(['xhtarget', 'hangtarget', 'xh'], ['dolon', 'dl', 'dtsl', 'giai']),
                });
            }
        });

        for (let i = tamCatRowIdx + 1; i < tamData.length; i++) {
            const row = tamData[i];
            
            blocks.forEach(block => {
                const tenST = String(row[block.colST] || '').trim();
                
                if (tenST && hcmDataDict[tenST]) {
                    const luyKe = Number(row[block.colLuyKe]) || 0;
                    const target = Number(row[block.colTarget]) || 0;
                    const dkht = Number(row[block.colDKHT]) || 0;
                    
                    let percentHT = Number(row[block.colHT]) || 0;
                    if (percentHT > 0 && percentHT <= 2) percentHT = percentHT * 100; 

                    const xhTarget = extractNumber(row[block.colXHTarget], 9999);
                    const xhDoLon = extractNumber(row[block.colXHDoLon], 9999);

                    let bestRank = Math.min(xhTarget, xhDoLon);
                    if (bestRank === 9999) bestRank = 0; 

                    let loiThe = 'Chưa xác định';
                    if (bestRank > 0) {
                        loiThe = (bestRank === xhDoLon) ? 'Giải DT|SL' : 'Giải Target';
                    }

                    const khoangCach = (bestRank > 0 && block.cutoffRank > 0) ? (bestRank - block.cutoffRank) : 999;
                    let trangThai = '';
                    
                    if (bestRank === 0 || block.cutoffRank === 0) trangThai = 'N/A';
                    else if (khoangCach <= 0) trangThai = 'Đạt Giải';
                    else if (khoangCach <= 10) trangThai = 'Tiềm Năng';
                    else trangThai = 'Cần Cố Gắng';

                    let catEntry = hcmDataDict[tenST].categories.find(c => normalizeText(c.name) === normalizeText(block.name));
                    if (!catEntry) {
                        catEntry = { name: block.name, thuong: 0, loaiGiai: '', details: null, potentialPrize: 0 };
                        hcmDataDict[tenST].categories.push(catEntry);
                    }
                    
                    if (luyKe > 0 || target > 0 || percentHT > 0 || bestRank > 0) {
                        catEntry.details = {
                            cutoffRank: block.cutoffRank, 
                            luyKe, 
                            target, 
                            dkht, 
                            percentHT, 
                            bestRank, 
                            loiThe, 
                            khoangCach, 
                            trangThai
                        };
                        
                        // FIX: Gán Giải thưởng Tiềm năng (Lấy giá trị min của top có giải)
                        if (trangThai === 'Tiềm Năng') {
                            catEntry.potentialPrize = minPrizeDict[normalizeText(block.name)] || 0;
                        }
                    }
                }
            });
        }
    }

    // TÍNH TỔNG THƯỞNG TIỀM NĂNG CHO TỪNG SIÊU THỊ
    for (const st in hcmDataDict) {
        let tongTiemNang = 0;
        hcmDataDict[st].categories.forEach(cat => {
            if (cat.potentialPrize > 0) {
                tongTiemNang += cat.potentialPrize;
            }
        });
        hcmDataDict[st].tongThuongTiemNang = tongTiemNang;
    }

    const allSupermarketNames = Object.keys(hcmDataDict).sort((a, b) => a.localeCompare(b));
    return { hcmDataDict, allSupermarketNames };
}