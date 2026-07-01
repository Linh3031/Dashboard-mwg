<script>
    import { onMount } from 'svelte';
    import { cleanCategoryName } from '../../../utils.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import { filterDataByDate, transformVelocityTree } from '../../../services/processing/logic/salesVelocity.helper.js';
    import { formatters } from '../../../utils/formatters.js';
    import { ycxDataThangTruoc } from '../../../stores.js';
    
    import LuykeCategoryTreeTable from './LuykeCategoryTreeTable.svelte';
    import InventoryToolbar from '../inventory/InventoryToolbar.svelte';
    import { inventoryHelper } from '../inventory/InventoryLogic.js';
    export let data = [];
    export let selectedWarehouse = '';
    const AVAILABLE_DIMENSIONS = [
        { id: 'nganhHang', label: 'Ngành hàng', default: true },
        { id: 'nhomHang', label: 'Nhóm hàng', default: true },
        { id: 'nhaSanXuat', label: 'Nhà sản xuất', default: true },
        { id: 'nhanVienTao', label: 'Người tạo', default: false },
        { id: 'tenSanPham', label: 'Tên sản phẩm', default: false }
    ];
    let activeDimensionIds = ['nganhHang', 'nhaSanXuat'];
    let treeData = [];
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0, quantityCK: 0, revenueCK: 0, revenueQDCK: 0, revenueTraChamCK: 0 };
    let currentFilters = {};
    let filterOptions = {};
    let warnings = [];
    let expandedRows = new Set();
    let isConfigLoaded = false;
    
    const STORAGE_KEY = 'LUYKE_CATEGORY_CONFIG_V3';
    const COLUMNS_STORAGE_KEY = 'LUYKE_CATEGORY_COLUMNS_V1';

    let isVelocityMode = false;
    let velocityDays = 1;
    let dateFilter = { from: '', to: '' }; 
    let isCompareMode = false;
    let sortKey = 'revenue';
    let sortDirection = 'desc';

    let inventoryIndex = null;
    let alertDays = 3;
    let hasInventoryData = false;
    const PRESET_DAYS = [3, 5, 7, 10];

    // [PHẪU THUẬT LOGIC]: Khai báo các cấu hình ngày chạy Run Rate thực tế từ dữ liệu
    let elapsedDays = 1;
    let daysInMonth = 30;

    let columnSettings = [
        { id: 'quantity', label: 'Số lượng (SL)', visible: true },
        { id: 'revenue', label: 'Doanh thu thực', visible: true },
        { id: 'donGia', label: 'Đơn giá', visible: true },
        { id: 'revenueQD', label: 'Doanh thu Quy đổi', visible: true },
        { id: 'revenueTraCham', label: 'Doanh thu Trả chậm', visible: true }
    ];

    $: displayedDimensions = AVAILABLE_DIMENSIONS.filter(d => {
        if (hasInventoryData && (d.id === 'nhaSanXuat' || d.id === 'nhanVienTao')) return false;
        return true;
    });
    onMount(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);
                if (config.activeDimensionIds) activeDimensionIds = config.activeDimensionIds;
                if (config.currentFilters) currentFilters = config.currentFilters;
                if (config.isVelocityMode !== undefined) isVelocityMode = config.isVelocityMode;
                if (config.isCompareMode !== undefined) isCompareMode = config.isCompareMode; 
                if (config.velocityDays) velocityDays = config.velocityDays;
                if (config.dateFilter) dateFilter = config.dateFilter;
                if (config.expandedRows) expandedRows = new Set(config.expandedRows);
            } 
            catch (e) {}
        }
        const savedCols = localStorage.getItem(COLUMNS_STORAGE_KEY);
        if (savedCols) {
            try { columnSettings = JSON.parse(savedCols); } catch (e) {}
        }
        isConfigLoaded = true;
    });

    $: {
        if (isConfigLoaded && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ activeDimensionIds, currentFilters, isVelocityMode, isCompareMode, velocityDays, dateFilter, expandedRows: Array.from(expandedRows) }));
            localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columnSettings));
        }
    }

    const parseMoney = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/,/g, '')) || 0;
    };
    const isValidRow = (row) => {
        return (row.trangThaiThuTien || "").trim() === 'Đã thu' && 
               (row.trangThaiHuy || "").trim() === 'Chưa hủy' && 
               (row.tinhTrangTra || "").trim() === 'Chưa trả' && 
               (row.trangThaiXuat || "").trim() === 'Đã xuất';
    };

    const getDimensionValue = (row, dimId) => {
        let val = row[dimId] || '';
        if (dimId === 'nhanVienTao') {
             val = row.nguoiTao || '';
             const maNVMatch = val.match(/(\d+)/);
             return formatters.getShortEmployeeName(val, maNVMatch ? maNVMatch[1] : '');
        }
        if (!val) return '(Trống)';
        return String(val).trim();
    };

    // [PHẪU THUẬT LOGIC]: Hàm chuẩn hóa ngày đa năng giải quyết định dạng Excel Serial Date và chuỗi thô
    const getRowDate = (row) => {
        const d = row.ngayTao || row.ngay_tao || row.NgayTao || row['Ngày tạo'] || row.ngayXuat || row.ngay_xuat || row.NgayXuat || row.ngayChungTu;
        if (!d) return null;
        if (d instanceof Date && !isNaN(d)) return d;
        if (!isNaN(d) && Number(d) > 30000 && Number(d) < 60000) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            return new Date(excelEpoch.getTime() + Number(d) * 86400000);
        }
        const str = String(d).trim();
        const parts = str.split(/[-/ ]/);
        if (parts.length >= 3) {
            if (parts[0].length === 4) {
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }
        return null;
    };

    function calculateData() {
        treeData = [];
        totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0, quantityCK: 0, revenueCK: 0, revenueQDCK: 0, revenueTraChamCK: 0 };
        warnings = [];
        if (!data || data.length === 0) return;

        // [PHẪU THUẬT LOGIC]: Xác định mốc thời gian thực tế dựa trên ngày lớn nhất có trong dữ liệu tải lên
        let referenceDate = new Date();
        let computedElapsedDays = Math.max(1, referenceDate.getDate() - 1);
        let computedDaysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();

        let maxRowDate = null;
        data.forEach(row => {
            const rd = getRowDate(row);
            if (rd && (!maxRowDate || rd > maxRowDate)) {
                maxRowDate = rd;
            }
        });

        if (maxRowDate) {
            referenceDate = maxRowDate;
            computedElapsedDays = maxRowDate.getDate();
            computedDaysInMonth = new Date(maxRowDate.getFullYear(), maxRowDate.getMonth() + 1, 0).getDate();
        }

        elapsedDays = computedElapsedDays;
        daysInMonth = computedDaysInMonth;

        // Xác định chuỗi Tháng/Năm đích của kỳ trước cần so sánh (lùi 1 tháng từ dữ liệu hiện tại)
        let prevMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
        const targetPrevMonthStr = `${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}/${prevMonthDate.getFullYear()}`;

        let processedData = dateFilter.from || dateFilter.to ?
            filterDataByDate(data, dateFilter.from, dateFilter.to) : data;
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi();
        let rootMap = new Map();
        const processRowIntoTree = (row, isCK = false) => {
            if (!hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat) || !isValidRow(row)) return;
            if (Object.keys(currentFilters).length > 0) {
                for (const [key, selectedValues] of Object.entries(currentFilters)) {
                    if (selectedValues !== undefined && !selectedValues.includes(getDimensionValue(row, key))) return;
                }
            }

            const quantity = parseInt(row.soLuong || 0);
            const revenue = parseMoney(row.thanhTien);
            let heSo = dataProcessing.getHeSoForCategory(row.nhomHang, heSoQuyDoiMap);
            const isTraGop = (row.hinhThucXuat || '').toLowerCase().includes('trả');
            if (isTraGop) heSo += 0.3;
            const revenueQD = revenue * heSo;

            if (!isCK) {
                totalMetrics.quantity += quantity;
                totalMetrics.revenue += revenue; totalMetrics.revenueQD += revenueQD;
                if (isTraGop) totalMetrics.revenueTraCham += revenue;
            } else {
                totalMetrics.quantityCK += quantity;
                totalMetrics.revenueCK += revenue; totalMetrics.revenueQDCK += revenueQD;
                if (isTraGop) totalMetrics.revenueTraChamCK += revenue;
            }

            let currentLevel = rootMap;
            activeDimensionIds.forEach((dimId, index) => {
                const key = getDimensionValue(row, dimId);
                const stableId = `${index}_${key}`;

                if (!currentLevel.has(key)) {
                    currentLevel.set(key, { id: stableId, name: key, quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0, quantityCK: 0, revenueCK: 0, revenueQDCK: 0, revenueTraChamCK: 0, children: new Map(), level: index });
                }
                
                const groupObj = currentLevel.get(key);
                if (!isCK) {
                    groupObj.quantity += quantity; groupObj.revenue += revenue; groupObj.revenueQD += revenueQD;
                    if (isTraGop) groupObj.revenueTraCham += revenue;
                } else {
                    groupObj.quantityCK += quantity; groupObj.revenueCK += revenue; groupObj.revenueQDCK += revenueQD;
                    if (isTraGop) groupObj.revenueTraChamCK += revenue;
                }
                currentLevel = groupObj.children;
            });
        };

        processedData.forEach(row => processRowIntoTree(row, false));
        
        // [PHẪU THUẬT LOGIC]: Đặt màng lọc chặn đứng tình trạng cộng dồn đa tháng của tệp dữ liệu cùng kỳ
        if (isCompareMode && $ycxDataThangTruoc?.length > 0) {
            $ycxDataThangTruoc.forEach(row => {
                const rd = getRowDate(row);
                if (rd) {
                    const rowMonthStr = `${String(rd.getMonth() + 1).padStart(2, '0')}/${rd.getFullYear()}`;
                    if (rowMonthStr === targetPrevMonthStr) {
                        processRowIntoTree(row, true);
                    }
                }
            });
        }

        const convertMapToArray = (map) => Array.from(map.values()).map(item => {
            const newItem = { ...item };
            if (newItem.children?.size > 0) {
                newItem.children = convertMapToArray(newItem.children);
                newItem.children.sort((a, b) => b.revenue - a.revenue);
            } else delete newItem.children;
       
            return newItem;
        }).sort((a, b) => b.revenue - a.revenue);
        let finalTree = convertMapToArray(rootMap);
        if (isVelocityMode && velocityDays > 1) {
            finalTree = transformVelocityTree(finalTree, velocityDays);
            const div = (v) => parseFloat(((v || 0) / velocityDays).toFixed(1));
            totalMetrics.quantity = div(totalMetrics.quantity); totalMetrics.revenue = div(totalMetrics.revenue);
            totalMetrics.revenueQD = div(totalMetrics.revenueQD);
            totalMetrics.revenueTraCham = div(totalMetrics.revenueTraCham);
        }

        if (isVelocityMode && inventoryIndex) {
            inventoryHelper.enrichTreeWithInventory(finalTree, inventoryIndex, velocityDays, alertDays);
            hasInventoryData = true;
            finalTree = [...finalTree]; 
        } else hasInventoryData = false;

        treeData = finalTree;
        totalMetrics = { ...totalMetrics };
        updateFilterOptions(processedData);
    }

    function updateFilterOptions(sourceData) {
        const options = {};
        AVAILABLE_DIMENSIONS.forEach(targetDim => {
            const uniqueValues = new Set();
            const otherFilters = { ...currentFilters };
            delete otherFilters[targetDim.id]; 

            sourceData.forEach(row => {
                if (!dataProcessing.getHinhThucXuatTinhDoanhThu().has(row.hinhThucXuat) || !isValidRow(row)) return;
                let isValid = true;
                for (const [filterKey, filterValues] of Object.entries(otherFilters)) {
                    if (filterValues !== undefined && !filterValues.includes(getDimensionValue(row, filterKey))) { isValid = false; break; }
                }
                if (isValid) {
                     const val = getDimensionValue(row, targetDim.id);
                    if (val && val !== '(Trống)') uniqueValues.add(val);
                }
            });
            options[targetDim.id] = Array.from(uniqueValues).sort();
        });
        filterOptions = options;
    }

    async function handleInventoryUpload(event) {
        try {
            const index = await inventoryHelper.processFile(event.detail);
            if (index) {
                inventoryIndex = index;
                activeDimensionIds = activeDimensionIds.filter(id => id !== 'nhaSanXuat' && id !== 'nhanVienTao');
                calculateData(); 
                alert(`Cập nhật tồn kho thành công!`);
            }
        } catch (e) { alert("Lỗi đọc file tồn kho: " + e.message);
        }
    }

    $: { if (data || $ycxDataThangTruoc || selectedWarehouse || currentFilters || activeDimensionIds || isVelocityMode || isCompareMode || velocityDays || dateFilter) calculateData();
    }

    const getCurrentMinusOne = () => Math.max(1, new Date().getDate() - 1);
    function toggleVelocityMode() {
        isVelocityMode = !isVelocityMode;
        if (isVelocityMode) { velocityDays = getCurrentMinusOne();
        isCompareMode = false; } 
        else { velocityDays = 1; hasInventoryData = false;
        }
    }

    function toggleCompareMode() {
        isCompareMode = !isCompareMode;
        if (isCompareMode) {
            isVelocityMode = false;
            if (!$ycxDataThangTruoc || $ycxDataThangTruoc.length === 0) {
                alert("Bạn chưa Upload dữ liệu Yêu cầu xuất tháng trước. Vui lòng tải file lên.");
                isCompareMode = false;
            }
        }
    }
