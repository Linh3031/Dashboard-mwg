// File: src/main.js
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

// === SỬA LỖI: Đổi import { dataService } thành import * as dataService ===
import * as dataService from './services/dataService.js'

/**
 * Hàm khởi tạo chính
 */
async function initializeApp() {
  // BƯỚC 2: Tải tất cả dữ liệu từ cache (IndexedDB & LocalStorage)
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