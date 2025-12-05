// File: src/main.js
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import * as dataService from './services/dataService.js'
import { firebaseService } from './services/firebase.service.js';
import './services/employeeService.js'; 

// --- CODE CHUẨN: Import trực tiếp ---
import feather from 'feather-icons'; 
// -----------------------------------

async function initializeApp() {
  try {
    // Đưa ra window để các component con dùng chung
    window.feather = feather;
    
    firebaseService.initCore();
  } catch (e) {
    console.error("Lỗi khởi tạo:", e);
  }

  await dataService.loadAllFromCache();

  const app = mount(App, {
    target: document.getElementById('app'),
  })

  // Chạy 1 lần duy nhất khi app tải xong
  feather.replace();

  return app;
}

initializeApp();