</script>

<div class="animate-fade-in pb-10" data-capture-filename="ChiTietNganhHang">
    <div class="velocity-toolbar flex flex-wrap items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div class="flex flex-col gap-1">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Thời gian dữ liệu</span>
            <div class="flex items-center bg-gray-50 rounded border border-gray-300 px-2 py-1">
                 <input type="date" bind:value={dateFilter.from} class="bg-transparent text-sm text-gray-700 outline-none w-32" />
                <span class="mx-2 text-gray-400">➝</span>
                <input type="date" bind:value={dateFilter.to} class="bg-transparent text-sm text-gray-700 outline-none w-32" />
            </div>
        </div>

        <div class="w-px h-10 bg-gray-200 mx-2"></div>

        <div class="flex items-center gap-3 h-full pb-1">
             <span class="text-sm font-semibold text-gray-700">Theo dõi sức bán:</span>
            <button class="{isVelocityMode ? 'bg-orange-500' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none" on:click={toggleVelocityMode}>
                <span class="{isVelocityMode ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
        </div>

        <div class="w-px h-10 bg-gray-200 mx-2"></div>
        <div class="flex items-center gap-3 h-full pb-1">
            <span class="text-sm font-semibold text-gray-700">So sánh Cùng kỳ:</span>
            <button class="{isCompareMode ? 'bg-blue-500' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none" on:click={toggleCompareMode}>
                <span class="{isCompareMode ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
        </div>

        {#if isVelocityMode}
            <div class="flex items-center gap-2 h-full pb-1 animate-fade-in border-l border-gray-200 pl-4 ml-2">
                <button on:click={() => velocityDays = getCurrentMinusOne()} class="px-3 py-1 text-xs font-bold rounded border bg-green-50 text-green-700 border-green-200 hover:bg-green-100">Hiện tại ({getCurrentMinusOne()})</button>
                 <div class="flex items-center ml-2 bg-white rounded border border-gray-300 px-2 py-1">
                    <span class="text-xs text-gray-400 mr-1">Khác:</span>
                    <input type="number" min="1" class="w-10 text-sm font-bold text-center outline-none text-orange-700" bind:value={velocityDays} />
                </div>
             </div>
            <InventoryToolbar {isVelocityMode} on:upload={handleInventoryUpload} on:settingsChange={(e) => { alertDays = e.detail.alertDays; if(inventoryIndex) calculateData(); }} />
        {/if}
    </div>

    {#if isCompareMode && !isVelocityMode}
    {/if}

    <details class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 capture-hide" style="cursor: pointer;">
        <summary class="text-xs font-bold text-gray-500 uppercase select-none outline-none flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Cấu hình ẩn / hiện cột dữ liệu báo cáo
        </summary>
        <div class="flex flex-wrap gap-2 mt-2.5" on:click|stopPropagation>
            {#each columnSettings as col}
                <button type="button" class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none {col.visible ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}" on:click={() => { col.visible = !col.visible; columnSettings = [...columnSettings]; }}>
                    {col.visible ? '✓ ' : '+ '} {col.label}
                </button>
            {/each}
        </div>
    </details>

    <LuykeCategoryTreeTable 
        data={treeData} 
         {totalMetrics}
        allDimensions={displayedDimensions} 
        activeIds={activeDimensionIds}
        {filterOptions}
        {currentFilters}
        {isVelocityMode} 
        {isCompareMode}
        {columnSettings}
        {elapsedDays}
        {daysInMonth}
        bind:sortKey
        bind:sortDirection
        bind:expandedRows={expandedRows}
        on:configChange={(e) => activeDimensionIds = e.detail}
        on:filterChange={(e) => { 
            const { key, selected } = e.detail; 
            if (selected === undefined) { const nf = {...currentFilters}; delete nf[key]; currentFilters = nf; } 
            else currentFilters = {...currentFilters, [key]: selected};
         }}
        hasInventoryData={hasInventoryData}
    />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out;
 }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>