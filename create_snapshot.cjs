/**
 * CREATE SNAPSHOT SCRIPT - VERSION 3.3 (FINAL FIX)
 * - Đã fix lỗi không chặn được src/config.js
 * - Đã chặn thư mục .history
 */
const fs = require('fs');
const path = require('path');

const config = {
    rootDirectory: '.', 
    outputFile: 'project_snapshot_svelte.txt',
    
    // Chỉ lấy code nguồn
    allowedExtensions: [
        '.svelte', '.js', '.ts', '.cjs', '.mjs', 
        '.css', '.html', '.json'
    ],

    // Thư mục rác cần bỏ qua
    ignoredDirectories: [
        'node_modules', '.git', '.vscode', '.history', '.idea',
        '.svelte-kit', 'dist', 'build', 'public', 'assets', 
        'images', 'fonts', 'coverage', 'tmp', 'temp'
    ],

    // File rác hoặc file data lớn cần bỏ qua
    ignoredFiles: [
        'package-lock.json',
        'bun.lockb',
        'yarn.lock',
        '.DS_Store',
        '.env',
        'README.md',
        'project_snapshot_svelte.txt', 
        'create_snapshot.cjs',
        
        // --- CHẶN CÁC FILE NẶNG CỤ THỂ ---
        'src/config.js',   // Chặn file data cứng
        'config.js',       
        'data.js'
    ],

    maxFileSize: 200 * 1024 // 200KB
};

// --- LOGIC MỚI: So sánh đường dẫn chính xác hơn ---
function shouldIgnoreFile(fileName, relativePath) {
    // 1. Check tên file (VD: package-lock.json)
    if (config.ignoredFiles.includes(fileName)) return true;
    
    // 2. Check đường dẫn (VD: src/config.js) -> Chuẩn hóa dấu \ thành /
    const normalizedPath = relativePath.replace(/\\/g, '/'); 
    
    // Check chính xác hoặc check đuôi
    if (config.ignoredFiles.some(ignore => normalizedPath.endsWith(ignore))) return true;

    return false;
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!config.ignoredDirectories.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            const fileName = path.basename(file);
            const relativePath = path.relative(config.rootDirectory, fullPath);

            // Logic chặn cải tiến
            if (shouldIgnoreFile(fileName, relativePath)) return;
            
            if (!config.allowedExtensions.includes(ext)) return;
            if (stat.size > config.maxFileSize) return;

            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

console.log("🚀 Đang tạo snapshot v3.3...");

if (fs.existsSync(config.outputFile)) {
    fs.unlinkSync(config.outputFile);
}

try {
    const allFiles = getAllFiles(config.rootDirectory);
    allFiles.sort(); // Sắp xếp tên file

    let fileCount = 0;
    let totalSize = 0;

    console.log(`🔍 Tìm thấy ${allFiles.length} file mã nguồn.`);

    allFiles.forEach(filepath => {
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            const normalizedPath = filepath.replace(/\\/g, '/');
            const displayPath = normalizedPath.startsWith('./') ? normalizedPath : `./${normalizedPath}`;

            const fileHeader = `--- START FILE: ${displayPath} ---\n`;
            const fileFooter = `\n--- END FILE: ${displayPath} ---\n\n`;

            fs.appendFileSync(config.outputFile, fileHeader);
            fs.appendFileSync(config.outputFile, content);
            fs.appendFileSync(config.outputFile, fileFooter);

            fileCount++;
            totalSize += content.length;
        } catch (err) {}
    });

    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`\n✅ HOÀN TẤT!`);
    console.log(`📄 Tổng số file: ${fileCount}`);
    console.log(`💾 Dung lượng: ${sizeInMB} MB`);

} catch (error) {
    console.error("Lỗi:", error);
}