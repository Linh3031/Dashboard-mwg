// Version 1.2 - Thêm cấu hình onwarn để tắt cảnh báo CSS
import { fileURLToPath } from 'url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Dùng onwarn để tùy chỉnh cách xử lý cảnh báo
    onwarn: (warning, handler) => {
        // Chỉ bỏ qua cảnh báo CSS chưa sử dụng
        if (warning.code === 'css_unused_selector') {
            return;
        }

        // Với các cảnh báo khác, hãy dùng bộ xử lý mặc định
        handler(warning);
    }
};

export default config;