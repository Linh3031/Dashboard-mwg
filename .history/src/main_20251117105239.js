// File: src/main.js
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { dataService } from './services/dataService.js' // <-- BƯỚC 1: IMPORT

/**
 * Hàm khởi tạo chính
 */
async function initializeApp() {
  // BƯỚC 2: Tải tất cả dữ liệu từ cache (IndexedDB & LocalStorage)
  // Logic này được lấy từ main.js gốc
  await dataService.loadAllFromCache();

  // BƯỚC 3: Gắn ứng dụng Svelte SAU KHI đã tải cache
  const app = mount(App, {
    target: document.getElementById('app'),
  })

  // Export app (giữ nguyên)
  return app;
}

// BƯỚC 4: Chạy hàm khởi tạo
initializeApp();

// (Không export app mặc định nữa, vì nó được khởi tạo bất đồng bộ)
// export default app