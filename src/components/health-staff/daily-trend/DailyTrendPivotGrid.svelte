<script>
    import { get } from 'svelte/store';
    import { ycxData, danhSachNhanVien, luykeGoalSettings, selectedWarehouse } from '../../../stores.js';
    import { reportService } from '../../../services/reportService.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import { getCompletionColor } from '../../../utils/kpi.utils.js';

    export let tableConfig = null;
    export let allMetricsConfig = [];

    let matrixResult = null;
    let targetConfig = 0;
    let isCalculating = true; 
    let sortKey = 'hoTen';
    let sortDirection = 'asc';

    // --- BỘ MÀU CHUYÊN NGHIỆP DÀNH CHO TIÊU ĐỀ BẢNG (DARK FILL / WHITE TEXT) ---
    const THEMES = [
        { bg: 'bg-slate-700', text: 'text-white', hover: 'hover:bg-slate-800' },
        { bg: 'bg-blue-800', text: 'text-white', hover: 'hover:bg-blue-900' },
        { bg: 'bg-teal-700', text: 'text-white', hover: 'hover:bg-teal-800' },
        { bg: 'bg-indigo-700', text: 'text-white', hover: 'hover:bg-indigo-800' },
        { bg: 'bg-emerald-700', text: 'text-white', hover: 'hover:bg-emerald-800' },
        { bg: 'bg-purple-800', text: 'text-white', hover: 'hover:bg-purple-900' }
    ];

    // Thuật toán băm ID bảng để chọn màu ngẫu nhiên cố định cho từng bảng
    function getThemeIndex(config) {
        if (!config || !config.id) return 0;
        const str = String(config.id);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % THEMES.length;
    }

    $: currentTheme = THEMES[getThemeIndex(tableConfig)];
    $: topCount = sortedRows.length <= 15 ? 3 : 5;

    // --- BIỂU TƯỢNG HẠNG THÔNG MINH ---
    function getRankIcon(rank) {
        if (rank === 0) return '🏆';
        if (rank === 1) return '🥈';
        if (rank === 2) return '🥉';
        if (rank < topCount) return '⭐';
        return `#${rank + 1}`;
    }

    async function calculateData() {
        if (!tableConfig) return;
        isCalculating = true;
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const data = get(ycxData) || [];
            const employees = get(danhSachNhanVien) || [];
            const heSoMap = dataProcessing.getHeSoQuyDoi() || {};
            const warehouse = get(selectedWarehouse) || 'ALL';
            let startD, endD;
            if (tableConfig.dateMode === 'custom' && tableConfig.customStartDate && tableConfig.customEndDate) {
                startD = new Date(tableConfig.customStartDate);
                startD.setHours(0, 0, 0, 0);
                endD = new Date(tableConfig.customEndDate); endD.setHours(23, 59, 59, 999);
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                endD = new Date(today); endD.setDate(endD.getDate() - 1);
                startD = new Date(endD);
                startD.setDate(startD.getDate() - (tableConfig.rollingDays || 5) + 1);
            }

            const dynamicSettings = {
                startDate: startD.getTime(), endDate: endD.getTime(), warehouse: warehouse,
                viewMode: tableConfig.viewMode, metricId: tableConfig.metricId, rawType: tableConfig.rawType,
                filters: tableConfig.filters || { nganhHang: [], nhomHang: [], nhaSanXuat: [], tenSanPham: [] }
            };
            matrixResult = reportService.buildPivotMatrix(data, employees, dynamicSettings, allMetricsConfig, heSoMap);

            targetConfig = 0;
            if (tableConfig.targetConfig !== undefined && tableConfig.targetConfig > 0) {
                targetConfig = parseFloat(tableConfig.targetConfig) / 100;
            } else if (tableConfig.viewMode === 'METRIC') {
                const goals = (get(luykeGoalSettings) && warehouse) ? (get(luykeGoalSettings)[warehouse] || {}) : {};
                if (goals[tableConfig.metricId] !== undefined) {
                    targetConfig = parseFloat(goals[tableConfig.metricId]) / 100;
                } else {
                    const metricCfg = allMetricsConfig.find(m => m.id === tableConfig.metricId);
                    if (metricCfg && metricCfg.target) targetConfig = parseFloat(metricCfg.target) / 100;
                }
            }
        } catch (error) {
            console.error("Lỗi render ma trận Xu hướng:", error);
        } finally {
            isCalculating = false;
        }
    }

    $: if (tableConfig) calculateData();

    $: rows = matrixResult ? [...matrixResult.rows] : [];
    $: sortedRows = [...rows].sort((a, b) => {
        let valA, valB;
        if (sortKey === 'hoTen') {
            valA = a.hoTen; valB = b.hoTen;
            return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortKey === 'summary' || sortKey === 'average') {
            valA = a.summaryValue; valB = b.summaryValue;
        } else {
            valA = a.cells[sortKey]?.value || 0; valB = b.cells[sortKey]?.value || 0;
        }
        return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

    function handleSort(key) {
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
    }

    function formatAverage(value, config, colCount) {
        if (value === undefined || value === null || isNaN(value)) return '0';
        const isPercentage = config.viewMode === 'METRIC' && !['DTTL', 'SL'].includes(config.metricId);
        const isUnitPrice = config.viewMode === 'RAW' && config.rawType === 'unitPrice';
        const isQuantity = (config.viewMode === 'RAW' && config.rawType === 'quantity') || config.metricId === 'SL';
        const actualAvg = (isPercentage || isUnitPrice) ? value : (value / (colCount || 1));

        if (isPercentage) return (actualAvg * 100).toFixed(1) + '%';
        if (isQuantity) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(actualAvg);
        
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(actualAvg / 1000000);
    }

    function formatGrandAverage(matrix, config) {
        if (!matrix || !matrix.rows || matrix.rows.length === 0) return '-';
        const colCount = matrix.columns.length || 1;
        const isPercentage = config.viewMode === 'METRIC' && !['DTTL', 'SL'].includes(config.metricId);
        const isUnitPrice = config.viewMode === 'RAW' && config.rawType === 'unitPrice';
        const isQuantity = (config.viewMode === 'RAW' && config.rawType === 'quantity') || config.metricId === 'SL';

        if (isPercentage || isUnitPrice) return matrix.grandSummaryDisplay;

        const grandTotalRaw = matrix.rows.reduce((acc, row) => acc + (row.summaryValue || 0), 0);
        const actualAvg = grandTotalRaw / colCount;

        if (isQuantity) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(actualAvg);
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(actualAvg / 1000);
    }
</script>

{#if isCalculating}
    <div class="p-16 mt-0 flex flex-col items-center justify-center bg-gray-50/50">
        <div class="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p class="text-sm font-semibold text-blue-600 animate-pulse">Hệ thống đang trích xuất dữ liệu đa chiều...</p>
    </div>
{:else if !matrixResult}
    <div class="p-12 mt-0 mx-6 text-center bg-gray-50 border border-gray-200 border-dashed rounded-xl">
        <p class="text-gray-500 font-medium">Không thể tạo ma trận dữ liệu.</p>
    </div>
{:else}
    <div class="overflow-x-auto p-4 custom-scrollbar">
        <table class="min-w-full text-sm text-left border-collapse table-auto bg-white border border-gray-200 shadow-sm">
            <thead class="uppercase text-[11px] font-bold sticky top-0 z-10 shadow-sm align-middle">
                <tr>
                    <th class="px-1 py-3 transition select-none text-center border-r border-gray-200 overflow-hidden {currentTheme.bg} {currentTheme.text}" style="width: 55px; min-width: 55px; max-width: 55px;">Hạng</th>
                    
                    <th class="px-3 py-3 transition select-none text-left cursor-pointer border-r border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis {currentTheme.bg} {currentTheme.text} {currentTheme.hover}" style="width: 160px; min-width: 160px; max-width: 160px;"
                        on:click={() => handleSort('hoTen')}>
                        <div class="flex items-center justify-start gap-1.5 w-full">
                            <span class="truncate">Nhân viên</span>
                            {#if sortKey === 'hoTen'}<span class="text-white font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                        </div>
                    </th>
                    
                    {#if tableConfig.showTotalColumn !== false}
                        <th class="px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 bg-orange-100/80 text-orange-900 border-r border-gray-200 overflow-hidden" style="width: 90px; min-width: 90px; max-width: 90px;"
                            on:click={() => handleSort('summary')}>
                            <div class="flex flex-row items-center justify-center w-full h-full gap-1">
                                <span class="whitespace-normal break-words leading-tight w-full truncate">TỔNG</span>
                                {#if sortKey === 'summary'}<span class="text-orange-600 font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                            </div>
                        </th>
                    {/if}

                    {#if tableConfig.showAverageColumn !== false}
                        <th class="px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 bg-indigo-100/80 text-indigo-900 border-r border-gray-200 overflow-hidden" style="width: 90px; min-width: 90px; max-width: 90px;"
                            on:click={() => handleSort('average')}>
                            <div class="flex flex-row items-center justify-center w-full h-full gap-1">
                                <span class="whitespace-normal break-words leading-tight w-full truncate">TRUNG BÌNH</span>
                                {#if sortKey === 'average'}<span class="text-indigo-600 font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                            </div>
                        </th>
                    {/if}

                    {#each matrixResult.columns as col}
                        <th class="px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 bg-sky-100/80 text-sky-900 border-r border-gray-200 overflow-hidden" style="width: 90px; min-width: 90px; max-width: 90px;"
                            on:click={() => handleSort(col.dateStr)}>
                            <div class="flex flex-row items-center justify-center w-full h-full gap-1">
                                <span class="whitespace-normal break-words leading-tight w-full truncate">{col.display}</span>
                                {#if sortKey === col.dateStr}<span class="text-sky-600 font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                            </div>
                        </th>
                    {/each}
                </tr>
            </thead>
            
            <tbody class="divide-y divide-gray-200">
                {#each sortedRows as row, i}
                    <tr class="group hover:bg-gray-50/50">
                        <td class="px-1 py-3 text-center border-r border-gray-200 font-bold bg-white group-hover:bg-gray-50 overflow-hidden whitespace-nowrap {i <= 2 ? 'text-base' : 'text-xs text-slate-400'}" style="width: 55px; min-width: 55px; max-width: 55px;">
                            {getRankIcon(i)}
                        </td>
                        <td class="px-3 py-3 font-semibold text-blue-700 border-r border-gray-200 bg-white group-hover:bg-gray-50 group-hover:text-blue-800 overflow-hidden whitespace-nowrap text-ellipsis" style="width: 160px; min-width: 160px; max-width: 160px;">
                            {row.displayName}
                        </td>
                        
                        {#if tableConfig.showTotalColumn !== false}
                            <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis border-r border-gray-200 bg-orange-50/30 text-orange-800 font-bold" style="width: 90px; min-width: 90px; max-width: 90px;">
                                {row.summaryDisplay !== '-' ? row.summaryDisplay : '0'}
                            </td>
                        {/if}

                        {#if tableConfig.showAverageColumn !== false}
                            <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis border-r border-gray-200 bg-indigo-50/30 text-indigo-800 font-bold" style="width: 90px; min-width: 90px; max-width: 90px;">
                                {row.summaryDisplay !== '-' ? formatAverage(row.summaryValue, tableConfig, matrixResult.columns.length) : '0'}
                            </td>
                        {/if}

                        {#each matrixResult.columns as col}
                            {@const cell = row.cells[col.dateStr]}
                            {@const colorClass = targetConfig > 0 && cell.value < targetConfig ? getCompletionColor(cell.value * 100, targetConfig * 100) : ''}
                            
                            <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis border-r border-gray-200 {colorClass ? colorClass : 'text-gray-600'}" style="width: 90px; min-width: 90px; max-width: 90px;">
                                {cell.display}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>

            <tfoot class="font-bold border-t-[3px] border-gray-400 text-sm uppercase">
                <tr class="bg-gray-50 border-b border-gray-300 text-gray-600 text-xs">
                    <td class="px-3 py-3 text-center tracking-wider border-r border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" colspan="2" style="width: 215px; min-width: 215px; max-width: 215px;">
                        {tableConfig.showTotalColumn !== false && tableConfig.showAverageColumn !== false ? 'TRUNG BÌNH & TỔNG' : (tableConfig.showTotalColumn !== false ? 'TỔNG CỘNG' : 'TRUNG BÌNH')}
                    </td>
                    
                    {#if tableConfig.showTotalColumn !== false}
                        <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis bg-orange-100/80 text-orange-900 border-r border-gray-300" style="width: 90px; min-width: 90px; max-width: 90px;">
                            {matrixResult.grandSummaryDisplay !== '-' ? matrixResult.grandSummaryDisplay : '-'}
                        </td>
                    {/if}

                    {#if tableConfig.showAverageColumn !== false}
                        <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis bg-indigo-100/80 text-indigo-900 border-r border-gray-300" style="width: 90px; min-width: 90px; max-width: 90px;">
                            {formatGrandAverage(matrixResult, tableConfig)}
                        </td>
                    {/if}

                    {#each matrixResult.columns as col}
                        <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis bg-sky-100/80 text-sky-900 border-r border-gray-300" style="width: 90px; min-width: 90px; max-width: 90px;">
                            {matrixResult.colTotals[col.dateStr]?.display || '-'}
                        </td>
                    {/each}
                </tr>
            </tfoot>
        </table>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>