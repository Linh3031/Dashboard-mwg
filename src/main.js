// Version 2.0 - Fix slow load: Mount App immediately, load data async in App.svelte
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { firebaseService } from './services/firebase.service.js';
import feather from 'feather-icons';
import './services/employeeService.js'; // Giữ side-effect lắng nghe store

async function initializeApp() {
  try {
    // 1. Khởi tạo Firebase trước (nhanh)
    firebaseService.initCore();
    
    // 2. Setup Feather Icons toàn cục
    window.feather = feather;

  } catch (e) {
    console.error("Lỗi khởi tạo Firebase/Feather:", e);
  }

  // 3. Mount ứng dụng NGAY LẬP TỨC (Không chờ dữ liệu)
  const app = mount(App, {
    target: document.getElementById('app'),
  });

  return app;
}

initializeApp();