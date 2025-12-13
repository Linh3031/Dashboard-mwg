// src/services/processing/parsers/thidua.parser.js
import { debugInfo } from '../../../stores.js';

export const thiduaParser = {
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