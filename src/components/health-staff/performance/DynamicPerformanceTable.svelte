<script>
    import { createEventDispatcher } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    import { dynamicTableProcessor } from '../../../services/processing/logic/dynamicTable.processor.js';
    import { isAdmin } from '../../../stores.js';
    
    // Components
    import SortableTh from '../../common/SortableTh.svelte';

    export let config = {};      // Cấu hình bảng (từ Admin/User)
    export let reportData = [];  // Dữ liệu nhân viên (Master Data)
    export let colorTheme = 'blue';

    const dispatch = createEventDispatcher();

    // --- STATE ---
    let sortKey = 'hoTen';
    let sortDirection = 'asc';

    // --- PROCESSING ---
    // 1. Biến đổi dữ liệu thô -> Dữ liệu hiển thị (kèm logic tính %)
    $: processedResult = dynamicTableProcessor.processTableData(reportData, config);
    $: tableData = processedResult.processedData;
    $: totals = processedResult.totals;

    // 2. Sắp xếp
    $: sortedData = dynamicTableProcessor.sortTableData(tableData, sortKey, sortDirection);

    // --- HANDLERS ---
    function handleSort(event) {
        const key = event.detail;
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
    }

    // --- STYLING HELPERS ---
    const themeMap = {
        blue: { header: 'bg-blue-50 border-blue-200', title: 'text-blue-800' },
        green: { header: 'bg-green-50 border-green-200', title: 'text-green-800' },
        orange: { header: 'bg-orange-50 border-orange-200', title: 'text-orange-800' },
        purple: { header: 'bg-purple-50 border-purple-200', title: 'text-purple-800' },
        teal: { header: 'bg-teal-50 border-teal-200', title: 'text-teal-800' },
    };
    $: theme = themeMap[colorTheme] || themeMap.blue;

    // Hàm lấy màu sắc cho giá trị (So sánh với Target nếu là %)
    function getValueColor(cell, targetObj) {
        if (cell.config.type === 'PERCENT') {
            // Lấy target từ config bảng hoặc goal settings (nếu có logic override)
            // Ở đây ta dùng targetId để map vào object mucTieu của nhân viên
            const targetId = cell.config.targetId;
            const targetVal = targetId && targetObj && targetObj[targetId] 
                ? parseFloat(targetObj[targetId]) 
                : 0;

            const currentVal = cell.value * 100; // Đưa về thang 100
            
            if (targetVal > 0) {
                return currentVal >= targetVal ? 'text-blue-600 font-bold' : 'text-red-600 font-bold bg-red-50';
            }
            return 'text-red-600'; // Mặc định % là màu đỏ (hoặc cam)
        }
        if (cell.config.type === 'SL') return 'text-gray-800';
        return 'text-blue-700 font-semibold'; // DT, DTQD
    }
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col transition-all hover:shadow-md relative group/card">
    
    <div class="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1 z-20 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-gray-100">
        {#if !config.isSystem || $isAdmin}
            <button class="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Sửa" on:click|stopPropagation={() => dispatch('edit', config)}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Xóa" on:click|stopPropagation={() => dispatch('delete', config.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        {/if}
    </div>

    <div class="px-5 py-3 border-b {theme.header} flex justify-between items-center">
        <h4 class="text-base font-bold uppercase {theme.title} truncate flex items-center gap-2" title={config.title}>
            <i data-feather="bar-chart-2" class="w-4 h-4"></i> {config.title}
        </h4>
    </div>

    {#if sortedData.length === 0}
        <div class="flex-grow flex items-center justify-center p-8 bg-slate-50/30">
             <p class="text-gray-400 italic text-sm">Chưa có phát sinh dữ liệu.</p>
        </div>
    {:else}
        <div class="overflow-x-auto flex-grow custom-scrollbar relative">
            <table class="min-w-full text-sm border-collapse border-0">
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
                    <tr>
                        <SortableTh 
                            key="hoTen" 
                            label="Nhân viên" 
                            className="sticky left-0 z-30 bg-gray-100 border-r border-b border-gray-300 min-w-[150px]" 
                            {sortKey} {sortDirection} 
                            on:sort={handleSort} 
                        />
                        
                        {#each config.columns as col (col.id)}
                            {@const bgClass = col.color ? `bg-${col.color}-50` : 'bg-gray-50'}
                            {@const textClass = col.color ? `text-${col.color}-800` : 'text-gray-700'}
                            <SortableTh 
                                key={col.id} 
                                label={col.header} 
                                align="right" 
                                className="{bgClass} {textClass} border-r border-b border-gray-200 min-w-[100px]" 
                                {sortKey} {sortDirection} 
                                on:sort={handleSort} 
                            />
                        {/each}
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100">
                    {#each sortedData as row (row.maNV)}
                        <tr class="hover:bg-blue-50/50 transition-colors group">
                            <td class="px-3 py-2 font-semibold text-gray-700 border-r border-b border-gray-300 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <div class="flex flex-col">
                                    <span class="text-blue-700 text-sm">{formatters.getShortEmployeeName(row.hoTen, row.maNV).split(' - ')[0]}</span>
                                    <span class="text-[10px] text-gray-400 font-mono">{row.maNV}</span>
                                </div>
                            </td>

                            {#each config.columns as col (col.id)}
                                {@const cell = row.cells[col.id]}
                                <td class="px-2 py-2 text-right border-r border-gray-200 border-b {getValueColor(cell, row.mucTieu)}">
                                    {cell ? cell.display : '-'}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>

                <tfoot class="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300 sticky bottom-0 z-20">
                    <tr>
                        <td class="px-3 py-2 sticky left-0 bg-gray-200 z-30 border-r border-gray-300">TỔNG</td>
                        {#each config.columns as col (col.id)}
                            <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-100">
                                {totals.cells[col.id]?.display || '-'}
                            </td>
                        {/each}
                    </tr>
                </tfoot>
            </table>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style>