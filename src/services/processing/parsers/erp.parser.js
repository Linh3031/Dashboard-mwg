// src/services/processing/parsers/erp.parser.js
export const erpParser = {
    processThuongERP: (pastedText) => {
        if (!pastedText || !pastedText.trim()) return [];
        
        // [FIX GENESIS] Thay đổi cách split để xử lý cả \r\n (Windows) và \n (Linux/Mac)
        // Thêm .map(l => l.trim()) ngay lập tức để loại bỏ ký tự rác đầu/cuối dòng
        const lines = pastedText.trim().split(/\r?\n/).map(l => l.trim());
        
        const results = [];
        // Regex giữ nguyên logic cũ
        const regex = /(ĐML_|TGD|ĐMM|ĐMS).*?(BP .*?)(?:Nhân Viên|Trưởng Ca)(.*?)([\d,]+)$/;
        
        lines.forEach(line => {
            // Vì đã trim() ở trên, dòng này sạch.
            // Replace \s+ để gộp nhiều dấu cách thành 1 (an toàn cho regex)
            const cleanLine = line.replace(/\s+/g, ' '); 
            const match = cleanLine.match(regex);
            
            if (match) {
                results.push({ 
                    name: match[3].trim(), 
                    bonus: match[4].trim() 
                });
            }
        });
        return results;
    }
};