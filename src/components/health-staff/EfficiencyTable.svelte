<script>
    import { createEventDispatcher } from 'svelte';
    import { fly } from 'svelte/transition';
    import { formatters } from '../../utils/formatters.js';
    import { efficiencyConfig } from '../../stores.js';
    
    export let data = [];
    export let isLoading = false;
    
    const dispatch = createEventDispatcher();
    
    // --- STATE ---
    let sortKey = 'doanhThu';
    let sortDirection = 'desc';
    let currentPage = 1;
    let itemsPerPage = 10;
    
    // --- CONFIG COLUMNS ---
    // [FIX] Đã xóa { id: 'pctPhuKien', ... } khỏi danh sách cứng để tránh trùng lặp
    const FIXED_COLUMNS = [
        { id: 'dtICT', label: 'DT ICT', isRate: false, headerClass: 'bg-blue-100 text-blue-900', format: 'revenue' },
        { id: 'dtPhuKien', label: 'DT Phụ kiện', isRate: false, headerClass: 'bg-blue-100 text-blue-900', format: 'revenue' },
        
        { id: 'dtCE', label: 'DT CE', isRate: false, headerClass: 'bg-green-100 text-green-900', format: 'revenue' },
        { id: 'dtGiaDung', label: 'DT Gia dụng', isRate: false, headerClass: 'bg-green-100 text-green-900', format: 'revenue' },
        
        { id: 'pctMLN', label: '% MLN', isRate: true, targetKey: 'phanTramMLN', headerClass: 'bg-green-100 text-green-900', format: 'percent' },
        { id: 'pctSim', label: '% Sim', isRate: true, targetKey: 'phanTramSim', headerClass: 'bg-yellow-100 text-yellow-900', format: 'percent' },
        { id: 'pctVAS', label: '% VAS', isRate: true, targetKey: 'phanTramVAS', headerClass: 'bg-yellow-100 text-yellow-900', format: 'percent' },
        { id: 'pctBaoHiem', label: '% Bảo hiểm', isRate: true, targetKey: 'phanTramBaoHiem', headerClass: 'bg-yellow-100 text-yellow-900', format: 'percent' }
    ];

    // Kết hợp cột cứng và cột động từ cấu hình Admin ($efficiencyConfig)
    $: columns = [
        ...FIXED_COLUMNS,
        ...($efficiencyConfig || []).map(conf => ({
            id: conf.id,
            label: conf.name,
            isRate: conf.type === 'percent',
            targetKey: conf.targetKey, // Key chứa mục tiêu (nếu có) để so sánh màu sắc
            headerClass: 'bg-indigo-50 text-indigo-900',
            format: conf.type === 'percent' ? 'percent' : 'revenue',
            isDynamic: true
        }))
    ];

    // --- SORTING ---
    function handleSort(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDirection = 'desc';
        }
    }

    $: sortedData = [...data].sort((a, b) => {
        let valA = a[sortKey] || 0;
        let valB = b[sortKey] || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    // --- PAGINATION ---
    $: totalPages = Math.ceil(sortedData.length / itemsPerPage);
    $: paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    function goToPage(page) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }
    
    // --- HELPER: COLOR LOGIC ---
    function getCellColor(value, target, isRate) {
        if (!isRate || target === undefined || target === null) return 'text-gray-700';
        return value >= target ? 'text-green-600 font-bold' : 'text-red-500';
    }

    // --- HELPER: FORMAT ---
    function formatValue(value, type) {
        if (type === 'percent') return formatters.formatPercent(value);
        if (type === 'revenue') return formatters.formatRevenue(value);
        return value;
    }
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
    <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 class="font-bold text-gray-800 uppercase text-sm">Bảng Hiệu Quả Chi Tiết</h3>
        <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 bg-green-100 text-green-700 rounded">Đạt chỉ tiêu</span>
            <span class="px-2 py-1 bg-red-100 text-red-700 rounded">Chưa đạt</span>
        </div>
    </div>

    <div class="overflow-x-auto flex-1 custom-scrollbar relative">
        {#if isLoading}
            <div class="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        {/if}

        <table class="min-w-full text-xs text-left border-collapse">
            <thead class="bg-gray-100 text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
                <tr>
                    <th class="p-3 border-b border-r border-gray-200 min-w-[50px] text-center sticky left-0 bg-gray-100 z-30">#</th>
                    <th 
                        class="p-3 border-b border-r border-gray-200 min-w-[180px] cursor-pointer hover:bg-gray-200 sticky left-[50px] bg-gray-100 z-30 transition-colors"
                        on:click={() => handleSort('hoTen')}
                    >
                        <div class="flex items-center justify-between">
                            NHÂN VIÊN
                            {#if sortKey === 'hoTen'}
                                <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            {/if}
                        </div>
                    </th>
                    <th 
                        class="p-3 border-b border-r border-gray-200 min-w-[120px] cursor-pointer hover:bg-gray-200 text-right"
                        on:click={() => handleSort('doanhThu')}
                    >
                         <div class="flex items-center justify-end gap-1">
                            TỔNG DT
                            {#if sortKey === 'doanhThu'}
                                <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            {/if}
                        </div>
                    </th>
                    
                    {#each columns as col}
                        <th 
                            class="p-3 border-b border-r border-gray-200 min-w-[100px] cursor-pointer hover:brightness-95 transition-colors text-right whitespace-nowrap {col.headerClass}"
                            on:click={() => handleSort(col.id)}
                            title={col.label}
                        >
                            <div class="flex items-center justify-end gap-1">
                                {col.label}
                                {#if sortKey === col.id}
                                    <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                {/if}
                            </div>
                        </th>
                    {/each}
                </tr>
            </thead>
            
            <tbody class="divide-y divide-gray-100">
                {#each paginatedData as row, index (row.maNV)}
                    <tr class="hover:bg-blue-50 transition-colors group">
                        <td class="p-3 border-r border-gray-200 text-center text-gray-500 sticky left-0 bg-white group-hover:bg-blue-50 z-10">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td class="p-3 border-r border-gray-200 font-medium text-gray-800 sticky left-[50px] bg-white group-hover:bg-blue-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <div class="flex flex-col">
                                <span class="truncate max-w-[160px]" title={row.hoTen}>{row.hoTen}</span>
                                <span class="text-[10px] text-gray-400 font-mono">{row.maNV}</span>
                            </div>
                        </td>
                        <td class="p-3 border-r border-gray-200 text-right font-bold text-gray-800">
                            {formatters.formatRevenue(row.doanhThu)}
                        </td>

                        {#each columns as col}
                            {@const val = row[col.id]}
                            {@const target = col.isRate && col.targetKey ? row.targets?.[col.targetKey] : undefined}
                            <td class="p-3 border-r border-gray-200 text-right {getCellColor(val, target, col.isRate)}">
                                {formatValue(val, col.format)}
                            </td>
                        {/each}
                    </tr>
                {:else}
                    <tr>
                        <td colspan={columns.length + 3} class="p-8 text-center text-gray-400 italic">
                            Không có dữ liệu hiển thị.
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    {#if totalPages > 1}
    <div class="p-3 border-t border-gray-200 flex justify-between items-center bg-gray-50">
        <span class="text-xs text-gray-500">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedData.length)} / {sortedData.length}
        </span>
        <div class="flex gap-1">
            <button 
                class="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-medium"
                disabled={currentPage === 1}
                on:click={() => goToPage(currentPage - 1)}
            >
                Trước
            </button>
            {#each Array(totalPages) as _, i}
                {#if i + 1 === currentPage || i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
                    <button 
                        class="px-3 py-1 border rounded text-xs font-medium {currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}"
                        on:click={() => goToPage(i + 1)}
                    >
                        {i + 1}
                    </button>
                {:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
                    <span class="px-2 py-1 text-gray-400">...</span>
                {/if}
            {/each}
            <button 
                class="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-medium"
                disabled={currentPage === totalPages}
                on:click={() => goToPage(currentPage + 1)}
            >
                Sau
            </button>
        </div>
    </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>