// Kịch bản Node.js chuyên dụng để tạo snapshot toàn diện cho dự án
// Phiên bản 1.2 - Thêm logic loại trừ file cụ thể (excludeFiles)

const fs = require('fs');
const path = require('path');

// --- CẤU HÌNH ---
const config = {
    // Thư mục gốc để bắt đầu quét (để '.' là thư mục hiện tại)
    rootDirectory: '.', 
    
    // Tên file output
    outputFile: 'project_snapshot_svelte.txt',
    
    // Các đuôi file cần lấy nội dung
    // (Thêm .svelte, .config.js, .js, .html, .css)
    includeExtensions: [
        '.js', 
        '.svelte', 
        '.html', 
        '.css', 
        '.json'
    ],
    
    // Các thư mục cần bỏ qua
    excludeDirectories: [
        'node_modules', 
        '.git', 
        '.vscode', // Bỏ qua cài đặt VSCode
        'public'    // Bỏ qua thư mục public (thường chứa assets)
    ],
    
    // Các file cụ thể cần bỏ qua (sử dụng đường dẫn tương đối)
    excludeFiles: [
        'project_snapshot_svelte.txt', 
        'project_snapshot.txt',  // Loại bỏ chính file snapshot
        'create_snapshot.js',     // Loại bỏ file script này
        'package-lock.json',      // Bỏ qua file lock, rất lớn và không cần thiết
        '.gitignore'              // Bỏ qua file gitignore
    ]
};

// --- LOGIC CHÍNH ---

// Hàm đệ quy để duyệt qua các thư mục
function walkDirectory(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);

        // Chuẩn hóa đường dẫn để so sánh (vd: 'folder/file.js')
        // Dùng path.relative để có đường dẫn 'src/App.svelte' thay vì './src/App.svelte'
        const relativePath = path.relative(config.rootDirectory, filepath);
        const normalizedPath = relativePath.replace(/\\/g, '/');

        // Bỏ qua nếu file nằm trong danh sách loại trừ file
        if (config.excludeFiles.includes(normalizedPath)) {
            return; 
        }

        // Nếu là thư mục và không nằm trong danh sách loại trừ -> tiếp tục duyệt
        if (stat.isDirectory() && !config.excludeDirectories.includes(file)) {
            filelist = walkDirectory(filepath, filelist);
        } 
        // Nếu là file và có đuôi file nằm trong danh sách cho phép -> thêm vào danh sách
        else if (stat.isFile() && config.includeExtensions.includes(path.extname(file))) {
            filelist.push(filepath);
        }
    });
    return filelist;
}

// Hàm chính để chạy kịch bản
function createSnapshot() {
    console.log('Bắt đầu quá trình tạo snapshot dự án Svelte...');
    
    const allFiles = walkDirectory(config.rootDirectory);

    if (fs.existsSync(config.outputFile)) {
        fs.unlinkSync(config.outputFile);
        console.log(`Đã xóa file snapshot cũ: ${config.outputFile}`);
    }

    allFiles.forEach(filepath => {
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            // Chuẩn hóa đường dẫn để luôn dùng dấu gạch chéo '/'
            const normalizedPath = path.normalize(filepath).replace(/\\/g, '/');
            const fileHeader = `--- START FILE: ./${normalizedPath} ---\n`;
            const fileFooter = `\n--- END FILE: ./${normalizedPath} ---\n\n`;
            
            fs.appendFileSync(config.outputFile, fileHeader);
            fs.appendFileSync(config.outputFile, content);
            fs.appendFileSync(config.outputFile, fileFooter);
        } catch (err) {
            console.error(`Lỗi khi đọc file ${filepath}:`, err);
        }
    });

    console.log(`\x1b[32m%s\x1b[0m`, `✅ Đã tạo thành công file '${config.outputFile}' với ${allFiles.length} file.`);
    console.log('Bạn có thể tải file này lên cửa sổ chat mới.');
}

// Chạy hàm chính
createSnapshot();