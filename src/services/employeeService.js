// File: src/services/employeeService.js
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
 * [cite: 2361-2366]
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
    if (savedWarehouse && newWarehouseList.has(savedWarehouse)) {
        selectedWarehouse.set(savedWarehouse);
        console.log(`[EmployeeService] Đã tự động chọn kho đã lưu: ${savedWarehouse}`);
    } else if (get(selectedWarehouse)) {
        // Nếu kho đang chọn không còn tồn tại trong DSNV mới, reset nó
        selectedWarehouse.set(null);
        localStorage.removeItem('selectedWarehouse');
        console.warn(`[EmployeeService] Kho đã chọn (${get(selectedWarehouse)}) không còn tồn tại. Đã reset.`);
    }
});