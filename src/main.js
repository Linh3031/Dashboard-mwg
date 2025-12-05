// File: src/main.js
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { get } from 'svelte/store'; // Để đọc giá trị store
import * as dataService from './services/dataService.js'
import { firebaseService } from './services/firebase.service.js';
import { adminService } from './services/admin.service.js'; // Import Admin Service
import './services/employeeService.js'; 
import { 
    declarations, 
    categoryStructure, 
    brandList, 
    specialProductList,
    competitionNameMappings,
    globalCompetitionConfigs,
    globalSpecialPrograms,
    helpContent
} from './stores.js'; // Import các store
import { config } from './config.js'; // Import dữ liệu mặc định

import feather from 'feather-icons';

async function loadInitialData() {
    console.log("[main.js] Bắt đầu tải dữ liệu khởi tạo...");
    
    // 1. Tải Khai báo tính toán (Hệ số, Hình thức xuất...)
    try {
        const cloudDecl = await adminService.loadDeclarationsFromFirestore();
        // Logic: Nếu Cloud có dữ liệu thì dùng, nếu không thì dùng mặc định từ config.js
        declarations.set({
            hinhThucXuat: cloudDecl.hinhThucXuat || config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU.join('\n'),
            hinhThucXuatGop: cloudDecl.hinhThucXuatGop || config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP.join('\n'),
            heSoQuyDoi: cloudDecl.heSoQuyDoi || Object.entries(config.DEFAULT_DATA.HE_SO_QUY_DOI).map(([k, v]) => `${k},${v}`).join('\n')
        });
        console.log("[main.js] Đã tải Declarations (Khai báo tính toán).");
    } catch (e) { console.error("Lỗi tải Declarations:", e); }

    // 2. Tải Danh mục ngành hàng & Hãng
    try {
        const { categories, brands } = await adminService.loadCategoryDataFromFirestore();
        if (categories.length > 0) categoryStructure.set(categories);
        if (brands.length > 0) brandList.set(brands);
        console.log(`[main.js] Đã tải ${categories.length} nhóm hàng và ${brands.length} hãng.`);
    } catch (e) { console.error("Lỗi tải Category/Brand:", e); }

    // 3. Tải Danh sách SP Đặc quyền
    try {
        const products = await adminService.loadSpecialProductList();
        if (products.length > 0) specialProductList.set(products);
        console.log(`[main.js] Đã tải ${products.length} SP Đặc quyền.`);
    } catch (e) { console.error("Lỗi tải SPĐQ:", e); }

    // 4. Tải Mapping tên thi đua
    try {
        const mappings = await adminService.loadCompetitionNameMappings();
        competitionNameMappings.set(mappings);
    } catch (e) { console.error("Lỗi tải Mapping:", e); }

    // 5. Tải Cấu hình Thi đua Global & Special Programs (Nếu có)
    try {
        const globalComps = await adminService.loadGlobalCompetitionConfigs();
        if (globalComps.length > 0) globalCompetitionConfigs.set(globalComps);
        
        const globalProgs = await adminService.loadGlobalSpecialPrograms();
        if (globalProgs.length > 0) globalSpecialPrograms.set(globalProgs);
    } catch (e) { console.error("Lỗi tải Configs:", e); }

    // 6. Tải nội dung Hướng dẫn (Help Content)
    try {
        // Hàm này chưa có trong adminService ở bước trước, cần kiểm tra lại adminService nếu muốn load
        // Tạm thời bỏ qua hoặc thêm vào adminService sau
    } catch (e) {}
}

async function initializeApp() {
  try {
    window.feather = feather;
    
    // 1. Khởi tạo Firebase
    firebaseService.initCore();
    
    // 2. Tải dữ liệu từ Cache (IndexedDB/LocalStorage) cho các file Excel đã tải
    await dataService.loadAllFromCache();

    // 3. Tải dữ liệu cấu hình/khai báo từ Cloud (hoặc Default)
    await loadInitialData();

  } catch (e) {
    console.error("Lỗi khởi tạo:", e);
  }

  const app = mount(App, {
    target: document.getElementById('app'),
  })

  feather.replace();
  return app;
}

initializeApp();