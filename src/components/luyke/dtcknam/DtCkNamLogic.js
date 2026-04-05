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

// Hàm trích xuất tự động loại bỏ Dấu Tiếng Việt và Khoảng trắng
const getVal = (row, possibleKeys) => {
    const rowKeys = Object.keys(row);
    for (let rk of rowKeys) {
        const normRk = rk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]/g, '');
        for (let pk of possibleKeys) {
            const normPk = pk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]/g, '');
            if (normRk === normPk) {
                return row[rk] !== undefined && row[rk] !== null ? String(row[rk]).trim() : '';
            }
        }
    }
    return '';
};

const getDimensionValue = (row, dimId) => {
    let val = '';
    if (dimId === 'nhanVienTao') val = getVal(row, ['nguoiTao', 'nhanVienTao', 'Người tạo']);
    else if (dimId === 'nganhHang') val = getVal(row, ['nganhHang', 'Ngành hàng']);
    else if (dimId === 'nhomHang') val = getVal(row, ['nhomHang', 'Nhóm hàng']);
    else if (dimId === 'nhaSanXuat') val = getVal(row, ['nhaSanXuat', 'Nhà sản xuất']);
    else if (dimId === 'tenSanPham') val = getVal(row, ['tenSanPham', 'Tên sản phẩm']);

    if (!val) return '(Trống)';
    if (dimId === 'nhanVienTao') {
        let maNV = getVal(row, ['maNhanVien', 'Mã nhân viên']) || (val.match(/(\d+)/) || [])[1];
        return formatters.getShortEmployeeName(val, maNV || '');
    }
    if (dimId === 'tenSanPham' || dimId === 'nhaSanXuat') return val.toString().trim();
    return cleanStr(val);
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

export function processDashboardData(sourceData, activeDimensionIds, currentFilters, sortConfig) {
    const validHTX = dataProcessing.getHinhThucXuatTinhDoanhThu ? dataProcessing.getHinhThucXuatTinhDoanhThu() : new Set();
    
    let metrics = { actualRev: 0, convertedRev: 0, traChamRev: 0 };
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0 };
    let weekMap = new Map(), dayMap = new Map(), rootMap = new Map();
    let uniqueDays = new Set();
    let uniqueWarehouses = new Set();

    sourceData.forEach(row => {
        const normalizeKey = (k) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]/g, '');
        // [PHẪU THUẬT LOGIC]: Tự động nhận diện dữ liệu nén
        const hasStatusCols = Object.keys(row).some(k => 
            ['hinhthucxuat', 'trangthaithutien', 'tinhtrangtra', 'trangthaixuat'].includes(normalizeKey(k))
        );

        let htx = '';
        if (hasStatusCols) {
            htx = getVal(row, ['hinhThucXuat', 'Hình thức xuất']);
            const thuTien = getVal(row, ['trangThaiThuTien', 'Trạng thái thu tiền']);
            const huy = getVal(row, ['trangThaiHuy', 'Trạng thái hủy']);
            const tra = getVal(row, ['tinhTrangTra', 'Tình trạng trả']);
            const xuat = getVal(row, ['trangThaiXuat', 'Trạng thái xuất']);

            const isValidState = thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && xuat === 'Đã xuất';
            const isValidHtx = validHTX.size === 0 || validHTX.has(htx);

            if (!isValidHtx || !isValidState) return;
        }

        const wh = getVal(row, ['maKhoTao', 'maKho', 'Mã kho tạo']);
        if (wh !== '') uniqueWarehouses.add(wh);

        const dateRaw = getVal(row, ['ngayTao', 'Ngày tạo']);
        const dateObj = parseSafeDate(dateRaw);
        if (!dateObj) return;
        
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        uniqueDays.add(dateStr);

        const parseMoney = (val) => {
            if (typeof val === 'number') return val;
            return parseFloat(String(val).replace(/,/g, '')) || 0;
        };
        
        const qty = parseMoney(getVal(row, ['soLuong', 'Số lượng']));
        const rev = parseMoney(getVal(row, ['revenue', 'doanhThu', 'thanhTien', 'Thành tiền']));
        const revQDRaw = getVal(row, ['revenueQuyDoi', 'doanhThuQuyDoi', 'Doanh thu quy đổi']);
        const revQD = revQDRaw !== '' ? parseMoney(revQDRaw) : rev;
        
        const isTraGop = htx.toLowerCase().includes('trả góp') || htx.toLowerCase().includes('trả chậm');
        
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
                if (selectedValues !== undefined && !selectedValues.includes(getDimensionValue(row, key))) { 
                    skip = true; break; 
                }
            }
        }
        
        if (!skip) {
            totalMetrics.quantity += qty; totalMetrics.revenue += rev; totalMetrics.revenueQD += revQD;

            let currentLevel = rootMap;
            let pathPrefix = ''; 
            
            activeDimensionIds.forEach((dimId, index) => {
                const key = getDimensionValue(row, dimId);
                pathPrefix += key + '||'; 
                
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
        sourceData.forEach(row => {
            const normalizeKey = (k) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]/g, '');
            const hasStatusCols = Object.keys(row).some(k => 
                ['hinhthucxuat', 'trangthaithutien', 'tinhtrangtra', 'trangthaixuat'].includes(normalizeKey(k))
            );

            if (hasStatusCols) {
                const htx = getVal(row, ['hinhThucXuat', 'Hình thức xuất']);
                if (validHTX.size > 0 && !validHTX.has(htx)) return;
                
                const thuTien = getVal(row, ['trangThaiThuTien', 'Trạng thái thu tiền']);
                const huy = getVal(row, ['trangThaiHuy', 'Trạng thái hủy']);
                const tra = getVal(row, ['tinhTrangTra', 'Tình trạng trả']);
                const xuat = getVal(row, ['trangThaiXuat', 'Trạng thái xuất']);
                if (!(thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && xuat === 'Đã xuất')) return;
            }

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
        metrics, totalMetrics, totalDays, filterOptions, warehouseTitle,
        dailyData: Array.from(dayMap.values()).sort((a, b) => a.dateObj - b.dateObj),
        weeklyData: Array.from(weekMap.values()).sort((a, b) => a.sortDate - b.sortDate),
        treeData: convertAndSort(rootMap)
    };
}