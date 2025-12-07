// src/main.js
// Version 5.0 - Simplified Init Flow & Local Master Integration
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { firebaseService } from './services/firebase.service.js';
import feather from 'feather-icons';
import './services/employeeService.js'; // Giữ side-effect lắng nghe store
import { authService as auth } from './services/auth.service.js'; // Auth service
import { dataService } from './services/dataService.js'; // Data service
import { analyticsService } from './services/analytics.service.js';

async function initializeApp() {
  try {
    // 1. Khởi tạo Firebase (Core)
    firebaseService.initCore();
    
    // 2. Setup Feather Icons
    window.feather = feather;

    // 3. Mount ứng dụng UI ngay lập tức
    mount(App, {
        target: document.getElementById('app'),
    });

    // 4. Bắt đầu luồng dữ liệu (Async)
    startDataFlow();

  } catch (e) {
    console.error("Lỗi khởi tạo:", e);
  }
}

async function startDataFlow() {
    try {
        // 4.1. Xác thực (Ẩn danh -> Email Local)
        await auth.ensureAnonymousAuth();
        const isLoggedIn = auth.initAuth();
        
        if (isLoggedIn) {
            console.log("[Main] User logged in. Starting data load sequence...");
            
            // [QUAN TRỌNG] GỌI HÀM LOAD TUẦN TỰ MỚI
            // Hàm này đảm bảo DSNV lên trước, sau đó mới đến các file khác và Paste Data
            await dataService.loadAllFromCache();
            
            // Ghi nhận truy cập
            // Cần lấy email từ store hoặc localStorage nếu store chưa kịp update
            const email = localStorage.getItem('userEmail');
            if(email) analyticsService.upsertUserRecord(email);
        } else {
            console.log("[Main] User not logged in (waiting for LoginModal). Data load deferred.");
        }

    } catch (e) {
        console.error("Lỗi luồng dữ liệu:", e);
    }
}

initializeApp();