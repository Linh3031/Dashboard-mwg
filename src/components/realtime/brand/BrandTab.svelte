<script>
    import { realtimeYCXData } from '../../../stores.js';
    import { cleanCategoryName } from '../../../utils.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import BrandTable from './BrandTable.svelte';

    export let selectedWarehouse = '';

    // 1. CẤU HÌNH DIMENSIONS
    const AVAILABLE_DIMENSIONS = [
        { id: 'nganhHang', label: 'Ngành hàng', default: true },
        { id: 'nhomHang', label: 'Nhóm hàng', default: true },
        { id: 'nhaSanXuat', label: 'Nhà sản xuất', default: true },
        { id: 'nhanVienTao', label: 'Người tạo', default: false },
        { id: 'tenSanPham', label: 'Tên sản phẩm', default: false }
    ];

    // State
    let activeDimensionIds = ['nganhHang', 'nhaSanXuat'];
    let treeData = [];
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
    let currentFilters = {};
    let filterOptions = {};

    // --- HELPER: Parse số an toàn ---
    const parseMoney = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/[^0-9-]/g, '')) || 0;
    };

    // --- HELPER: Kiểm tra dòng hợp lệ ---
    const isValidRow = (row) => {
        const thuTien = (row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || "").trim();
        const huy = (row.trangThaiHuy || row.TRANG_THAI_HUY || "").trim();
        const tra = (row.tinhTrangTra || row.TINH_TRANG_TRA || "").trim();
        const xuat = (row.trangThaiXuat || row.TRANG_THAI_XUAT || "").trim();

        return thuTien === 'Đã thu' && 
               huy === 'Chưa hủy' && 
               tra === 'Chưa trả' && 
               xuat === 'Đã xuất';
    };

    // --- HELPER: Lấy giá trị linh hoạt từ data thô ---
    const getVal = (row, key) => row[key] || row[key.toUpperCase()] || row[key.toLowerCase()] || '';

    // [GENESIS FIX] Hàm lấy giá trị chuẩn (Giữ nguyên bản cho SP/NSX)
    const getDimensionValue = (row, dimId) => {
        let fieldName = dimId;
        if (dimId === 'nhanVienTao') fieldName = 'nguoiTao'; // Mapping alias

        const val = getVal(row, fieldName);

        if (!val) return '(Trống)';

        // [FIX] Nếu là Tên SP hoặc NSX -> Giữ nguyên bản (chỉ trim), không clean
        if (dimId === 'tenSanPham' || dimId === 'nhaSanXuat') {
            return val.toString().trim();
        }
        
        // Các trường khác -> Clean để gom nhóm tốt hơn
        return cleanCategoryName(val);
    };

    // --- CORE: Tính toán dữ liệu ---
    function calculateData(sourceData) {
        // 1. Reset
        treeData = [];
        totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
        
        if (!sourceData || sourceData.length === 0) return;
        
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi();

        let rootMap = new Map();

        // 2. Scan & Process
        sourceData.forEach(row => {
            // --- A. VALIDATION ---
            const htx = getVal(row, 'hinhThucXuat');
            if (!hinhThucXuatTinhDoanhThu.has(htx)) return;
            if (!isValidRow(row)) return;

            // [GENESIS FIX] Filter Logic (Sử dụng getDimensionValue để khớp chính xác)
            if (Object.keys(currentFilters).length > 0) {
                let skip = false;
                for (const [key, selectedValues] of Object.entries(currentFilters)) {
                    if (selectedValues && selectedValues.length > 0) {
                        const cellVal = getDimensionValue(row, key);
                        if (!selectedValues.includes(cellVal)) { 
                            skip = true; 
                            break; 
                        }
                    }
                }
                if (skip) return;
            }

            // --- B. CALCULATION ---
            const quantity = parseInt(getVal(row, 'soLuong') || 0);
            const revenue = parseMoney(getVal(row, 'thanhTien')); 

            // Tính quy đổi
            const nhomHang = getVal(row, 'nhomHang');
            let heSo = heSoQuyDoiMap[nhomHang] || 1;
            
            const isTraGop = htx.toLowerCase().includes('trả góp') || htx.toLowerCase().includes('trả chậm');
            if (isTraGop) heSo += 0.3;

            const rawRevQD = getVal(row, 'revenueQuyDoi') || getVal(row, 'doanhThuQuyDoi');
            const revenueQD = rawRevQD !== '' ? parseMoney(rawRevQD) : (revenue * heSo);

            // Cộng tổng
            totalMetrics.quantity += quantity;
            totalMetrics.revenue += revenue;
            totalMetrics.revenueQD += revenueQD;
            if (isTraGop) totalMetrics.revenueTraCham += revenue;

            // --- C. GROUPING (Đệ quy theo Dimensions) ---
            let currentLevel = rootMap;
            activeDimensionIds.forEach((dimId, index) => {
                // [GENESIS FIX] Dùng getDimensionValue để lấy key gom nhóm
                const key = getDimensionValue(row, dimId);
                
                if (!currentLevel.has(key)) {
                    currentLevel.set(key, {
                        id: key + Math.random(),
                        name: key,
                        quantity: 0,
                        revenue: 0,
                        revenueQD: 0,
                        revenueTraCham: 0,
                        children: new Map(),
                        level: index
                    });
                }

                const groupObj = currentLevel.get(key);
                groupObj.quantity += quantity;
                groupObj.revenue += revenue;
                groupObj.revenueQD += revenueQD;
                if (isTraGop) groupObj.revenueTraCham += revenue;
                currentLevel = groupObj.children;
            });
        });

        // 3. Convert Map -> Sorted Array
        const convert = (map) => {
            return Array.from(map.values()).map(item => {
                const newItem = { ...item };
                if (newItem.children && newItem.children.size > 0) {
                    newItem.children = convert(newItem.children);
                    newItem.children.sort((a, b) => b.revenue - a.revenue);
                } else {
                    delete newItem.children;
                }
                return newItem;
            }).sort((a, b) => b.revenue - a.revenue);
        };

        treeData = convert(rootMap);
        
        // Trigger Reactivity
        totalMetrics = { ...totalMetrics };
        
        // [GENESIS FIX] Cập nhật bộ lọc sau khi tính toán (để áp dụng logic cascading)
        updateFilterOptions(sourceData);
    }

    // [GENESIS FIX] Bộ lọc phụ thuộc (Cascading Filters)
    function updateFilterOptions(sourceData) {
        const options = {};
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();

        AVAILABLE_DIMENSIONS.forEach(targetDim => {
            const uniqueValues = new Set();
            
            // Tạo bộ lọc tạm thời: Loại bỏ chính dimension đang xét
            const otherFilters = { ...currentFilters };
            delete otherFilters[targetDim.id];

            sourceData.forEach(row => {
                // 1. Validate cơ bản
                const htx = getVal(row, 'hinhThucXuat');
                if (!hinhThucXuatTinhDoanhThu.has(htx)) return;
                if (!isValidRow(row)) return;

                // 2. Kiểm tra xem dòng này có thỏa mãn các bộ lọc KHÁC không
                let isValid = true;
                if (Object.keys(otherFilters).length > 0) {
                    for (const [filterKey, filterValues] of Object.entries(otherFilters)) {
                        if (filterValues && filterValues.length > 0) {
                            const valToCheck = getDimensionValue(row, filterKey);
                            if (!filterValues.includes(valToCheck)) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                }

                // 3. Nếu hợp lệ -> Lấy giá trị cho targetDim
                if (isValid) {
                    const val = getDimensionValue(row, targetDim.id);
                    if (val && val !== '(Trống)') {
                        uniqueValues.add(val);
                    }
                }
            });
            options[targetDim.id] = Array.from(uniqueValues).sort();
        });

        filterOptions = options;
    }

    // Reactivity: Chạy lại khi data store thay đổi
    $: {
        if ($realtimeYCXData || selectedWarehouse || activeDimensionIds || currentFilters) {
            calculateData($realtimeYCXData || []);
        }
    }

    function handleConfigChange(event) { activeDimensionIds = event.detail; }
    function handleFilterChange(event) {
        const { key, selected } = event.detail;
        currentFilters = { ...currentFilters, [key]: selected };
    }
</script>

<div class="animate-fade-in pb-10">
    <BrandTable 
        data={treeData} 
        {totalMetrics}
        allDimensions={AVAILABLE_DIMENSIONS}
        activeIds={activeDimensionIds}
        {filterOptions}
        {currentFilters}
        on:configChange={handleConfigChange}
        on:filterChange={handleFilterChange}
    />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>