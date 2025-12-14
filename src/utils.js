// src/utils.js
// Version 2.5 - Added parseIdentity to fix configLoader error
import { get } from 'svelte/store';
import { categoryNameMapping, groupNameMapping, brandNameMapping } from './stores.js';

export function getRandomBrightColor() {
    const colors = [
        '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
        '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Hàm làm sạch cơ bản (Aggressive Mode).
 * Dùng để gợi ý tên hiển thị sạch sẽ.
 */
export function cleanNameRaw(name) {
    if (!name || typeof name !== 'string') return '';
    
    let cleaned = name;

    // 1. Loại bỏ cụm "Mã - " ở đầu (VD: "13 - ")
    cleaned = cleaned.replace(/^\d+\s*[-–]\s*/, ''); 

    // 2. Loại bỏ toàn bộ các ký tự số còn lại (nếu muốn tên chỉ có chữ)
    cleaned = cleaned.replace(/[0-9]/g, '');
    
    // 3. Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái (Unicode) và khoảng trắng
    cleaned = cleaned.replace(/[^\p{L}\s]/gu, ' ');

    return cleaned
        .trim()
        .replace(/\s+/g, ' ') // Gộp khoảng trắng thừa
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Viết hoa chữ cái đầu
        .join(' ');
}

export function cleanCategoryName(name) {
    if (!name) return '';
    const rawName = String(name).trim();
    const mappings = get(categoryNameMapping);
    if (mappings && mappings[rawName]) {
        return mappings[rawName];
    }
    return cleanNameRaw(rawName);
}

export function cleanGroupName(name) {
    if (!name) return '';
    const rawName = String(name).trim();
    const mappings = get(groupNameMapping);
    if (mappings && mappings[rawName]) {
        return mappings[rawName];
    }
    return cleanNameRaw(rawName);
}

export function cleanBrandName(name) {
    if (!name) return '';
    const rawName = String(name).trim();
    const mappings = get(brandNameMapping);
    if (mappings && mappings[rawName]) {
        return mappings[rawName];
    }
    return cleanNameRaw(rawName);
}

export function getSortedDepartmentList(reportData) {
    const allDepts = [...new Set(reportData.map(item => item.boPhan).filter(Boolean))];
    allDepts.sort((a, b) => {
        const aIsPriority = a.includes('Tư Vấn - ĐM');
        const bIsPriority = b.includes('Tư Vấn - ĐM');
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        return a.localeCompare(b);
    });
    return allDepts;
}

/**
 * [MỚI] Phân tích chuỗi định danh dạng "ID - Name" hoặc "ID-Name"
 * Trả về object { id, name }. Nếu không tìm thấy ID, id sẽ là 'unknown'
 */
export function parseIdentity(value) {
    if (!value || typeof value !== 'string') {
        return { id: 'unknown', name: '' };
    }
    
    // Regex bắt chuỗi dạng: "Số - Chữ" (VD: "1491 - Smartphone")
    // Hỗ trợ dấu gạch ngang (-) và gạch dài (–)
    const match = value.match(/^(\d+)\s*[-–]\s*(.+)$/);
    
    if (match) {
        return { 
            id: match[1].trim(), 
            name: match[2].trim() 
        };
    }
    
    // Trường hợp không có ID ở đầu
    return { id: 'unknown', name: value.trim() };
}