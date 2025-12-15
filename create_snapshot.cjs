/*
 * CodeGenesis Gem - Optimized Snapshot Script
 * Phiên bản: 3.0 (Anti-History & Size Limit)
 * Fix lỗi: Loại bỏ folder .history (Local History plugin) gây nặng file.
 */

const fs = require('fs');
const path = require('path');

// 1. CẤU HÌNH OUTPUT
const OUTPUT_FILE = 'project_snapshot.txt';
const MAX_FILE_SIZE_KB = 100; // Bỏ qua file > 100KB

// 2. DANH SÁCH LOẠI TRỪ (BLACKLIST)
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.history',      // <--- THỦ PHẠM CHÍNH
  '.vscode',
  '.svelte-kit',
  '.idea',
  'dist',
  'build',
  'coverage',
  'public',
  'assets',
  'luyke'          // Thấy trong ảnh có folder này, nếu là data rác thì bỏ qua, nếu cần code thì xóa dòng này
];

const IGNORE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.DS_Store',
  '.env',
  '.env.local',
  OUTPUT_FILE,
  'create_snapshot.cjs',
  'project_snapshot_full.txt',
  'project_snapshot_svelte.txt'
];

// 3. DANH SÁCH CHO PHÉP (WHITELIST)
const ALLOWED_EXTENSIONS = [
  '.js', '.cjs', '.mjs', '.ts',
  '.svelte',
  '.css', '.scss', '.postcss',
  '.html',
  '.json',
  '.md'
];

function isAllowedFile(filePath, sizeBytes) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  // 1. Check Blacklist tên file
  if (IGNORE_FILES.includes(fileName)) return false;
  
  // 2. Check đuôi file (chỉ lấy code)
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;

  // 3. Check kích thước (Chặn file quá lớn)
  if (sizeBytes > MAX_FILE_SIZE_KB * 1024) {
    console.warn(`⚠️  Skipped large file: ${fileName} (${(sizeBytes/1024).toFixed(1)} KB)`);
    return false;
  }

  // 4. Logic riêng cho JSON (chỉ lấy config)
  if (ext === '.json') {
    const allowedJsons = ['package.json', 'tsconfig.json', 'jsconfig.json', 'svelte.config.js', 'tailwind.config.js'];
    return allowedJsons.includes(fileName);
  }

  return true;
}

function processDirectory(dir, outputStream) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return;
  }

  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    // Bỏ qua nếu path chứa folder bị cấm (như .history)
    if (IGNORE_DIRS.some(ignored => fullPath.includes(path.sep + ignored) || fullPath.includes(ignored + path.sep))) {
      continue;
    }

    try {
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!IGNORE_DIRS.includes(file)) {
          processDirectory(fullPath, outputStream);
        }
      } else {
        if (isAllowedFile(fullPath, stat.size)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          outputStream.write(`\n================================================================================\n`);
          outputStream.write(`File: ${fullPath}\n`);
          outputStream.write(`================================================================================\n\n`);
          outputStream.write(content);
          outputStream.write(`\n\n`);
        }
      }
    } catch (err) {
      // Ignore error
    }
  }
}

function createSnapshot() {
  console.log('🚀 Đang tạo snapshot (đã lọc .history)...');
  
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  const stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
  stream.write(`# PROJECT SNAPSHOT v3\n# Excluded: .history, node_modules\n\n`);

  processDirectory('.', stream);

  stream.end();
  
  stream.on('finish', () => {
    const size = fs.statSync(OUTPUT_FILE).size / 1024;
    console.log(`✅ Hoàn tất! File mới: ${(size/1024).toFixed(2)} MB (${size.toFixed(0)} KB)`);
  });
}

createSnapshot();