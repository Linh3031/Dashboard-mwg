<script>
    import { cleanCategoryName } from '../../../utils.js';
    import { config } from '../../../config.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import LuykeCategoryTreeTable from './LuykeCategoryTreeTable.svelte';

    export let data = []; 
    export let selectedWarehouse = '';

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
    let warnings = [];

    // --- HELPER: Parse số chuẩn dự án (giống salesProcessor) ---
    const parseMoney = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        // Xóa dấu phẩy nghìn (VN) trước khi parse
        return parseFloat(String(val).replace(/,/g, '')) || 0;
    };

    // --- HELPER: Kiểm tra dòng hợp lệ (giống general.report.js) ---
    const isValidRow = (row) => {
        const isThuTien = (row.trangThaiThuTien || "").trim() === 'Đã thu';
        const isChuaHuy = (row.trangThaiHuy || "").trim() === 'Chưa hủy';
        const isChuaTra = (row.tinhTrangTra || "").trim() === 'Chưa trả';
        // Tab này thường dùng cho Lũy Kế (Đã xuất) hoặc theo yêu cầu cụ thể
        // Ở đây tôi giữ logic chặt nhất là phải "Đã xuất" nếu nguồn dữ liệu là thực tế
        const isDaXuat = (row.trangThaiXuat || "").trim() === 'Đã xuất';
        return isThuTien && isChuaHuy && isChuaTra && isDaXuat;
    };

    // --- CORE: Tính toán lại dữ liệu ---
    function calculateData() {
        // 1. Reset
        treeData = [];
        totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
        warnings = [];
        if (!data || data.length === 0) return;

        // Lấy danh sách hình thức xuất được tính doanh thu từ Core
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi();

        // 2. Tạo Map gom nhóm
        let rootMap = new Map();

        // 3. Quét dữ liệu
        data.forEach(row => {
            // --- A. VALIDATION LAYER (Lớp bảo vệ) ---
            // Kiểm tra HTX hợp lệ
            if (!hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat)) return;
            // Kiểm tra trạng thái đơn (Thu tiền/Hủy/Trả)
            if (!isValidRow(row)) return;
            
            // Lọc theo Filters trên UI (nếu có)
            if (Object.keys(currentFilters).length > 0) {
                for (const [key, value] of Object.entries(currentFilters)) {
                    if (value && value.length > 0) {
                        // Map lại key từ ID dimension sang tên cột trong Excel
                        let colName = '';
                        if (key === 'nganhHang') colName = 'nganhHang';
                        else if (key === 'nhomHang') colName = 'nhomHang';
                        else if (key === 'nhaSanXuat') colName = 'nhaSanXuat';
                        else if (key === 'nhanVienTao') colName = 'nguoiTao';
                        else if (key === 'tenSanPham') colName = 'tenSanPham'; // [Fix]: Thêm map cho tên SP
                        
                        if (colName) {
                            const cellVal = row[colName] ? cleanCategoryName(row[colName]) : '(Trống)';
                            if (!value.includes(cellVal)) return; // Skip
                        }
                    }
                }
            }

            // --- B. CALCULATION LAYER (Lớp tính toán) ---
            const quantity = parseInt(row.soLuong || 0);
            const revenue = parseMoney(row.thanhTien); // Dùng hàm chuẩn, không dùng parseFloat trực tiếp
            
            // Tính quy đổi (Logic từ salesProcessor)
            let heSo = heSoQuyDoiMap[row.nhomHang] || 1;
            // Xử lý thưởng trả góp (Core logic: +0.3 nếu là trả góp/trả chậm)
            const htx = (row.hinhThucXuat || '').toLowerCase();
            const isTraGop = htx.includes('trả góp') || htx.includes('trả chậm');
            if (isTraGop) {
                heSo += 0.3;
            }
            // Ưu tiên lấy cột revenueQuyDoi nếu Core đã tính sẵn, nếu không thì tự tính
            const revenueQD = row.revenueQuyDoi !== undefined ? row.revenueQuyDoi : (revenue * heSo);

            // Cộng dồn tổng (Global Metrics)
            totalMetrics.quantity += quantity;
            totalMetrics.revenue += revenue;
            totalMetrics.revenueQD += revenueQD;
            if (isTraGop) totalMetrics.revenueTraCham += revenue;

            // --- C. GROUPING LAYER (Lớp gom nhóm đệ quy) ---
            let currentLevel = rootMap;
            activeDimensionIds.forEach((dimId, index) => {
                // Mapping cột dữ liệu
                let rawVal = '';
                if (dimId === 'nganhHang') rawVal = row.nganhHang;
                else if (dimId === 'nhomHang') rawVal = row.nhomHang;
                else if (dimId === 'nhaSanXuat') rawVal = row.nhaSanXuat;
                else if (dimId === 'nhanVienTao') rawVal = row.nguoiTao;
                else if (dimId === 'tenSanPham') rawVal = row.tenSanPham;

                const key = rawVal ? cleanCategoryName(rawVal) : '(Trống)';
                // const isLastLevel = index === activeDimensionIds.length - 1; // Chưa dùng

                if (!currentLevel.has(key)) {
                    currentLevel.set(key, {
                        id: key + Math.random(), // Unique ID cho key
                        name: key,
                        quantity: 0,
                        revenue: 0,
                        revenueQD: 0,
                        revenueTraCham: 0,
                        children: new Map(), // Map cho cấp con
                        level: index
                    });
                }

                const groupObj = currentLevel.get(key);
                groupObj.quantity += quantity;
                groupObj.revenue += revenue;
                groupObj.revenueQD += revenueQD;
                if (isTraGop) groupObj.revenueTraCham += revenue;

                // Đi xuống cấp tiếp theo
                currentLevel = groupObj.children;
            });
        });

        // 4. Chuyển Map thành Array đệ quy cho UI
        const convertMapToArray = (map) => {
            return Array.from(map.values()).map(item => {
                const newItem = { ...item };
                if (newItem.children && newItem.children.size > 0) {
                    newItem.children = convertMapToArray(newItem.children);
                    // Sort theo doanh thu giảm dần
                    newItem.children.sort((a, b) => b.revenue - a.revenue);
                } else {
                    delete newItem.children;
                }
                return newItem;
            }).sort((a, b) => b.revenue - a.revenue);
        };

        treeData = convertMapToArray(rootMap);
        
        // --- QUAN TRỌNG: Trigger Reactivity ---
        // Svelte cần phép gán này để nhận biết object đã thay đổi
        totalMetrics = { ...totalMetrics };

        // Update Filters Options (Chỉ chạy 1 lần hoặc khi data gốc đổi)
        updateFilterOptions();
    }

    function updateFilterOptions() {
        if (Object.keys(filterOptions).length > 0) return; // Đã có option thì thôi
        
        const options = {};
        AVAILABLE_DIMENSIONS.forEach(dim => {
            const uniqueValues = new Set();
            data.forEach(row => {
                // Logic mapping cột tương tự như trên
                let val = '';
                if (dim.id === 'nganhHang') val = row.nganhHang;
                else if (dim.id === 'nhomHang') val = row.nhomHang;
                else if (dim.id === 'nhaSanXuat') val = row.nhaSanXuat;
                else if (dim.id === 'nhanVienTao') val = row.nguoiTao;
                
                if (val) val = cleanCategoryName(val);
                if (val && val !== '(Trống)') {
                    uniqueValues.add(val);
                }
            });
            options[dim.id] = Array.from(uniqueValues).sort();
        });
        filterOptions = options;
    }

    $: {
        if (data || selectedWarehouse || currentFilters || activeDimensionIds) {
            calculateData();
        }
    }

    function handleConfigChange(event) { activeDimensionIds = event.detail; }
    function handleFilterChange(event) {
        const { key, selected } = event.detail;
        currentFilters = { ...currentFilters, [key]: selected };
    }
</script>

<div class="animate-fade-in pb-10" data-capture-filename="ChiTietNganhHang">
    {#if warnings.length > 0}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>⚠️ Cảnh báo cấu trúc:</strong>
            <ul class="list-disc pl-5 mt-1">
                {#each warnings as w}
                    <li>{w}</li>
                {/each}
            </ul>
        </div>
    {/if}

    <LuykeCategoryTreeTable 
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