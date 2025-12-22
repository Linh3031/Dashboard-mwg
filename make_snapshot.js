/* Tool: Project Slicer for AI Context 
   Run: node make_snapshot.js
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Cấu hình các nhóm file cần tách
const GROUPS = {
    'snapshot_admin.txt': ['src/components/admin'],
    'snapshot_features.txt': ['src/components/health-staff', 'src/components/realtime', 'src/components/luyke'],
    'snapshot_services.txt': ['src/services', 'src/utils', 'src/logic'],
    'snapshot_core.txt': ['src/stores.js', 'src/components/common', 'src/App.svelte', 'src/main.js', 'src/config.js', 'src/styles']
};

// Hàm quét file đệ quy
function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    // Nếu là file đơn lẻ
    if (fs.statSync(dir).isFile()) return [dir];

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else {
            // Chỉ lấy các file code text
            if (/\.(svelte|js|ts|css|html|json|md)$/.test(file)) {
                results.push(file);
            }
        }
    });
    return results;
}

// Thực thi
console.log("🚀 Đang tạo snapshot...");

for (const [outputName, folders] of Object.entries(GROUPS)) {
    let content = `SNAPSHOT GROUP: ${outputName}\n\n`;
    let fileCount = 0;

    folders.forEach(folder => {
        const files = getFiles(folder);
        files.forEach(filePath => {
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                content += `\n================================================================================\n`;
                content += `File: ${filePath}\n`;
                content += `================================================================================\n\n`;
                content += data + "\n";
                fileCount++;
            } catch (e) {
                console.error(`Lỗi đọc file ${filePath}: ${e.message}`);
            }
        });
    });

    fs.writeFileSync(outputName, content);
    console.log(`✅ Đã tạo ${outputName} (${fileCount} files)`);
}

console.log("🎉 Hoàn tất! Hãy kéo thả 4 file .txt vừa tạo vào Gemini.");