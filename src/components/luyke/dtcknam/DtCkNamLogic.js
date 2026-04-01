import { formatters } from '../../../utils/formatters.js';
import { dataProcessing } from '../../../services/dataProcessing.js';

export const AVAILABLE_DIMENSIONS = [
    { id: 'nganhHang', label: 'Ngành hàng', default: true },
    { id: 'nhomHang', label: 'Nhóm hàng', default: true },
    { id: 'nhaSanXuat', label: 'Nhà sản xuất', default: true },
    { id: 'tenSanPham', label: 'Tên sản phẩm', default: false },
    { id: 'nhanVienTao', label: 'Người tạo', default: false }
];

const parseMoney = (val) => parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
const cleanStr = (s) => (s || '').toString().trim();
const getVal = (row, key) => row[key] || row[key.toUpperCase()] || row[key.toLowerCase()] || '';

const isValidRow = (row) => {
    const thuTien = (row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || "").trim();
    const huy = (row.trangThaiHuy || row.TRANG_THAI_HUY || "").trim();
    const tra = (row.tinhTrangTra || row.TINH_TRANG_TRA || "").trim();
    const xuat = (row.trangThaiXuat || row.TRANG_THAI_XUAT || "").trim();
    return thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && xuat === 'Đã xuất';
};

const getDimensionValue = (row, dimId) => {
    let fieldName = dimId === 'nhanVienTao' ? 'nguoiTao' : dimId;
    const val = getVal(row, fieldName);
    if (!val) return '(Trống)';
    if (dimId === 'nhanVienTao') {
        let maNV = getVal(row, 'maNhanVien') || getVal(row, 'MANHANVIEN') || (val.match(/(\d+)/) || [])[1];
        return formatters.getShortEmployeeName(val, maNV || '');
    }
    if (dimId === 'tenSanPham' || dimId === 'nhaSanXuat') return val.toString().trim();
    return cleanStr(val);
};

function getWeekRangeLabel(dateRaw) {
    const d = new Date(dateRaw);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const mon = new Date(d.setDate(diff));
    const sun = new Date(mon.getTime());
    sun.setDate(mon.getDate() + 6);
    return `${mon.getDate()}/${mon.getMonth()+1} - ${sun.getDate()}/${sun.getMonth()+1}`;
}

export function processDashboardData(sourceData, activeDimensionIds, currentFilters, sortConfig) {
    const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi ? dataProcessing.getHeSoQuyDoi() : {};
    const validHTX = dataProcessing.getHinhThucXuatTinhDoanhThu ? dataProcessing.getHinhThucXuatTinhDoanhThu() : new Set();
    
    let metrics = { actualRev: 0, convertedRev: 0, traChamRev: 0 };
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
    let weekMap = new Map(), dayMap = new Map(), rootMap = new Map();
    let uniqueDays = new Set();

    sourceData.forEach(row => {
        const htx = cleanStr(row.hinhThucXuat || row.HINH_THUC_XUAT);
        if (validHTX.size > 0 && !validHTX.has(htx)) return;
        if (!isValidRow(row)) return;

        const dateRaw = row.ngayTao || row.NGAY_TAO;
        if (!dateRaw) return;
        const dateObj = new Date(dateRaw);
        const dateStr = dateObj.toLocaleDateString('vi-VN');
        uniqueDays.add(dateStr);

        const qty = parseInt(row.soLuong || row.SO_LUONG || 0);
        const rev = parseMoney(row.thanhTien || row.THANH_TIEN || row.DoanhThu);
        const nhomHang = cleanStr(row.nhomHang || row.NHOM_HANG || row.nganhHang);
        
        const isTraGop = htx.toLowerCase().includes('trả góp') || htx.toLowerCase().includes('trả chậm');
        let heSo = heSoQuyDoiMap[nhomHang] || 1;
        if (isTraGop) heSo += 0.3;
        const revQD = (row.revenueQuyDoi || row.doanhThuQuyDoi) ? parseMoney(row.revenueQuyDoi || row.doanhThuQuyDoi) : (rev * heSo);
        
        metrics.actualRev += rev; metrics.convertedRev += revQD;
        if (isTraGop) metrics.traChamRev += rev;

        if (!dayMap.has(dateStr)) dayMap.set(dateStr, { date: dateStr, rev: 0, dateObj });
        dayMap.get(dateStr).rev += rev;

        const weekLabel = getWeekRangeLabel(dateObj);
        if (!weekMap.has(weekLabel)) weekMap.set(weekLabel, { week: weekLabel, rev: 0, sortDate: dateObj });
        weekMap.get(weekLabel).rev += rev;

        let skip = false;
        if (Object.keys(currentFilters).length > 0) {
            for (const [key, selectedValues] of Object.entries(currentFilters)) {
                if (selectedValues !== undefined && !selectedValues.includes(getDimensionValue(row, key))) { 
                    skip = true; break; 
                }
            }
        }
        
        if (!skip) {
            totalMetrics.quantity += qty; totalMetrics.revenue += rev; totalMetrics.revenueQD += revQD;

            let currentLevel = rootMap;
            let pathPrefix = ''; // [FIX CÂY CHA CON]
            
            activeDimensionIds.forEach((dimId, index) => {
                const key = getDimensionValue(row, dimId);
                pathPrefix += key + '||'; // Tạo đường dẫn tuyệt đối cho ID
                
                if (!currentLevel.has(key)) {
                    currentLevel.set(key, { id: pathPrefix, name: key, quantity: 0, revenue: 0, revenueQD: 0, children: new Map(), level: index });
                }
                const groupObj = currentLevel.get(key);
                groupObj.quantity += qty; groupObj.revenue += rev; groupObj.revenueQD += revQD;
                currentLevel = groupObj.children;
            });
        }
    });

    const totalDays = uniqueDays.size || 1;

    const convertAndSort = (map) => Array.from(map.values()).map(item => {
        const newItem = { ...item };
        // Tính toán các cột Trung Bình
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
        sourceData.forEach(row => {
            if (validHTX.size > 0 && !validHTX.has(cleanStr(row.hinhThucXuat || row.HINH_THUC_XUAT))) return;
            if (!isValidRow(row)) return;
            let isValid = true;
            for (const [filterKey, filterValues] of Object.entries(otherFilters)) {
                if (filterValues !== undefined && !filterValues.includes(getDimensionValue(row, filterKey))) { isValid = false; break; }
            }
            if (isValid) {
                const val = getDimensionValue(row, targetDim.id);
                if (val && val !== '(Trống)') uniqueValues.add(val);
            }
        });
        filterOptions[targetDim.id] = Array.from(uniqueValues).sort();
    });

    return {
        metrics, totalMetrics, totalDays, filterOptions,
        dailyData: Array.from(dayMap.values()).sort((a, b) => a.dateObj - b.dateObj),
        weeklyData: Array.from(weekMap.values()).sort((a, b) => a.sortDate - b.sortDate),
        treeData: convertAndSort(rootMap)
    };
}