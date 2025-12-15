const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'project_snapshot.txt';

// Các thư mục và file cần BỎ QUA để file gọn nhẹ
const IGNORE_DIRS = [
    'node_modules', '.git', '.svelte-kit', 'dist', 'build', '.firebase', 'coverage', '.DS_Store'
];
const IGNORE_FILES = [
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', 
    'project_snapshot.txt', 'generate_snapshot.cjs', 'generate_snapshot.js', '.env'
];
const ALLOWED_EXTENSIONS = [
    '.js', '.ts', '.svelte', '.html', '.css', '.scss', '.json', '.md', '.txt'
];

function shouldIgnore(entryName) {
    return IGNORE_DIRS.includes(entryName) || IGNORE_FILES.includes(entryName);
}

// Hàm tạo cây thư mục (Tree structure) để AI dễ nhìn
function generateTree(dir, prefix = '') {
    let output = '';
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return '';
    }
    
    // Sắp xếp: Thư mục trước, File sau
    const filteredEntries = entries.filter(e => !shouldIgnore(e.name)).sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
        return a.isDirectory() ? -1 : 1;
    });

    filteredEntries.forEach((entry, index) => {
        const isLast = index === filteredEntries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';

        output += `${prefix}${connector}${entry.name}\n`;

        if (entry.isDirectory()) {
            output += generateTree(path.join(dir, entry.name), prefix + childPrefix);
        }
    });
    return output;
}

function getAllFiles(dir, fileList = []) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return fileList;
    }

    entries.forEach(entry => {
        if (shouldIgnore(entry.name)) return;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getAllFiles(fullPath, fileList);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (ALLOWED_EXTENSIONS.includes(ext)) {
                fileList.push(fullPath);
            }
        }
    });
    return fileList;
}

// --- THỰC THI CHÍNH ---
try {
    console.log('🔄 Đang tạo snapshot dự án...');
    let content = '';

    // 1. Ghi Cây Thư Mục (QUAN TRỌNG NHẤT)
    content += '================ PROJECT STRUCTURE ================\n';
    content += `root/\n${generateTree('.')}\n`;
    content += '===================================================\n\n';

    // 2. Ghi Nội Dung File
    const files = getAllFiles('.');
    files.forEach(filePath => {
        // Chuẩn hóa đường dẫn (dùng / thay vì \)
        const relativePath = './' + filePath.replace(/\\/g, '/');
        
        content += `--- START FILE: ${relativePath} ---\n`;
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            content += fileContent;
        } catch (e) {
            content += `[Error reading file: ${e.message}]`;
        }
        content += `\n--- END FILE: ${relativePath} ---\n\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`✅ Đã tạo snapshot thành công tại: ${OUTPUT_FILE}`);
    console.log(`📊 Tổng số file đã quét: ${files.length}`);

} catch (error) {
    console.error('❌ Lỗi khi tạo snapshot:', error);
}