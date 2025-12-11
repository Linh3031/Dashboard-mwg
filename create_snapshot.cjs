// Version 3.0 - Chiến lược "Clean & Lean"
// 1. Whitelist: Chỉ lấy file code (.svelte, .js, .css...), bỏ qua mọi thứ khác.
// 2. Blacklist: Chặn cứng .DS_Store, node_modules, thư mục ẩn.
// 3. Size Limit: Tự động bỏ qua file text quá lớn (> 500KB) như file log hoặc file tham khảo.

const fs = require('fs');
const path = require('path');

// --- CẤU HÌNH ---
const config = {
    rootDirectory: '.', 
    outputFile: 'project_snapshot_svelte.txt',
    
    // 1. Chỉ chấp nhận những đuôi file này (Quan trọng để lọc rác binary)
    allowedExtensions: [
        '.svelte', 
        '.js', '.ts', '.cjs', '.mjs', 
        '.css', '.scss', '.postcss',
        '.html', 
        '.json', 
        '.md',
        '.txt' // Cẩn thận với file này, sẽ lọc bằng size limit bên dưới
    ],

    // 2. Thư mục BẮT BUỘC bỏ qua
    ignoredDirectories: [
        'node_modules',
        '.git',
        '.vscode',
        '.svelte-kit', // Build output
        'dist',
        'build',
        'public', // Thường chứa ảnh, không chứa logic code
        'assets'
    ],

    // 3. File BẮT BUỘC bỏ qua (tên cụ thể)
    ignoredFiles: [
        'package-lock.json', // Quá dài và không cần thiết để AI đọc logic
        'bun.lockb',
        'yarn.lock',
        '.DS_Store', // Rác macOS
        'project_snapshot_svelte.txt' // Tránh đệ quy (đọc chính file output)
    ],

    // 4. Giới hạn dung lượng: 500KB (File code hiếm khi nặng hơn mức này)
    // Giúp loại bỏ các file "Dự án gốc..." nặng hàng MB.
    maxFileSize: 500 * 1024 
};

// --- LOGIC XỬ LÝ ---

function shouldScanDirectory(dirName) {
    // Bỏ qua thư mục bắt đầu bằng dấu chấm (ẩn) trừ khi cần thiết (ở đây chặn hết cho an toàn)
    if (dirName.startsWith('.') && dirName !== '.') return false;
    return !config.ignoredDirectories.includes(dirName);
}

function shouldIncludeFile(filename, size) {
    // 1. Kiểm tra danh sách đen tên file
    if (config.ignoredFiles.includes(filename)) return false;
    if (filename.startsWith('.DS_Store')) return false; // Chặn biến thể

    // 2. Kiểm tra dung lượng
    if (size > config.maxFileSize) {
        console.warn(`⚠️  Bỏ qua file lớn (>500KB): ${filename}`);
        return false;
    }

    // 3. Kiểm tra đuôi file (Whitelist)
    const ext = path.extname(filename).toLowerCase();
    return config.allowedExtensions.includes(ext);
}

function scanDirectory(directory, fileList = []) {
    const items = fs.readdirSync(directory);

    items.forEach(item => {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            if (shouldScanDirectory(item)) {
                scanDirectory(itemPath, fileList);
            }
        } else {
            if (shouldIncludeFile(item, stats.size)) {
                fileList.push(itemPath);
            }
        }
    });

    return fileList;
}

function createSnapshot() {
    console.log("🚀 Đang bắt đầu quét dự án...");

    // Xóa file cũ nếu tồn tại
    if (fs.existsSync(config.outputFile)) {
        fs.unlinkSync(config.outputFile);
    }

    const allFiles = scanDirectory(config.rootDirectory);
    
    // Sắp xếp file để dễ đọc (ưu tiên file cấu hình ở root trước, sau đó tới src)
    allFiles.sort((a, b) => {
        const aDepth = a.split(path.sep).length;
        const bDepth = b.split(path.sep).length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        return a.localeCompare(b);
    });

    let fileCount = 0;
    let totalSize = 0;

    allFiles.forEach(filepath => {
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            
            // Chuẩn hóa đường dẫn
            const normalizedPath = filepath.replace(/\\/g, '/');
            
            // Nếu root là '.' thì bỏ './' ở đầu cho đẹp (tùy chọn)
            const displayPath = normalizedPath.startsWith('./') ? normalizedPath : `./${normalizedPath}`;

            const fileHeader = `--- START FILE: ${displayPath} ---\n`;
            const fileFooter = `\n--- END FILE: ${displayPath} ---\n\n`;

            fs.appendFileSync(config.outputFile, fileHeader);
            fs.appendFileSync(config.outputFile, content);
            fs.appendFileSync(config.outputFile, fileFooter);

            fileCount++;
            totalSize += content.length;
            console.log(`+ Đã thêm: ${displayPath}`);
        } catch (err) {
            console.error(`❌ Lỗi đọc file ${filepath}: ${err.message}`);
        }
    });

    console.log(`\n✅ HOÀN TẤT!`);
    console.log(`📄 Tổng số file: ${fileCount}`);
    console.log(`💾 Dung lượng snapshot: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`📂 Output: ${config.outputFile}`);
}

createSnapshot();