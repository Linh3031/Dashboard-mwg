<script>
    import { onMount } from 'svelte';
    import { ycxDataCungKyNam, fileSyncState } from '../../stores.js'; 
    
    import { processDashboardData, AVAILABLE_DIMENSIONS } from './dtcknam/DtCkNamLogic.js';
    import KpiBoard from './dtcknam/KpiBoard.svelte';
    import RevenueCharts from './dtcknam/RevenueCharts.svelte';
    import DtCkNamTable from './dtcknam/DtCkNamTable.svelte'; 
    
    export let selectedWarehouse = '';
    
    $: warehouseTitle = selectedWarehouse ? `- Kho ${selectedWarehouse}` : '- Gộp các kho';

    let isInitializing = true;
    
    onMount(() => {
        const timer = setTimeout(() => { isInitializing = false; }, 1000);
        return () => clearTimeout(timer);
    });

    $: isSyncing = $fileSyncState && 
                   $fileSyncState['saved_ycx_cungkynam'] && 
                   $fileSyncState['saved_ycx_cungkynam'].status === 'downloading';
                   
    $: showLoading = isInitializing || isSyncing;

    let metrics = { actualRev: 0, convertedRev: 0, traChamRev: 0 };
    let totalDays = 1;
    let dailyData = [];
    let weeklyData = [];
    
    let treeData = [];
    let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
    let activeDimensionIds = ['nganhHang', 'nhomHang', 'nhaSanXuat'];
    let currentFilters = {};
    let filterOptions = {};
    let sortConfig = { key: 'revenue', direction: 'desc' };
    let expandedRows = new Set();

    $: {
        if ($ycxDataCungKyNam && $ycxDataCungKyNam.length > 0) {
            const safeActiveIds = (activeDimensionIds && activeDimensionIds.length > 0) ?
                activeDimensionIds : ['nganhHang', 'nhomHang', 'nhaSanXuat'];
            const safeSort = sortConfig || { key: 'revenue', direction: 'desc' };
            const safeFilters = currentFilters || {};

            const res = processDashboardData($ycxDataCungKyNam, safeActiveIds, safeFilters, safeSort);
            
            metrics = res.metrics || { actualRev: 0, convertedRev: 0, traChamRev: 0 };
            treeData = res.treeData || [];
            totalMetrics = res.totalMetrics || { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
            totalDays = res.totalDays || 1;
            filterOptions = res.filterOptions || {};
            dailyData = res.dailyData || [];
            weeklyData = res.weeklyData || [];
        } else {
            metrics = { actualRev: 0, convertedRev: 0, traChamRev: 0 };
            treeData = [];
            totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
            totalDays = 1;
            filterOptions = {};
            dailyData = [];
            weeklyData = [];
        }
    }

    function handleFilterChange(event) {
        currentFilters = event.detail;
    }

    function handleSort(event) {
        sortConfig = event.detail;
    }
</script>

{#if showLoading && (!$ycxDataCungKyNam || $ycxDataCungKyNam.length === 0)}
    <div class="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col items-center justify-center mt-4 min-h-[300px]">
        <svg class="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-lg font-bold text-gray-700">Đang tải dữ liệu Cùng kỳ...</p>
        <p class="text-sm mt-2 text-gray-500">Hệ thống đang đồng bộ dữ liệu từ thiết bị, vui lòng đợi trong giây lát.</p>
    </div>
{:else if !$ycxDataCungKyNam || $ycxDataCungKyNam.length === 0}
    <div class="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500 mt-4 flex flex-col items-center justify-center">
        <i data-feather="inbox" class="w-12 h-12 text-gray-300 mb-4"></i>
        <p class="text-lg font-bold text-gray-700">Chưa có dữ liệu Doanh thu Cùng kỳ</p>
        <p class="text-sm mt-2 text-gray-500 max-w-md">
            Vui lòng quay lại tab <b class="text-indigo-600">Cập nhật dữ liệu</b> (mục Cập nhật 1 tháng 1 lần) để tải file YCX Cùng kỳ năm.
            Hệ thống sẽ tự động gộp số liệu các kho!
        </p>
    </div>
{:else}
    <KpiBoard {metrics} />
    
    <RevenueCharts {weeklyData} {dailyData} {warehouseTitle} />

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
        <div class="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
            <h3 class="text-sm font-bold text-gray-700 uppercase">Chi tiết danh mục (Kỳ {totalDays} ngày) <span class="text-indigo-600 ml-1">{warehouseTitle}</span></h3>
        </div>
        
        <DtCkNamTable 
            data={treeData} 
            {totalMetrics} 
            {totalDays} 
            allDimensions={AVAILABLE_DIMENSIONS} 
            activeIds={activeDimensionIds}
            {filterOptions} 
            {currentFilters} 
            {sortConfig}
            bind:expandedRows
            on:filterChange={handleFilterChange}
            on:sort={handleSort}
        />
    </div>
{/if}