// src/main.js
// Version 5.1 - Fix Crash & Feather Fallback
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
    // [FIX] Fallback nếu crash: Ít nhất cũng hiển thị thông báo lỗi đẹp
    document.getElementById('app').innerHTML = `<div style="padding: 20px; color: red;"><h3>Hệ thống gặp sự cố khởi động.</h3><p>${e.message}</p><button onclick="location.reload()">Tải lại trang</button></div>`;
  }
}

async function startDataFlow() {
    try {
        await auth.ensureAnonymousAuth();
        const isLoggedIn = auth.initAuth();
        
        if (isLoggedIn) {
            console.log("[Main] User logged in. Starting data load sequence...");
            await dataService.loadAllFromCache();
            
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