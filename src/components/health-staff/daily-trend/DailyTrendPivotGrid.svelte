<script>
    import { get } from 'svelte/store';
    import { ycxData, danhSachNhanVien, luykeGoalSettings, selectedWarehouse } from '../../../stores.js';
    import { reportService } from '../../../services/reportService.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    import { getCompletionColor } from '../../../utils/kpi.utils.js';

    export let tableConfig = null;
    export let allMetricsConfig = [];
    export let showSummaryColumn = true;

    let matrixResult = null;
    let targetConfig = 0;
    
    // Khóa trạng thái để UI hiển thị Skeleton, ngăn chặn nghẽn Main Thread
    let isCalculating = true; 

    let sortKey = 'hoTen';
    let sortDirection = 'asc';

    // [CORE FIX]: Hàm tính toán độc lập, chạy bất đồng bộ
    async function calculateData() {
        if (!tableConfig) return;
        isCalculating = true;

        // Kỹ thuật Thread Yielding: Nhả luồng chính ra 50ms để trình duyệt kịp vẽ Giao diện Loading
        // và duy trì kết nối Firebase WebSocket trước khi nhảy vào vòng lặp khổng lồ O(N)
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
                startDate: startD.getTime(), endDate: endD.getTime(),
                warehouse: warehouse,
                viewMode: tableConfig.viewMode, metricId: tableConfig.metricId, rawType: tableConfig.rawType,
                filters: tableConfig.filters || { nganhHang: [], nhomHang: [], nhaSanXuat: [], tenSanPham: [] }
            };

            // Thực thi thuật toán 50.000 dòng ở luồng ngầm (Background Task)
            matrixResult = reportService.buildPivotMatrix(data, employees, dynamicSettings, allMetricsConfig, heSoMap);

            // Bóc tách Config Target
            targetConfig = 0;
            if (tableConfig.viewMode === 'METRIC') {
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
            // Render xong -> Mở khóa giao diện
            isCalculating = false;
        }
    }

    // Trigger hàm khi Nhận được Config từ Component Cha
    $: if (tableConfig) {
        calculateData();
    }

    $: rows = matrixResult ? [...matrixResult.rows] : [];
    
    $: sortedRows = [...rows].sort((a, b) => {
        let valA, valB;
        if (sortKey === 'hoTen') {
            valA = a.hoTen; valB = b.hoTen;
            return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortKey === 'summary') {
            valA = a.summaryValue; valB = b.summaryValue;
        } else {
            valA = a.cells[sortKey]?.value || 0;
            valB = b.cells[sortKey]?.value || 0;
        }
        return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

    function handleSort(key) {
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
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
                    <th class="px-1 py-3 transition select-none bg-gray-100 text-gray-700 text-center border-r border-gray-200 overflow-hidden" style="width: 45px; min-width: 45px; max-width: 45px;">STT</th>
                    
                    <th class="px-3 py-3 transition select-none bg-gray-100 text-gray-700 text-left cursor-pointer hover:bg-gray-200 border-r border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis" style="width: 160px; min-width: 160px; max-width: 160px;"
                        on:click={() => handleSort('hoTen')}>
                        <div class="flex items-center justify-start gap-1.5 w-full">
                            <span class="truncate">Nhân viên</span>
                            {#if sortKey === 'hoTen'}<span class="text-blue-600 font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                        </div>
                    </th>
                    
                    {#if showSummaryColumn}
                        {#if matrixResult.rows[0]?.summaryDisplay !== '-'}
                            <th class="px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 bg-orange-100/80 text-orange-900 border-r border-gray-200 overflow-hidden" style="width: 90px; min-width: 90px; max-width: 90px;"
                                on:click={() => handleSort('summary')}>
                                <div class="flex flex-row items-center justify-center w-full h-full gap-1">
                                    <span class="whitespace-normal break-words leading-tight w-full truncate">TỔNG HỢP</span>
                                    {#if sortKey === 'summary'}<span class="text-orange-600 font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                                </div>
                            </th>
                        {/if}
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
                    <tr class="group cursor-pointer hover:bg-gray-50/50">
                        <td class="px-1 py-3 text-center border-r border-gray-200 font-bold bg-white group-hover:bg-gray-50 overflow-hidden whitespace-nowrap text-sm text-slate-400" style="width: 45px; min-width: 45px; max-width: 45px;">
                            {i + 1}
                        </td>
                        <td class="px-3 py-3 font-semibold text-blue-700 border-r border-gray-200 bg-white group-hover:bg-gray-50 group-hover:text-blue-800 overflow-hidden whitespace-nowrap text-ellipsis" style="width: 160px; min-width: 160px; max-width: 160px;">
                            {row.displayName}
                        </td>
                        
                        {#if showSummaryColumn}
                            {#if row.summaryDisplay !== '-'}
                                <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis border-r border-gray-200 bg-orange-50/30 text-orange-800 font-bold" style="width: 90px; min-width: 90px; max-width: 90px;">
                                    {row.summaryDisplay}
                                </td>
                            {/if}
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
                    <td class="px-3 py-3 text-center tracking-wider border-r border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" colspan="2" style="width: 205px; min-width: 205px; max-width: 205px;">
                        TRUNG BÌNH & TỔNG
                    </td>
                    
                    {#if showSummaryColumn}
                        {#if matrixResult.grandSummaryDisplay !== '-'}
                            <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis bg-orange-100/80 text-orange-900 border-r border-gray-300" style="width: 90px; min-width: 90px; max-width: 90px;">
                                {matrixResult.grandSummaryDisplay}
                            </td>
                        {/if}
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