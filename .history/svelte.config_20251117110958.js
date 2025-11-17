// Version 1.1 - Thêm cấu hình onwarn để tắt cảnh báo CSS
import { fileURLToPath } from 'url';

// File này là cần thiết để cấu hình Language Server
/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Thêm onwarn để tùy chỉnh cách xử lý cảnh báo
    onwarn: (warning, handler) => {
        // Kiểm tra mã cảnh báo có phải là 'css_unused_selector' không
        if (warning.code === 'css_unused_selector') {
            // Chúng ta không làm gì, nghĩa là bỏ qua nó
            return;
        }

        // Với các cảnh báo khác, hãy dùng bộ xử lý mặc định
        handler(warning);
    }
};

export default config;