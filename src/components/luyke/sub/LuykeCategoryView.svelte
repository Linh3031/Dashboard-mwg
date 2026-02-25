<script>
    import { onMount } from 'svelte';
    import { cleanCategoryName } from '../../../utils.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import { filterDataByDate, transformVelocityTree } from '../../../services/processing/logic/salesVelocity.helper.js';
    import { formatters } from '../../../utils/formatters.js';
    import { ycxDataThangTruoc } from '../../../stores.js';
    
    // Components
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
    
    // --- STATE ---
    let activeDimensionIds = ['nganhHang', 'nhaSanXuat'];
    let treeData = [];
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0, quantityCK: 0, revenueCK: 0, revenueQDCK: 0, revenueTraChamCK: 0 };
    
    let currentFilters = {};
    let filterOptions = {};
    let warnings = [];
    let expandedRows = new Set();
    let isConfigLoaded = false;
    
    // [GENESIS FIX]: Đổi Key để vô hiệu hóa cache bộ lọc cũ gây lỗi trắng trang
    const STORAGE_KEY = 'LUYKE_CATEGORY_CONFIG_V2'; 
    
    // --- VELOCITY, DATE & COMPARE STATE ---
    let isVelocityMode = false;
    let velocityDays = 1;
    let dateFilter = { from: '', to: '' }; 
    let isCompareMode = false;
    let compareSortType = 'diff'; 

    let sortKey = 'revenue';
    let sortDirection = 'desc';

    // --- INVENTORY STATE ---
    let inventoryIndex = null;
    let alertDays = 3;
    let hasInventoryData = false;

    const PRESET_DAYS = [3, 5, 7, 10];
    
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
                if (config.compareSortType !== undefined) compareSortType = config.compareSortType; 
                if (config.velocityDays) velocityDays = config.velocityDays;
                if (config.dateFilter) dateFilter = config.dateFilter;
                if (config.expandedRows) expandedRows = new Set(config.expandedRows);
            } 
            catch (e) { console.error('Error loading config', e); }
        }
        isConfigLoaded = true;
    });

    $: {
        if (isConfigLoaded && typeof sessionStorage !== 'undefined') {
            const configToSave = {
                activeDimensionIds, currentFilters, isVelocityMode, isCompareMode, compareSortType, velocityDays, dateFilter,
                expandedRows: Array.from(expandedRows)
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
        }
    }

    const parseMoney = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/,/g, '')) || 0;
    };
    const isValidRow = (row) => {
        const isThuTien = (row.trangThaiThuTien || "").trim() === 'Đã thu';
        const isChuaHuy = (row.trangThaiHuy || "").trim() === 'Chưa hủy';
        const isChuaTra = (row.tinhTrangTra || "").trim() === 'Chưa trả';
        const isDaXuat = (row.trangThaiXuat || "").trim() === 'Đã xuất';
        return isThuTien && isChuaHuy && isChuaTra && isDaXuat;
    };
    const getDimensionValue = (row, dimId) => {
        let val = '';
        if (dimId === 'nganhHang') val = row.nganhHang;
        else if (dimId === 'nhomHang') val = row.nhomHang;
        else if (dimId === 'nhaSanXuat') val = row.nhaSanXuat;
        else if (dimId === 'nhanVienTao') val = row.nguoiTao;
        else if (dimId === 'tenSanPham') val = row.tenSanPham;

        if (!val) return '(Trống)';
        if (dimId === 'nhanVienTao') {
             const maNVMatch = val.match(/(\d+)/);
             return formatters.getShortEmployeeName(val, maNVMatch ? maNVMatch[1] : '');
        }

        if (dimId === 'tenSanPham' || dimId === 'nhaSanXuat') return val.toString().trim();
        return cleanCategoryName(val);
    };

    function calculateData() {
        treeData = [];
        totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0, quantityCK: 0, revenueCK: 0, revenueQDCK: 0, revenueTraChamCK: 0 };
        warnings = [];
        if (!data || data.length === 0) return;

        let processedData = data;
        if (dateFilter.from || dateFilter.to) {
            processedData = filterDataByDate(data, dateFilter.from, dateFilter.to);
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi();
        let rootMap = new Map();

        const processRowIntoTree = (row, isCK = false) => {
            if (!hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat)) return;
            if (!isValidRow(row)) return;
            
            // [GENESIS FIX]: Ép kiểu undefined rõ ràng
            if (Object.keys(currentFilters).length > 0) {
                for (const [key, selectedValues] of Object.entries(currentFilters)) {
                    if (selectedValues !== undefined) {
                        const cellVal = getDimensionValue(row, key);
                        if (!selectedValues.includes(cellVal)) return; 
                    }
                }
            }

            const quantity = parseInt(row.soLuong || 0);
            const revenue = parseMoney(row.thanhTien);
            
            let heSo = heSoQuyDoiMap[row.nhomHang];
            if (heSo === undefined && row.nhomHang) {
                const matchId = String(row.nhomHang).match(/^(\d+)/);
                if (matchId) {
                    const foundKey = Object.keys(heSoQuyDoiMap).find(k => k.startsWith(matchId[1] + ' -'));
                    if (foundKey) heSo = heSoQuyDoiMap[foundKey];
                }
            }
            heSo = heSo || 1;

            const htx = (row.hinhThucXuat || '').toLowerCase();
            const isTraGop = htx.includes('trả góp') || htx.includes('trả chậm');
            if (isTraGop) heSo += 0.3;
            
            const revenueQD = revenue * heSo;

            if (!isCK) {
                totalMetrics.quantity += quantity;
                totalMetrics.revenue += revenue;
                totalMetrics.revenueQD += revenueQD;
                if (isTraGop) totalMetrics.revenueTraCham += revenue;
            } else {
                totalMetrics.quantityCK += quantity;
                totalMetrics.revenueCK += revenue;
                totalMetrics.revenueQDCK += revenueQD;
                if (isTraGop) totalMetrics.revenueTraChamCK += revenue;
            }

            let currentLevel = rootMap;
            activeDimensionIds.forEach((dimId, index) => {
                const rawValue = row[dimId] || ''; 
                const key = getDimensionValue(row, dimId);
                const stableId = `${index}_${key}`;

                if (!currentLevel.has(key)) {
                    let nodeData = {
                        id: stableId, name: key,
                        quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0,
                        quantityCK: 0, revenueCK: 0, revenueQDCK: 0, revenueTraChamCK: 0, 
                        children: new Map(), level: index
                    };

                    if (dimId === 'tenSanPham') nodeData.productCode = row.maSanPham || ''; 
                    else if (dimId === 'nhomHang') {
                        const m = rawValue.toString().match(/^(\d+)/);
                        if (m) nodeData.groupId = m[1];
                    } else if (dimId === 'nganhHang') {
                        const m = rawValue.toString().match(/^(\d+)/);
                        if (m) nodeData.categoryId = m[1];
                    }
                    currentLevel.set(key, nodeData);
                }
                
                const groupObj = currentLevel.get(key);
                if (!isCK) {
                    groupObj.quantity += quantity;
                    groupObj.revenue += revenue;
                    groupObj.revenueQD += revenueQD;
                    if (isTraGop) groupObj.revenueTraCham += revenue;
                } else {
                    groupObj.quantityCK += quantity;
                    groupObj.revenueCK += revenue;
                    groupObj.revenueQDCK += revenueQD;
                    if (isTraGop) groupObj.revenueTraChamCK += revenue;
                }
                currentLevel = groupObj.children;
            });
        };

        processedData.forEach(row => processRowIntoTree(row, false));

        if (isCompareMode && $ycxDataThangTruoc && $ycxDataThangTruoc.length > 0) {
            $ycxDataThangTruoc.forEach(row => processRowIntoTree(row, true));
        }

        const convertMapToArray = (map) => {
            return Array.from(map.values()).map(item => {
                const newItem = { ...item };
                if (newItem.children && newItem.children.size > 0) {
                    newItem.children = convertMapToArray(newItem.children);
                    newItem.children.sort((a, b) => b.revenue - a.revenue);
                } else {
                    delete newItem.children;
                }
                return newItem;
            }).sort((a, b) => b.revenue - a.revenue);
        };
        
        let finalTree = convertMapToArray(rootMap);
        
        if (isVelocityMode && velocityDays > 1) {
            finalTree = transformVelocityTree(finalTree, velocityDays);
            const div = (v) => parseFloat(((v || 0) / velocityDays).toFixed(1));
            totalMetrics.quantity = div(totalMetrics.quantity);
            totalMetrics.revenue = div(totalMetrics.revenue);
            totalMetrics.revenueQD = div(totalMetrics.revenueQD);
            totalMetrics.revenueTraCham = div(totalMetrics.revenueTraCham);
        }

        if (isVelocityMode && inventoryIndex) {
            inventoryHelper.enrichTreeWithInventory(finalTree, inventoryIndex, velocityDays, alertDays);
            hasInventoryData = true;
            finalTree = [...finalTree]; 
        } else {
            hasInventoryData = false;
        }

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
                let isValid = true;
                const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
                if (!hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat)) return; 
                if (!isValidRow(row)) return;

                if (Object.keys(otherFilters).length > 0) {
                    for (const [filterKey, filterValues] of Object.entries(otherFilters)) {
                        // [GENESIS FIX]: Ép kiểu undefined
                        if (filterValues !== undefined) {
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

    async function handleInventoryUpload(event) {
        const file = event.detail;
        try {
            const index = await inventoryHelper.processFile(file);
            if (index) {
                inventoryIndex = index;
                activeDimensionIds = activeDimensionIds.filter(id => id !== 'nhaSanXuat' && id !== 'nhanVienTao');
                calculateData(); 
                alert(`Cập nhật tồn kho thành công!`);
            }
        } catch (e) { console.error(e); alert("Lỗi đọc file tồn kho: " + e.message); }
    }

    function handleInventorySettings(event) {
        alertDays = event.detail.alertDays;
        if (inventoryIndex) calculateData();
    }

    $: {
        if (data || $ycxDataThangTruoc || selectedWarehouse || currentFilters || activeDimensionIds || isVelocityMode || isCompareMode || velocityDays || dateFilter) {
            calculateData();
        }
    }

    function handleConfigChange(event) { activeDimensionIds = event.detail; }

    function handleFilterChange(event) {
        const { key, selected } = event.detail;
        if (selected === undefined) {
            const newFilters = { ...currentFilters };
            delete newFilters[key]; // Xóa hẳn key để reset
            currentFilters = newFilters;
        } else {
            currentFilters = { ...currentFilters, [key]: selected };
        }
    }
    
    const getCurrentMinusOne = () => Math.max(1, new Date().getDate() - 1);
    function toggleVelocityMode() {
        isVelocityMode = !isVelocityMode;
        if (isVelocityMode) {
            velocityDays = getCurrentMinusOne();
            isCompareMode = false;
        } else {
            velocityDays = 1;
            hasInventoryData = false;
        }
    }

    function toggleCompareMode() {
        isCompareMode = !isCompareMode;
        if (isCompareMode) {
            isVelocityMode = false;
            if (!$ycxDataThangTruoc || $ycxDataThangTruoc.length === 0) {
                alert("Bạn chưa Upload dữ liệu Yêu cầu xuất tháng trước. Vui lòng sang tab Cập Nhật Dữ Liệu để tải file lên.");
                isCompareMode = false;
            }
        }
    }

    function setToCurrentDays() { velocityDays = getCurrentMinusOne(); }

    function handleSortPriorityChange(type) {
        compareSortType = type;
        sortDirection = 'desc'; 
    }
</script>

<div class="animate-fade-in pb-10" data-capture-filename="ChiTietNganhHang">
    {#if warnings.length > 0}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>⚠️ Cảnh báo cấu trúc:</strong>
            <ul class="list-disc pl-5 mt-1">
                {#each warnings as w}<li>{w}</li>{/each}
            </ul>
        </div>
    {/if}

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

        {#if isCompareMode}
            <div class="flex items-center gap-2 h-full pb-1 animate-fade-in-down border-l border-gray-200 pl-4 ml-1">
                <span class="text-xs font-bold text-blue-800 uppercase mr-1">Ưu tiên Sort:</span>
                <div class="flex bg-gray-100 rounded-md p-1 border border-gray-200">
                    <button class="{compareSortType === 'current' ? 'bg-white shadow text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-700'} px-2 py-1 text-[11px] rounded transition-all" on:click={() => handleSortPriorityChange('current')}>
                        Số hiện tại
                    </button>
                    <button class="{compareSortType === 'diff' ? 'bg-white shadow text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-700'} px-2 py-1 text-[11px] rounded transition-all" on:click={() => handleSortPriorityChange('diff')}>
                        +/- Chênh lệch
                    </button>
                    <button class="{compareSortType === 'percent' ? 'bg-white shadow text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-700'} px-2 py-1 text-[11px] rounded transition-all" on:click={() => handleSortPriorityChange('percent')}>
                        % Tỷ lệ
                    </button>
                </div>
            </div>
        {/if}

        {#if isVelocityMode}
            <div class="flex items-center gap-2 h-full pb-1 animate-fade-in-down border-l border-gray-200 pl-4 ml-2">
                <span class="text-xs font-bold text-orange-800 uppercase mr-1">Chia TB:</span>
                <button on:click={setToCurrentDays} class="px-3 py-1 text-xs font-bold rounded border transition-all bg-green-50 text-green-700 border-green-200 hover:bg-green-100">Hiện tại ({getCurrentMinusOne()})</button>
                {#each PRESET_DAYS as d}
                    <button on:click={() => velocityDays = d} class="px-3 py-1 text-xs font-medium rounded border transition-all {velocityDays === d ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50 hover:border-orange-300'}">{d} ngày</button>
                {/each}
                <div class="flex items-center ml-2 bg-white rounded border border-gray-300 px-2 py-1">
                    <span class="text-xs text-gray-400 mr-1">Khác:</span>
                    <input type="number" min="1" class="w-10 text-sm font-bold text-center outline-none text-orange-700" bind:value={velocityDays} />
                </div>
            </div>
            <InventoryToolbar {isVelocityMode} on:upload={handleInventoryUpload} on:settingsChange={handleInventorySettings} />
            {#if !hasInventoryData}<span class="text-xs italic text-red-500 ml-2 animate-fade-in">* Thêm file tồn kho để xem cảnh báo tồn kho</span>{/if}
        {/if}
    </div>

    <LuykeCategoryTreeTable 
        data={treeData} 
        {totalMetrics}
        allDimensions={displayedDimensions} 
        activeIds={activeDimensionIds}
        {filterOptions}
        {currentFilters}
        {isVelocityMode} 
        {isCompareMode} 
        {compareSortType}
        bind:sortKey
        bind:sortDirection
        bind:expandedRows={expandedRows}
        on:configChange={handleConfigChange}
        on:filterChange={handleFilterChange}
        hasInventoryData={hasInventoryData}
    />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  .animate-fade-in-down { animation: fadeInDown 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>