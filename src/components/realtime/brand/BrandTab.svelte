<script>
    import { onMount } from 'svelte';
    import { realtimeYCXData } from '../../../stores.js';
    import { cleanCategoryName } from '../../../utils.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import { formatters } from '../../../utils/formatters.js';
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
    
    // Sort & Expanded State
    let sortConfig = { key: 'revenue', direction: 'desc' };
    let expandedRows = new Set();
    
    // [FIX STATE] Cờ hiệu để chặn việc lưu đè config khi chưa load xong
    let isConfigLoaded = false; 

    const STORAGE_KEY = 'BRAND_TAB_CONFIG_V1';

    onMount(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);
                if (config.activeDimensionIds) activeDimensionIds = config.activeDimensionIds;
                if (config.currentFilters) currentFilters = config.currentFilters;
                if (config.sortConfig) sortConfig = config.sortConfig;
                if (config.expandedRows) expandedRows = new Set(config.expandedRows);
            } catch (e) { console.error('Error loading config', e); }
        }
        // [FIX STATE] Đánh dấu đã load xong, giờ mới được phép Save
        isConfigLoaded = true;
    });

    // Auto save khi state thay đổi
    $: {
        // [FIX STATE] Chỉ lưu khi đã load xong config cũ
        if (isConfigLoaded && typeof sessionStorage !== 'undefined') {
            const configToSave = {
                activeDimensionIds,
                currentFilters,
                sortConfig,
                expandedRows: Array.from(expandedRows)
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
        }
    }

    // --- HELPER: Parse số an toàn ---
    const parseMoney = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/[^0-9-]/g, '')) || 0;
    };

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

    const getVal = (row, key) => row[key] || row[key.toUpperCase()] || row[key.toLowerCase()] || '';

    // Hàm lấy giá trị chuẩn - Xử lý tên nhân viên
    const getDimensionValue = (row, dimId) => {
        let fieldName = dimId;
        if (dimId === 'nhanVienTao') fieldName = 'nguoiTao'; 

        const val = getVal(row, fieldName);
        if (!val) return '(Trống)';

        // [FIX NAME] Xử lý tên nhân viên: Trích xuất mã nếu thiếu
        if (dimId === 'nhanVienTao') {
            let maNV = getVal(row, 'maNhanVien') || getVal(row, 'MANHANVIEN');
            
            // Nếu data không có trường mã riêng, thử tìm số trong chuỗi tên
            if (!maNV) {
                const match = val.match(/(\d+)/);
                if (match) maNV = match[1];
            }

            return formatters.getShortEmployeeName(val, maNV || '');
        }

        if (dimId === 'tenSanPham' || dimId === 'nhaSanXuat') {
            return val.toString().trim();
        }
        
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
            const htx = getVal(row, 'hinhThucXuat');
            if (!hinhThucXuatTinhDoanhThu.has(htx)) return;
            if (!isValidRow(row)) return;

            // Filter
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

            const quantity = parseInt(getVal(row, 'soLuong') || 0);
            const revenue = parseMoney(getVal(row, 'thanhTien')); 

            const nhomHang = getVal(row, 'nhomHang');
            let heSo = heSoQuyDoiMap[nhomHang] || 1;
            const isTraGop = htx.toLowerCase().includes('trả góp') || htx.toLowerCase().includes('trả chậm');
            if (isTraGop) heSo += 0.3;
            const rawRevQD = getVal(row, 'revenueQuyDoi') || getVal(row, 'doanhThuQuyDoi');
            const revenueQD = rawRevQD !== '' ? parseMoney(rawRevQD) : (revenue * heSo);

            totalMetrics.quantity += quantity;
            totalMetrics.revenue += revenue;
            totalMetrics.revenueQD += revenueQD;
            if (isTraGop) totalMetrics.revenueTraCham += revenue;

            let currentLevel = rootMap;

            activeDimensionIds.forEach((dimId, index) => {
                const key = getDimensionValue(row, dimId);
                
                // ID cố định để giữ state khi sort
                const stableId = `${index}_${key}`;

                if (!currentLevel.has(key)) {
                    currentLevel.set(key, {
                        id: stableId,
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

        // 3. Convert Map -> Sorted Array (Recursive Sort)
        const convertAndSort = (map) => {
            const items = Array.from(map.values()).map(item => {
                const newItem = { ...item };
                if (newItem.children && newItem.children.size > 0) {
                    newItem.children = convertAndSort(newItem.children);
                } else {
                    delete newItem.children;
                }
                return newItem;
            });

            // Sorting Logic
            return items.sort((a, b) => {
                let valA, valB;
                
                if (sortConfig.key === 'percentTraCham') {
                    valA = a.revenue > 0 ? a.revenueTraCham / a.revenue : 0;
                    valB = b.revenue > 0 ? b.revenueTraCham / b.revenue : 0;
                } else if (sortConfig.key === 'percentQD') {
                    valA = a.revenue > 0 ? a.revenueQD / a.revenue : 0;
                    valB = b.revenue > 0 ? b.revenueQD / b.revenue : 0;
                } else {
                    valA = a[sortConfig.key];
                    valB = b[sortConfig.key];
                }

                if (sortConfig.direction === 'asc') {
                    if (valA < valB) return -1;
                    if (valA > valB) return 1;
                    return 0;
                } else {
                    if (valA > valB) return -1;
                    if (valA < valB) return 1;
                    return 0;
                }
            });
        };

        treeData = convertAndSort(rootMap);
        totalMetrics = { ...totalMetrics };
        updateFilterOptions(sourceData);
    }

    // Bộ lọc phụ thuộc (Cascading Filters)
    function updateFilterOptions(sourceData) {
        const options = {};
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();

        AVAILABLE_DIMENSIONS.forEach(targetDim => {
            const uniqueValues = new Set();
            const otherFilters = { ...currentFilters };
            delete otherFilters[targetDim.id];

            sourceData.forEach(row => {
                const htx = getVal(row, 'hinhThucXuat');
                if (!hinhThucXuatTinhDoanhThu.has(htx)) return;
                if (!isValidRow(row)) return;

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

    // Reactivity
    $: {
        if ($realtimeYCXData || selectedWarehouse || activeDimensionIds || currentFilters || sortConfig) {
            calculateData($realtimeYCXData || []);
        }
    }

    function handleConfigChange(event) { activeDimensionIds = event.detail; }
    function handleFilterChange(event) {
        const { key, selected } = event.detail;
        currentFilters = { ...currentFilters, [key]: selected };
    }
    
    // Handle Sort Event
    function handleSort(event) {
        const key = event.detail;
        if (sortConfig.key === key) {
            sortConfig = { ...sortConfig, direction: sortConfig.direction === 'desc' ? 'asc' : 'desc' };
        } else {
            sortConfig = { key, direction: 'desc' };
        }
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
        {sortConfig}
        bind:expandedRows={expandedRows} 
        on:configChange={handleConfigChange}
        on:filterChange={handleFilterChange}
        on:sort={handleSort}
    />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>