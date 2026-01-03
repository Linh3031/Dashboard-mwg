/* TOOL: Project Context Slicer v2.0 - Domain Driven Snapshot
   Run: node make_snapshot_v2.js
*/
import fs from 'fs';
import path from 'path';

// --- CẤU HÌNH PHÂN CHIA (DOMAIN DRIVEN) ---
const GROUPS = {
    // 1. LÕI HỆ THỐNG (Luôn cần khi fix logic/data)
    'SNAP_00_CORE.txt': [
        'src/stores.js', 
        'src/main.js', 
        'src/App.svelte', 
        'src/config.js',
        'src/services',     // Toàn bộ logic xử lý, API, Parser
        'src/utils',        // Formatter, Helper
        'src/styles'        // CSS Global
    ],

    // 2. TAB: SỨC KHỎE NHÂN VIÊN (SKNV) - Bao gồm cả Thi đua, Performance
    'SNAP_01_SKNV.txt': [
        'src/components/health-staff',
        'src/components/HealthSection.svelte', 
        'src/components/HealthEmployeeSection.svelte'
    ],

    // 3. TAB: REALTIME (Báo cáo tức thời)
    'SNAP_02_REALTIME.txt': [
        'src/components/realtime',
        // Nếu có file lẻ nào ở root components liên quan realtime thì thêm vào đây
    ],

    // 4. TAB: LŨY KẾ (Báo cáo tổng hợp)
    'SNAP_03_LUYKE.txt': [
        'src/components/luyke',
        'src/styles/dashboard-luyke.css'
    ],

    // 5. ADMIN & CẤU HÌNH (Dành cho việc setup)
    'SNAP_04_ADMIN.txt': [
        'src/components/admin',
        'src/components/DeclarationSection.svelte', // Khai báo
        'src/components/DataSection.svelte'         // Nạp dữ liệu
    ],

    // 6. MODALS & SHARED (Các thành phần dùng chung)
    'SNAP_05_SHARED.txt': [
        'src/components/modals',
        'src/components/common',
        'src/components/Sidebar.svelte',
        'src/components/drawers'
    ]
};

// Hàm quét file đệ quy (Giữ nguyên logic cũ nhưng tối ưu log)
function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    // Nếu path là file cụ thể (VD: src/stores.js)
    if (fs.statSync(dir).isFile()) return [dir];

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            // Chỉ lấy các file code text quan trọng
            if (/\.(svelte|js|ts|css|html|json|md)$/.test(file)) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

// --- THỰC THI ---
console.log("🚀 [CodeGenesis] Đang tạo Snapshot theo Chức Năng...");
console.log("----------------------------------------------------");

for (const [outputName, paths] of Object.entries(GROUPS)) {
    let content = `CONTEXT GROUP: ${outputName}\n`;
    content += `GENERATED AT: ${new Date().toLocaleString()}\n\n`;
    let fileCount = 0;

    paths.forEach(p => {
        const files = getFiles(p);
        files.forEach(filePath => {
            try {
                // Đọc file và thêm header rõ ràng cho AI dễ parse
                const data = fs.readFileSync(filePath, 'utf8');
                content += `\n>>> FILE_START: ${filePath}\n`;
                content += data + "\n";
                content += `<<< FILE_END: ${filePath}\n`;
                fileCount++;
            } catch (e) {
                console.error(`⚠️ Lỗi đọc file ${filePath}: ${e.message}`);
            }
        });
    });

    fs.writeFileSync(outputName, content);
    console.log(`📦 ${outputName.padEnd(25)}: ${fileCount} files`);
}

console.log("----------------------------------------------------");
console.log("✅ HOÀN TẤT! Hướng dẫn sử dụng:");
console.log("   - Fix logic chung/Dữ liệu sai:  Gửi 'SNAP_00_CORE.txt'");
console.log("   - Fix lỗi Tab Thi Đua/SKNV:     Gửi 'SNAP_00_CORE.txt' + 'SNAP_01_SKNV.txt'");
console.log("   - Fix lỗi Admin/Cấu hình:       Gửi 'SNAP_04_ADMIN.txt'");