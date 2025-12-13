// src/services/processing/parsers/erp.parser.js
export const erpParser = {
    processThuongERP: (pastedText) => {
        if (!pastedText || !pastedText.trim()) return [];
        const lines = pastedText.trim().split('\n');
        const results = [];
        // Regex để bắt dòng: "ĐML_... BP Tư Vấn... Nguyễn Văn A... 1,000,000"
        const regex = /(ĐML_|TGD|ĐMM|ĐMS).*?(BP .*?)(?:Nhân Viên|Trưởng Ca)(.*?)([\d,]+)$/;
        
        lines.forEach(line => {
            const match = line.replace(/\s+/g, ' ').match(regex);
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