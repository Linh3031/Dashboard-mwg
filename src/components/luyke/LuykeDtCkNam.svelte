<script>
    import { dtCkNamData } from '../../stores.js'; 
    import FileInput from '../common/FileInput.svelte';
    
    import { processDashboardData, AVAILABLE_DIMENSIONS } from './dtcknam/DtCkNamLogic.js';
    import KpiBoard from './dtcknam/KpiBoard.svelte';
    import RevenueCharts from './dtcknam/RevenueCharts.svelte';
    import DtCkNamTable from './dtcknam/DtCkNamTable.svelte'; 
    
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

    let isUploadOpen = true;
    
    // [VÁ LỖI CHỚP NHÁY]: Biến lưu lại vết dữ liệu cũ để so sánh
    let currentDataRef = null;

    $: {
        if ($dtCkNamData && $dtCkNamData.length > 0 && activeDimensionIds && sortConfig) {
            
            // CHỈ tự động đóng khung Upload khi nhận thấy có 1 cục Data mới hoàn toàn được đẩy vào
            if (currentDataRef !== $dtCkNamData) {
                currentDataRef = $dtCkNamData;
                isUploadOpen = false; 
            }

            const triggerFilter = currentFilters; 
            const result = processDashboardData($dtCkNamData, activeDimensionIds, currentFilters, sortConfig);
            
            metrics = result.metrics; 
            totalDays = result.totalDays;
            dailyData = result.dailyData; 
            weeklyData = result.weeklyData;
            treeData = result.treeData; 
            totalMetrics = result.totalMetrics;
            filterOptions = result.filterOptions;
        }
    }

    function handleConfigChange(event) { activeDimensionIds = event.detail; }
    
    function handleSort(event) {
        const key = event.detail;
        if (sortConfig.key === key) sortConfig = { ...sortConfig, direction: sortConfig.direction === 'desc' ? 'asc' : 'desc' };
        else sortConfig = { key, direction: 'desc' };
    }
    
    function handleFilterChange(event) {
        const { key, selected } = event.detail;
        if (selected === undefined) {
            const newFilters = { ...currentFilters }; 
            delete newFilters[key]; 
            currentFilters = newFilters;
        } else {
            currentFilters = { ...currentFilters, [key]: selected };
        }
    }
</script>

<div class="p-4 space-y-4">
    <details class="bg-slate-50 rounded-xl shadow-sm border border-slate-200 group" bind:open={isUploadOpen}>
        <summary class="p-4 cursor-pointer text-sm font-bold text-slate-700 flex items-center justify-between list-none hover:bg-slate-100 transition-colors rounded-xl">
            <div class="flex items-center gap-2">
                <i data-feather="upload-cloud" class="w-4 h-4 text-blue-600"></i>
                <span class="group-open:text-blue-700">Cập nhật dữ liệu Doanh thu Năm (Click để mở)</span>
            </div>
            <span class="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded border shadow-sm">Tháng cập nhật 1 lần</span>
        </summary>
        <div class="p-4 border-t border-slate-200 bg-white rounded-b-xl flex gap-4 items-center">
            <div class="flex-1">
                <FileInput label="Dữ liệu DT CK Năm (Excel/CSV)" icon="upload-cloud" saveKey="saved_dt_ck_nam" />
            </div>
            <p class="text-xs text-gray-500 italic max-w-xs">* Dữ liệu tự động đồng bộ lên Cloud theo Siêu thị bạn chọn.</p>
        </div>
    </details>

    <KpiBoard {metrics} />
    <RevenueCharts {weeklyData} {dailyData} />

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div class="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 class="text-sm font-bold text-gray-700 uppercase">Chi tiết danh mục (Kỳ {totalDays} ngày)</h3>
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
            bind:expandedRows={expandedRows} 
            on:configChange={handleConfigChange} 
            on:filterChange={handleFilterChange} 
            on:sort={handleSort}
        />
    </div>
</div>