// src/main.js
// Version 5.2 - Fix Demo Mode Conflict & Crash Guard
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { firebaseService } from './services/firebase.service.js';
import feather from 'feather-icons';
import './services/employeeService.js'; 
import { authService as auth } from './services/auth.service.js'; 
import { dataService } from './services/dataService.js'; 
import { analyticsService } from './services/analytics.service.js';

async function initializeApp() {
  try {
    // 1. Khởi tạo Firebase
    firebaseService.initCore();
    
    // 2. Setup Feather Icons (Global)
    window.feather = feather;

    // 3. Mount App
    mount(App, {
        target: document.getElementById('app'),
    });

    // [FIX] Gọi replace ngay sau khi mount để đảm bảo icon lần đầu
    setTimeout(() => {
        if (window.feather) window.feather.replace();
    }, 100);

    // 4. Bắt đầu luồng dữ liệu
    startDataFlow();

  } catch (e) {
    console.error("Lỗi khởi tạo:", e);
    // [FIX] Fallback nếu crash: Hiển thị thông báo lỗi thân thiện
    const appEl = document.getElementById('app');
    if (appEl) {
        appEl.innerHTML = `<div style="padding: 20px; color: #dc2626; font-family: sans-serif;">
            <h3>⚠️ Hệ thống gặp sự cố khởi động.</h3>
            <p>${e.message}</p>
            <button onclick="localStorage.removeItem('isDemoMode'); location.reload()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Thoát chế độ Demo & Tải lại
            </button>
        </div>`;
    }
  }
}

async function startDataFlow() {
    try {
        // [CRITICAL FIX] CHỐT CHẶN CHẾ ĐỘ DEMO
        // Nếu đang chạy Demo, TUYỆT ĐỐI KHÔNG kết nối Auth hay tải dữ liệu thật
        if (localStorage.getItem('isDemoMode') === 'true') {
            console.log("🛑 [Main] Phát hiện chế độ Demo. Đã chặn luồng dữ liệu thực (Real Data Flow).");
            return; 
        }

        // --- LUỒNG CHÍNH THỨC (CHỈ CHẠY KHI KHÔNG PHẢI DEMO) ---
        await auth.ensureAnonymousAuth();
        const isLoggedIn = auth.initAuth();
        
        if (isLoggedIn) {
            console.log("[Main] User logged in. Starting real data load sequence...");
            await dataService.loadAllFromCache();
            
            const email = localStorage.getItem('userEmail');
            if(email) analyticsService.upsertUserRecord(email);
        } else {
            console.log("[Main] User not logged in. Data load deferred.");
        }

    } catch (e) {
        console.error("Lỗi luồng dữ liệu:", e);
    }
}

initializeApp();