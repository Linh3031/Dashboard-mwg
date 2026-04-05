<svelte:window on:click={() => showSsgMonthsDropdown = false} />

<script>
    import { onMount, tick } from 'svelte';
    import { ycxData, ycxDataCungKyNam, ycxDataThangTruoc, fileSyncState } from '../../stores.js'; 
    import { processDashboardData, AVAILABLE_DIMENSIONS } from './dtcknam/DtCkNamLogic.js';
    import KpiBoard from './dtcknam/KpiBoard.svelte';
    import RevenueCharts from './dtcknam/RevenueCharts.svelte';
    import DtCkNamTable from './dtcknam/DtCkNamTable.svelte'; 
    import SsgNamTable from './dtcknam/SsgNamTable.svelte';
    
    export let selectedWarehouse = '';
    $: warehouseTitle = selectedWarehouse ? `- Kho ${selectedWarehouse}` : '- Gộp các kho';

    let isInitializing = true;
    let isTransitioning = false; 
    let viewMode = 'single'; 
    
    let availableMonths = [];
    let selectedMonth = '';
    let ssgMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    let allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    let showSsgMonthsDropdown = false;

    $: data2026All = [...($ycxDataThangTruoc || []), ...($ycxData || [])];

    // [FIX]: Trình phân tích Ngày tháng đa năng (Tránh Invalid Date của Cache)
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

    const parseDateMax = (dateVal) => {
        const d = parseSafeDate(dateVal);
        return d ? d.getTime() : 0;
    };
    $: maxTs2026 = data2026All.length > 0 
        ? data2026All.reduce((max, r) => {
            const ts = parseDateMax(r.ngayTao || r.NGAY_TAO);
            return ts > max ? ts : max;
        }, 0) 
        : 0;
    $: maxDateStr2026 = maxTs2026 > 0 
        ? `${String(new Date(maxTs2026).getDate()).padStart(2,'0')}/${String(new Date(maxTs2026).getMonth()+1).padStart(2,'0')}/${new Date(maxTs2026).getFullYear()}` 
        : '';

    onMount(() => {
        try {
            const saved = localStorage.getItem('dtck_ssg_months_v3');
            if (saved) ssgMonths = JSON.parse(saved);
        } catch(e) {}
        setTimeout(() => { isInitializing = false; }, 500);
    });

    $: { localStorage.setItem('dtck_ssg_months_v3', JSON.stringify(ssgMonths)); }

    // [FIX]: Lấy tháng an toàn
    const getMonthYear = (dateVal) => {
        const d = parseSafeDate(dateVal);
        if (!d) return null;
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    $: if ($ycxDataCungKyNam && $ycxDataCungKyNam.length > 0) {
        const months = new Set();
        $ycxDataCungKyNam.forEach(row => {
            const my = getMonthYear(row.ngayTao || row.NGAY_TAO);
            if (my) months.add(my);
        });
        availableMonths = Array.from(months).sort((a,b) => {
            const [mA, yA] = a.split('/'); const [mB, yB] = b.split('/');
            return new Date(yB, mB-1) - new Date(yA, mA-1);
        });
        if (!selectedMonth && availableMonths.length > 0) selectedMonth = availableMonths[0];
    }

    $: filteredSingleData = $ycxDataCungKyNam.filter(row => {
        if (!selectedMonth) return true;
        return getMonthYear(row.ngayTao || row.NGAY_TAO) === selectedMonth;
    });

    async function switchMode(mode) {
        if (viewMode === mode) return;
        isTransitioning = true;
        await tick(); 
        setTimeout(() => {
            viewMode = mode;
            isTransitioning = false;
        }, 100);
    }

    $: isSyncing = $fileSyncState && $fileSyncState['saved_ycx_cungkynam'] && $fileSyncState['saved_ycx_cungkynam'].status === 'downloading';
    $: showLoading = isInitializing || isSyncing;

    let dashboardData = { metrics: {}, totalMetrics: {}, totalDays: 1, filterOptions: {}, dailyData: [], treeData: [] };
    let currentFilters = {};
    let activeDimensionIds = ['nganhHang', 'nhomHang'];
    let expandedRows = new Set();
    let sortConfig = { key: 'revenue', direction: 'desc' };

    $: if (viewMode === 'single' && !showLoading && !isTransitioning) {
        dashboardData = processDashboardData(filteredSingleData, activeDimensionIds, currentFilters, sortConfig);
    }
</script>

{#if showLoading}
    <div class="flex items-center justify-center p-12 text-gray-500">
        <svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span class="text-lg font-medium">Đang chuẩn bị dữ liệu báo cáo...</span>
    </div>
{:else}
    <h2 class="text-2xl md:text-3xl font-black text-gray-800 text-center uppercase tracking-wide mb-6">
        DOANH THU CÙNG KỲ <span class="text-blue-600">{warehouseTitle}</span>
    </h2>

    <div class="flex items-center gap-4 mb-4">
        <div class="flex bg-gray-100 p-1 rounded-lg">
            <button class="px-4 py-2 rounded-md font-medium text-sm transition-colors {viewMode === 'single' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}" on:click={() => switchMode('single')}>
                Xem 1 Tháng (Năm trước)
            </button>
            <button class="px-4 py-2 rounded-md font-medium text-sm transition-colors {viewMode === 'ssg' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}" on:click={() => switchMode('ssg')}>
                So sánh Cùng kỳ (SSG)
            </button>
        </div>

        {#if viewMode === 'single' && availableMonths.length > 0}
        <div class="flex items-center gap-2 animate-fade-in">
            <span class="text-sm text-gray-600 font-bold">Tháng:</span>
            <select bind:value={selectedMonth} class="border border-gray-300 bg-white rounded-md px-3 py-1.5 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer">
                <option value="">Tất cả</option>
                {#each availableMonths as month}
                    <option value={month}>{month}</option>
                {/each}
            </select>
        </div>
        {/if}

        {#if viewMode === 'ssg'}
        <div class="relative animate-fade-in flex items-center gap-3">
            <button class="px-4 py-1.5 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 shadow-sm flex items-center gap-2" on:click|stopPropagation={() => showSsgMonthsDropdown = !showSsgMonthsDropdown}>
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Tháng so sánh ({ssgMonths.length}/12) ▾
            </button>
            
            {#if maxDateStr2026}
                <div class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Dữ liệu 2026 tính đến: {maxDateStr2026}
                </div>
            {/if}

            {#if showSsgMonthsDropdown}
                <div class="absolute top-full mt-1 left-0 bg-white border border-gray-200 shadow-xl rounded-md w-56 max-h-64 overflow-y-auto z-50 p-2" on:click|stopPropagation>
                    <button class="text-blue-600 font-bold mb-2 w-full text-left text-sm hover:bg-blue-50 px-2 py-1.5 rounded transition-colors" on:click={() => ssgMonths = ssgMonths.length === 12 ? [] : [...allMonths]}>
                        {ssgMonths.length === 12 ? '[ ] Bỏ chọn tất cả' : '[✓] Chọn tất cả'}
                    </button>
                    <div class="grid grid-cols-2 gap-1">
                        {#each allMonths as opt}
                            <label class="flex items-center gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-sm rounded">
                                <input type="checkbox" value={opt} bind:group={ssgMonths} class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"> Tháng {opt}
                            </label>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
        {/if}
    </div>

    {#if isTransitioning}
        <div class="flex flex-col items-center justify-center p-16 text-gray-500 animate-pulse bg-gray-50 rounded-xl border border-gray-100">
            <svg class="animate-spin mb-4 h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="text-lg font-bold text-gray-700">Đang tổng hợp dữ liệu SSG...</span>
            <span class="text-sm mt-2 text-gray-400">Vui lòng đợi giây lát</span>
        </div>
    {:else}
        {#if viewMode === 'single'}
            <div class="animate-fade-in space-y-4">
                <KpiBoard metrics={dashboardData.metrics} />
                <div class="mb-4">
                    <RevenueCharts weeklyData={dashboardData.weeklyData} dailyData={dashboardData.dailyData} {warehouseTitle} />
                </div>
                <DtCkNamTable 
                    data={dashboardData.treeData} 
                    totalMetrics={dashboardData.totalMetrics} 
                    totalDays={dashboardData.totalDays} 
                    allDimensions={AVAILABLE_DIMENSIONS} 
                    activeIds={activeDimensionIds}
                    filterOptions={dashboardData.filterOptions} 
                    currentFilters={currentFilters} 
                    sortConfig={sortConfig}
                    bind:expandedRows
                    on:filterChange={(e) => currentFilters = e.detail}
                    on:sort={(e) => sortConfig = e.detail}
                    on:configChange={(e) => activeDimensionIds = e.detail}
                />
            </div>
        {:else}
            <div class="animate-fade-in">
                {#if data2026All.length === 0}
                    <div class="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm mb-4 flex items-center gap-3">
                        <i data-feather="alert-triangle" class="w-5 h-5 flex-shrink-0"></i>
                        <div><strong class="block mb-1">Thiếu dữ liệu Năm 2026!</strong> Vui lòng tải file YCX Lũy kế tháng trước và YCX Lũy kế hiện tại.</div>
                    </div>
                {/if}
                <SsgNamTable data2025={$ycxDataCungKyNam} data2026={data2026All} {ssgMonths} />
            </div>
        {/if}
    {/if}
{/if}

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>