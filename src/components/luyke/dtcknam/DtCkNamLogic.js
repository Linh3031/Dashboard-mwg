// src/components/luyke/dtcknam/DtCkNamLogic.js
import { formatters } from '../../../utils/formatters.js';
import { dataProcessing } from '../../../services/dataProcessing.js';

export const AVAILABLE_DIMENSIONS = [
    { id: 'nganhHang', label: 'Ngành hàng', default: true },
    { id: 'nhomHang', label: 'Nhóm hàng', default: true },
    { id: 'nhaSanXuat', label: 'Nhà sản xuất', default: true },
    { id: 'tenSanPham', label: 'Tên sản phẩm', default: false },
    { id: 'nhanVienTao', label: 'Người tạo', default: false }
];

const cleanStr = (s) => (s || '').toString().trim();

const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
    const str = String(dateVal).trim();
    const parts = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (parts) return new Date(parts[3], parts[2] - 1, parts[1]);
    return null;
};

function getWeekRangeLabel(dateObj) {
    const d = new Date(dateObj);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const mon = new Date(d.setDate(diff));
    const sun = new Date(mon.getTime());
    sun.setDate(mon.getDate() + 6);
    return `${String(mon.getDate()).padStart(2,'0')}/${String(mon.getMonth()+1).padStart(2,'0')} - ${String(sun.getDate()).padStart(2,'0')}/${String(sun.getMonth()+1).padStart(2,'0')}`;
}

// --- [PHẪU THUẬT HIỆU NĂNG]: KHỞI TẠO TỪ ĐIỂN CỘT ---
function buildKeyMap(firstRow) {
    if (!firstRow) return {};
    const keys = Object.keys(firstRow);
    const map = {};

    const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]/g, '');

    // Danh sách các cột mục tiêu và bí danh của chúng
    const targetCols = {
        hinhThucXuat: ['hinhthucxuat'],
        trangThaiThuTien: ['trangthaithutien'],
        trangThaiHuy: ['trangthaihuy'],
        tinhTrangTra: ['tinhtrangtra'],
        trangThaiXuat: ['trangthaixuat'],
        maKho: ['makhotao', 'makho'],
        ngayTao: ['ngaytao'],
        soLuong: ['soluong', 'slban'],
        revenue: ['revenue', 'doanhthu', 'thanhtien', 'giaban'],
        revenueQuyDoi: ['revenuequydoi', 'doanhthuquydoi'],
        nguoiTao: ['nguoitao', 'nhanvientao'],
        maNhanVien: ['manhanvien', 'manv', 'msnv'],
        nganhHang: ['nganhhang'],
        nhomHang: ['nhomhang'],
        nhaSanXuat: ['nhasanxuat', 'hang'],
        tenSanPham: ['tensanpham']
    };

    // Ánh xạ duy nhất 1 lần cho file
    for (let k of keys) {
        const normK = normalize(k);
        for (const [logicalKey, aliases] of Object.entries(targetCols)) {
            if (aliases.includes(normK) && !map[logicalKey]) {
                map[logicalKey] = k; // Lưu lại đúng cái tên key gốc của Object (Ví dụ: "Hình thức xuất")
            }
        }
    }
    return map;
}

