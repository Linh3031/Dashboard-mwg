// Version 2.0 - Chuyển sang logic "Block List" mạnh mẽ hơn
// Bỏ qua thư mục ẩn, thư mục build, và các file media.

const fs = require('fs');
const path = require('path');

// --- CẤU HÌNH ---
const config = {
    // Thư mục gốc để bắt đầu quét
    rootDirectory: '.', 
    
    // Tên file output
    outputFile: 'project_snapshot_svelte.txt',
    
    // (MỚI) Bỏ qua các thư mục này VÀ bất kỳ thư mục nào bắt đầu bằng '.'
    excludeDirectories: [
        'node_modules', 
        // '.git', // Không cần nữa, logic mới sẽ bắt
        // '.vscode', // Không cần nữa, logic mới sẽ bắt
        '.svelte-kit', // Thư mục build của SvelteKit
        'dist',         // Thư mục build chung
        'build',        // Thư mục build chung
        'public',       // Thư mục public (thường chứa assets)
        'assets'        // Thường chứa ảnh/font, không cần cho logic
    ],
    
    // (MỚI) Bỏ qua các đuôi file media/nhị phân không đọc được
    excludeExtensions: [
        // Ảnh
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
        // Fonts
        '.woff', '.woff2', '.ttf', '.otf', '.eot',
        // Video/Audio
        '.mp4', '.webm', '.ogg', '.mp3',
        // Tài liệu
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        // Hệ thống
        '.DS_Store'
    ],
    
    // (CẬP NHẬT) Bỏ qua các file cụ thể (chỉ cần tên file)
    excludeFiles: [
        'project_snapshot_svelte.txt', // Chính nó
        'project_snapshot.txt',
        'create_snapshot.cjs',  // File script này (sửa từ .js)
        'package-lock.json',
        'yarn.lock',
        '.gitignore',
        '.env',
        '.env.local'
    ]
};

// --- LOGIC CHÍNH ---

function walkDirectory(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        const relativePath = path.relative(config.rootDirectory, filepath);
        
        // Chuẩn hóa đường dẫn (luôn dùng '/')
        const normalizedPath = relativePath.replace(/\\/g, '/');

        // QUY TẮC 1: Bỏ qua nếu là file bị loại trừ (so sánh tên file)
        if (config.excludeFiles.includes(path.basename(file))) {
            return;
        }

        // QUY TẮC 2: Bỏ qua nếu là thư mục
        if (stat.isDirectory()) {
            const dirName = path.basename(file);
            
            // Bỏ qua nếu là thư mục ẩn (bắt đầu bằng '.') HOẶC nằm trong danh sách loại trừ
            if (dirName.startsWith('.') || config.excludeDirectories.includes(dirName)) {
                // console.log(`Bỏ qua thư mục: ${normalizedPath}`); // Dùng để debug
                return;
            }
            
            // Nếu không bị loại trừ -> Tiếp tục đệ quy
            filelist = walkDirectory(filepath, filelist);
        } 
        // QUY TẮC 3: Nếu là file
        else if (stat.isFile()) {
            // Bỏ qua nếu có đuôi file bị loại trừ
            const ext = path.extname(file).toLowerCase();
            if (config.excludeExtensions.includes(ext)) {
                // console.log(`Bỏ qua file (đuôi file): ${normalizedPath}`); // Dùng để debug
                return;
            }
            
            // Nếu vượt qua tất cả, thêm vào danh sách
            filelist.push(filepath);
        }
    });
    return filelist;
}

// Hàm chính để chạy kịch bản (Đã cập nhật để xử lý lỗi đọc file)
function createSnapshot() {
    console.log('Bắt đầu quá trình tạo snapshot dự án (Phiên bản 2.0)...');
    
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
            
            // Thêm './' vào đầu để khớp định dạng chuẩn
            const fileHeader = `--- START FILE: ./${normalizedPath} ---\n`;
            const fileFooter = `\n--- END FILE: ./${normalizedPath} ---\n\n`;
            
            fs.appendFileSync(config.outputFile, fileHeader);
            fs.appendFileSync(config.outputFile, content);
            fs.appendFileSync(config.outputFile, fileFooter);
        } catch (err) {
            // (MỚI) Thêm xử lý lỗi cho file nhị phân (binary) hoặc file không đọc được UTF-8
            if (err.code === 'EILSEQ' || err.message.includes('invalid') || err.message.includes('UTF-8')) {
                console.warn(`! Bỏ qua file (lỗi đọc UTF-8, có thể là file nhị phân): ${filepath}`);
            } else {
                console.error(`Lỗi khi đọc file ${filepath}:`, err);
            }
        }
    });

    console.log(`\x1b[32m%s\x1b[0m`, `✅ Đã tạo thành công file '${config.outputFile}' với ${allFiles.length} file.`);
    console.log('Bạn có thể tải file này lên cửa sổ chat mới.');
}

// Chạy hàm chính
createSnapshot();