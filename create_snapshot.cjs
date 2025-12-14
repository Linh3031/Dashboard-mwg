// Version 4.1 - Switch Mode: "Logic Only" vs "Full Context"
// Cách dùng: Sửa biến 'CURRENT_MODE' ở dòng 10 để chọn chế độ mong muốn.

const fs = require('fs');
const path = require('path');

// --- CẤU HÌNH ---
// 1. CHỌN CHẾ ĐỘ QUÉT (Sửa dòng này khi cần):
// 'LOGIC': File siêu nhẹ (~100-200KB). Chỉ lấy code .svelte, .js. Bỏ qua data cứng, style, config rác. (Dùng hàng ngày)
// 'FULL' : File đầy đủ (~1-2MB). Lấy cả config, css, html. (Dùng khi debug lỗi lạ hoặc sửa giao diện)
const CURRENT_MODE = 'LOGIC'; 

const config = {
    rootDirectory: '.',
    outputFile: 'project_snapshot_svelte.txt',

    // Định nghĩa các đuôi file cho từng chế độ
    extensions: {
        LOGIC: ['.svelte', '.js', '.ts'], 
        FULL:  ['.svelte', '.js', '.ts', '.css', '.html', '.json', '.md']
    },

    // Những file/thư mục Luôn Luôn Bỏ Qua (Rác hệ thống)
    alwaysIgnore: [
        'node_modules', '.git', '.vscode', '.svelte-kit', 'dist', 'build', 'public', 'assets', '.firebase',
        'package-lock.json', 'bun.lockb', 'yarn.lock', '.DS_Store', 
        'project_snapshot_svelte.txt', 'create_snapshot.cjs'
    ],

    // Những file "Nặng" sẽ bị bỏ qua ở chế độ LOGIC (để giảm tải)
    // Nếu bạn cần sửa những file này, hãy chuyển sang chế độ FULL hoặc paste riêng vào chat.
    heavyFilesData: [
        'src/config.js',       // Data cứng rất dài -> Bỏ qua khi code logic
        'src/styles',          // CSS dài -> Bỏ qua khi code logic
        'README.md',
        'jsconfig.json',
        'vite.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'svelte.config.js'
    ],

    maxFileSize: 500 * 1024 // 500KB limit
};

// --- LOGIC XỬ LÝ ---

function shouldScanDirectory(dirName, fullPath) {
    if (dirName.startsWith('.') && dirName !== '.') return false;
    if (config.alwaysIgnore.includes(dirName)) return false;

    // Ở chế độ LOGIC, bỏ qua các thư mục nặng (như src/styles)
    if (CURRENT_MODE === 'LOGIC') {
        const relativePath = path.relative(config.rootDirectory, fullPath).replace(/\\/g, '/');
        if (config.heavyFilesData.some(pattern => relativePath.includes(pattern))) {
            return false;
        }
    }
    return true;
}

function shouldIncludeFile(filename, size, fullPath) {
    // 1. Kiểm tra danh sách đen cứng
    if (config.alwaysIgnore.includes(filename)) return false;
    if (filename.startsWith('.DS_Store')) return false;

    // 2. Kiểm tra dung lượng
    if (size > config.maxFileSize) return false;

    // 3. Logic lọc theo chế độ
    const relativePath = path.relative(config.rootDirectory, fullPath).replace(/\\/g, '/');

    if (CURRENT_MODE === 'LOGIC') {
        // Bỏ qua các file nặng/không cần thiết
        if (config.heavyFilesData.some(pattern => relativePath.includes(pattern))) {
            return false;
        }
        // Chỉ lấy file trong src/ (ngoại trừ package.json để biết dependency)
        if (!relativePath.startsWith('src/') && filename !== 'package.json') {
             return false; 
        }
    }

    // 4. Kiểm tra đuôi file
    const ext = path.extname(filename).toLowerCase();
    return config.extensions[CURRENT_MODE].includes(ext);
}

function scanDirectory(directory, fileList = []) {
    const items = fs.readdirSync(directory);

    items.forEach(item => {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            if (shouldScanDirectory(item, itemPath)) {
                scanDirectory(itemPath, fileList);
            }
        } else {
            if (shouldIncludeFile(item, stats.size, itemPath)) {
                fileList.push(itemPath);
            }
        }
    });

    return fileList;
}

function createSnapshot() {
    console.log(`🚀 Đang tạo Snapshot...`);
    console.log(`👉 Chế độ: ${CURRENT_MODE} (Sửa dòng 10 trong file này để đổi chế độ)`);
    
    if (CURRENT_MODE === 'LOGIC') {
        console.log(`ℹ️  Đang ẩn: config.js, styles/*, và các file cấu hình để tối ưu dung lượng.`);
    }

    if (fs.existsSync(config.outputFile)) {
        fs.unlinkSync(config.outputFile);
    }

    const allFiles = scanDirectory(config.rootDirectory);
    
    // Sắp xếp ưu tiên file quan trọng lên đầu
    allFiles.sort((a, b) => {
        const priority = ['App.svelte', 'main.js', 'stores.js'];
        const nameA = path.basename(a);
        const nameB = path.basename(b);
        if (priority.includes(nameA) && !priority.includes(nameB)) return -1;
        if (!priority.includes(nameA) && priority.includes(nameB)) return 1;
        return a.localeCompare(b);
    });

    let fileCount = 0;
    let totalSize = 0;

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
            console.log(`+ ${displayPath}`);
        } catch (err) {
            console.error(`❌ Lỗi: ${filepath}`);
        }
    });

    console.log(`\n✅ HOÀN TẤT!`);
    console.log(`📄 Số file: ${fileCount}`);
    console.log(`💾 Dung lượng: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`📂 File kết quả: ${config.outputFile}`);
}

createSnapshot();