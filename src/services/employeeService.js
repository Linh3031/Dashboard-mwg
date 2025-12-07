// src/services/employeeService.js
// Version 1.1 - Fix Warehouse Selector auto-reset bug on F5
// MỤC ĐÍCH: Chỉ quản lý state của nhân viên và kho.
import { get } from 'svelte/store';
import {
    danhSachNhanVien,
    employeeMaNVMap,
    employeeNameToMaNVMap,
    warehouseList,
    selectedWarehouse
} from '../stores.js';

/**
 * Logic "Tự động lắng nghe".
 * Tự động chạy mỗi khi store 'danhSachNhanVien' bị thay đổi.
 */
danhSachNhanVien.subscribe($danhSachNhanVien => {
    const newMaNVMap = new Map();
    const newNameMap = new Map();
    const newWarehouseList = new Set(); 

    if (!$danhSachNhanVien || $danhSachNhanVien.length === 0) {
        console.warn("[EmployeeService] DSNV rỗng, không thể tạo maps và danh sách kho.");
    } else {
        $danhSachNhanVien.forEach(nv => {
            if (nv.maNV) newMaNVMap.set(String(nv.maNV).trim(), nv);
            if (nv.hoTen) newNameMap.set(nv.hoTen.toLowerCase().replace(/\s+/g, ' '), String(nv.maNV).trim());
            if (nv.maKho) newWarehouseList.add(String(nv.maKho).trim());
        });
  
        console.log(`[EmployeeService] Đã tự động cập nhật Employee Maps: ${newMaNVMap.size} MSNV, ${newNameMap.size} Tên.`);
    }

    // Cập nhật các stores
    employeeMaNVMap.set(newMaNVMap);
    employeeNameToMaNVMap.set(newNameMap);
    
    const sortedWarehouses = [...newWarehouseList].sort();
    warehouseList.set(sortedWarehouses);
    
    // Tự động chọn kho đã lưu
    const savedWarehouse = localStorage.getItem('selectedWarehouse');
    const currentSelected = get(selectedWarehouse);

    if (savedWarehouse && newWarehouseList.has(savedWarehouse)) {
        // Trường hợp 1: Có kho lưu trong LocalStorage và nó hợp lệ trong danh sách mới
        if (currentSelected !== savedWarehouse) {
            selectedWarehouse.set(savedWarehouse);
            console.log(`[EmployeeService] Đã tự động chọn kho đã lưu: ${savedWarehouse}`);
        }
    } else if (currentSelected) {
        // Trường hợp 2: Đang có kho được chọn trong Store
        // [FIX] Chỉ reset nếu danh sách kho MỚI có dữ liệu (đã tải xong) nhưng không chứa kho hiện tại.
        // Nếu danh sách rỗng (đang tải), GIỮ NGUYÊN để tránh reset nhầm khi F5.
        if (newWarehouseList.size > 0 && !newWarehouseList.has(currentSelected)) {
            selectedWarehouse.set(null);
            localStorage.removeItem('selectedWarehouse');
            console.warn(`[EmployeeService] Kho đã chọn (${currentSelected}) không còn tồn tại trong danh sách mới. Đã reset.`);
        } else {
             console.log(`[EmployeeService] Giữ nguyên kho ${currentSelected} (Danh sách kho đang tải hoặc kho hợp lệ).`);
        }
    }
});