export function processDashboardData(sourceData, activeDimensionIds, currentFilters, sortConfig) {
    if (!sourceData || sourceData.length === 0) {
        return { metrics: { actualRev: 0, convertedRev: 0, traChamRev: 0 }, totalMetrics: { quantity: 0, revenue: 0, revenueQD: 0 }, totalDays: 1, filterOptions: {}, warehouseTitle: '', dailyData: [], weeklyData: [], treeData: [] };
    }

    const validHTX = dataProcessing.getHinhThucXuatTinhDoanhThu ? dataProcessing.getHinhThucXuatTinhDoanhThu() : new Set();
    
    let metrics = { actualRev: 0, convertedRev: 0, traChamRev: 0 };
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0 };
    let weekMap = new Map(), dayMap = new Map(), rootMap = new Map();
    let uniqueDays = new Set();
    let uniqueWarehouses = new Set();

    // 1. Quét dòng đầu tiên để tạo KeyMap (Tốc độ ánh sáng)
    const keyMap = buildKeyMap(sourceData[0]);
    const hasStatusCols = !!(keyMap.hinhThucXuat || keyMap.trangThaiThuTien || keyMap.tinhTrangTra || keyMap.trangThaiXuat);

    const getFastDimValue = (row, dimId) => {
        let val = '';
        if (dimId === 'nhanVienTao') val = row[keyMap.nguoiTao];
        else if (dimId === 'nganhHang') val = row[keyMap.nganhHang];
        else if (dimId === 'nhomHang') val = row[keyMap.nhomHang];
        else if (dimId === 'nhaSanXuat') val = row[keyMap.nhaSanXuat];
        else if (dimId === 'tenSanPham') val = row[keyMap.tenSanPham];

        val = val !== undefined && val !== null ? String(val).trim() : '';

        if (!val) return '(Trống)';
        if (dimId === 'nhanVienTao') {
            let maNV = row[keyMap.maNhanVien] || (val.match(/(\d+)/) || [])[1];
            return formatters.getShortEmployeeName(val, maNV || '');
        }
        if (dimId === 'tenSanPham' || dimId === 'nhaSanXuat') return val;
        return cleanStr(val);
    };

    const parseMoney = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/,/g, '')) || 0;
    };

    // 2. VÒNG LẶP CHÍNH - KHÔNG DÙNG REGEX HAY HÀM XỬ LÝ CHUỖI NẶNG
    for (let i = 0; i < sourceData.length; i++) {
        const row = sourceData[i];

        if (hasStatusCols) {
            const htx = row[keyMap.hinhThucXuat] || '';
            const thuTien = row[keyMap.trangThaiThuTien] || '';
            const huy = row[keyMap.trangThaiHuy] || '';
            const tra = row[keyMap.tinhTrangTra] || '';
            const xuat = row[keyMap.trangThaiXuat] || '';

            const isValidState = thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && xuat === 'Đã xuất';
            const isValidHtx = validHTX.size === 0 || validHTX.has(htx);

            if (!isValidHtx || !isValidState) continue;
        }

        const wh = row[keyMap.maKho];
        if (wh !== undefined && wh !== '') uniqueWarehouses.add(wh);

        const dateRaw = row[keyMap.ngayTao];
        const dateObj = parseSafeDate(dateRaw);
        if (!dateObj) continue;
        
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        uniqueDays.add(dateStr);
        
        const qty = parseMoney(row[keyMap.soLuong]);
        const rev = parseMoney(row[keyMap.revenue]);
        const revQDRaw = row[keyMap.revenueQuyDoi];
        const revQD = revQDRaw !== undefined && revQDRaw !== '' ? parseMoney(revQDRaw) : rev;
        
        const htxRaw = String(row[keyMap.hinhThucXuat] || '').toLowerCase();
        const isTraGop = htxRaw.includes('trả góp') || htxRaw.includes('trả chậm');
        
        metrics.actualRev += rev; 
        metrics.convertedRev += revQD;
        if (isTraGop) metrics.traChamRev += rev;

        if (!dayMap.has(dateStr)) dayMap.set(dateStr, { date: dateStr, rev: 0, dateObj });
        dayMap.get(dateStr).rev += rev;

        const weekLabel = getWeekRangeLabel(dateObj);
        if (!weekMap.has(weekLabel)) weekMap.set(weekLabel, { week: weekLabel, rev: 0, sortDate: dateObj });
        weekMap.get(weekLabel).rev += rev;

        let skip = false;
        if (Object.keys(currentFilters).length > 0) {
            for (const [key, selectedValues] of Object.entries(currentFilters)) {
                if (selectedValues !== undefined && !selectedValues.includes(getFastDimValue(row, key))) { 
                    skip = true; break; 
                }
            }
        }
        
        if (!skip) {
            totalMetrics.quantity += qty; totalMetrics.revenue += rev; totalMetrics.revenueQD += revQD;

            let currentLevel = rootMap;
            let pathPrefix = ''; 
            
            activeDimensionIds.forEach((dimId, index) => {
                const key = getFastDimValue(row, dimId);
                pathPrefix += key + '||'; 
                
                if (!currentLevel.has(key)) {
                    currentLevel.set(key, { id: pathPrefix, name: key, quantity: 0, revenue: 0, revenueQD: 0, children: new Map(), level: index });
                }
                const groupObj = currentLevel.get(key);
                groupObj.quantity += qty; groupObj.revenue += rev; groupObj.revenueQD += revQD;
                currentLevel = groupObj.children;
            });
        }
    }

    const totalDays = uniqueDays.size || 1;
    const whArray = Array.from(uniqueWarehouses);
    const warehouseTitle = whArray.length === 1 ? `- Kho ${whArray[0]}` : (whArray.length > 1 ? `- Gộp ${whArray.length} kho` : '');

    const convertAndSort = (map) => Array.from(map.values()).map(item => {
        const newItem = { ...item };
        newItem.avgQty = newItem.quantity / totalDays;
        newItem.avgRev = newItem.revenue / totalDays;
        newItem.avgRevQD = newItem.revenueQD / totalDays;
        
        if (newItem.children && newItem.children.size > 0) newItem.children = convertAndSort(newItem.children);
        else delete newItem.children;
        return newItem;
    }).sort((a, b) => {
        let valA = a[sortConfig.key] || 0;
        let valB = b[sortConfig.key] || 0;
        if (sortConfig.direction === 'asc') return valA < valB ? -1 : (valA > valB ? 1 : 0);
        else return valA > valB ? -1 : (valA < valB ? 1 : 0);
    });

    const filterOptions = {};
    AVAILABLE_DIMENSIONS.forEach(targetDim => {
        const uniqueValues = new Set();
        const otherFilters = { ...currentFilters }; delete otherFilters[targetDim.id];
        
        for (let i = 0; i < sourceData.length; i++) {
            const row = sourceData[i];
            
            if (hasStatusCols) {
                const htx = row[keyMap.hinhThucXuat] || '';
                const thuTien = row[keyMap.trangThaiThuTien] || '';
                const huy = row[keyMap.trangThaiHuy] || '';
                const tra = row[keyMap.tinhTrangTra] || '';
                const xuat = row[keyMap.trangThaiXuat] || '';

                const isValidState = thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && xuat === 'Đã xuất';
                const isValidHtx = validHTX.size === 0 || validHTX.has(htx);

                if (!isValidHtx || !isValidState) continue;
            }

            let isValid = true;
            for (const [filterKey, filterValues] of Object.entries(otherFilters)) {
                if (filterValues !== undefined && !filterValues.includes(getFastDimValue(row, filterKey))) { isValid = false; break; }
            }
            if (isValid) {
                const val = getFastDimValue(row, targetDim.id);
                if (val && val !== '(Trống)') uniqueValues.add(val);
            }
        }
        filterOptions[targetDim.id] = Array.from(uniqueValues).sort();
    });

    return {
        metrics, totalMetrics, totalDays, filterOptions, warehouseTitle,
        dailyData: Array.from(dayMap.values()).sort((a, b) => a.dateObj - b.dateObj),
        weeklyData: Array.from(weekMap.values()).sort((a, b) => a.sortDate - b.sortDate),
        treeData: convertAndSort(rootMap)
    };
}