// src/services/processing/logic/regional.processor.js
import { helpers } from '../helpers.js';

export const regionalProcessor = {
    // Xử lý file Excel Thi Đua Vùng
    processThiDuaVungFile(workbook) {
        const sheetNames = workbook.SheetNames;
        
        const chiTietSheetName = sheetNames.find(name => {
            const upperName = name.toUpperCase();
            return upperName.includes('CHITIET') || upperName.includes('CHI TIẾT');
        });
        
        const tongSheetName = sheetNames.find(name => {
            const upperName = name.toUpperCase();
            return upperName.includes('TONG') || upperName.includes('SIEU THI');
        });

        const chiTietSheet = chiTietSheetName ? workbook.Sheets[chiTietSheetName] : null;
        const tongSheet = tongSheetName ? workbook.Sheets[tongSheetName] : null;

        if (!chiTietSheet || !tongSheet) {
            throw new Error('File Excel phải chứa sheet (CHITIET/CHI TIẾT) và (TONG/SIEU THI).');
        }
        
        const chiTietData = helpers.findHeaderAndProcess(chiTietSheet, ['siêu thị', 'ngành hàng', 'kênh']);
        const tongData = helpers.findHeaderAndProcess(tongSheet, ['siêu thị', 'tổng thưởng']);

        return { chiTietData, tongData };
    }
};