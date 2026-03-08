// src/main.js
// Version 5.3 - Phẫu Thuật Logic: Lưới Phòng Thủ Phiên Bản
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { firebaseService } from './services/firebase.service.js';
import feather from 'feather-icons';
import './services/employeeService.js'; 
import { authService as auth } from './services/auth.service.js'; 
import { dataService } from './services/dataService.js'; 
import { analyticsService } from './services/analytics.service.js';

// [GENESIS FIX] Import Store để lấy dữ liệu trạm phát sóng
import { get } from 'svelte/store';
import { latestSystemVersion } from './stores.js';

// === [PHÒNG THỦ 1] BẮT LỖI CHUNK DO CACHE ===
window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('Failed to fetch dynamically imported module') || e.message.includes('Importing a module script failed'))) {
        console.warn('[System] Phát hiện phiên bản mới do lỗi nạp module. Đang ép F5...');
        window.location.reload(true);
    }
});

window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.message && (e.reason.message.includes('Failed to fetch dynamically imported module') || e.reason.message.includes('Importing a module script failed'))) {
        console.warn('[System] Phát hiện phiên bản mới do lỗi nạp module. Đang ép F5...');
        window.location.reload(true);
    }
});

// === [PHÒNG THỦ 2] ĐÁNH CHẶN HÀNH ĐỘNG (INTERCEPTOR) ===
// Bạn gọi hàm này ở đầu các sự kiện click up file / submit form
window.verifyVersionBeforeAction = function() {
    const clientVer = localStorage.getItem('app_client_version');
    const systemVer = get(latestSystemVersion);
    
    if (systemVer && clientVer && systemVer !== clientVer) {
        console.warn(`[System] Đã chặn hành động: App đang dùng bản (${clientVer}), Server yêu cầu bản (${systemVer}).`);
        // Ép F5 văng ra bản mới nhất ngay lập tức
        window.location.reload(true);
        return false; 
    }
    return true; 
};

// ===============================================

async function initializeApp() {
  try {
    firebaseService.initCore();
    window.feather = feather;

    mount(App, {
        target: document.getElementById('app'),
    });

    setTimeout(() => {
        if (window.feather) window.feather.replace();
    }, 100);

    startDataFlow();

  } catch (e) {
    console.error("Lỗi khởi tạo:", e);
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
        if (localStorage.getItem('isDemoMode') === 'true') {
            console.log("🛑 [Main] Phát hiện chế độ Demo. Đã chặn luồng dữ liệu thực.");
            return; 
        }

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