<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';

    export let sortedItems = [];
    export let showUnexported = false;
    export let numDays = 1;
    export let sortMode = 'revenue_desc';

    const dispatch = createEventDispatcher();

    function handleSort(mode) {
        dispatch('sort', mode);
    }
    
    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white border border-gray-200 border-t-0 rounded-b-xl luyke-list-capture-wrapper">
    <div class="overflow-x-auto max-h-[600px] custom-scrollbar luyke-list-scroll-area sknv-pasted-competition-scroller">
        <table class="w-full text-xs text-left border-collapse luyke-table-modern">
            <thead class="bg-gray-50 text-gray-600 uppercase font-bold border-b">
                <tr>
                    <th class="p-3 cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('name_asc')}>
                        Ngành hàng {#if sortMode.includes('name')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('quantity_desc')}>
                        SL {#if sortMode.includes('quantity')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('revenue_desc')}>
                        Doanh thu {#if sortMode.includes('revenue')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('dtqd_desc')}>
                        DTQĐ {#if sortMode.includes('dtqd')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    {#if !showUnexported}
                        <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('avg_qty_desc')}>
                            TB SL {#if sortMode.includes('avg_qty')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                        </th>
                        <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('avg_rev_desc')}>
                            TB DT {#if sortMode.includes('avg_rev')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                        </th>
                    {/if}
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('price_desc')}>
                        Đơn giá (Tr) {#if sortMode.includes('price')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each sortedItems as item (item.id)}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const unitPrice = quantity > 0 ? revenue / quantity : 0}
                    {@const dtqd = item.doanhThuQuyDoi || 0}
                    
                    <tr class="border-b hover:bg-blue-50 transition-colors {item.isMacro ? 'bg-indigo-50/50' : ''}">
                        <td class="p-3 font-medium flex items-center gap-2">
                            {#if item.isMacro}
                                <i data-feather="layers" class="w-3 h-3 text-indigo-600"></i>
                                <span class="text-indigo-700 font-bold">{item.name}</span>
                            {:else}
                                <span class="pl-5 text-gray-600">{item.name}</span>
                            {/if}
                        </td>
                        <td class="p-3 text-right font-bold text-gray-700">{formatters.formatNumber(quantity)}</td>
                        <td class="p-3 text-right font-bold text-blue-700">{formatters.formatRevenue(revenue, 0)}</td>
                        <td class="p-3 text-right text-orange-600 font-medium">
                            {dtqd > 0 ? formatters.formatRevenue(dtqd, 0) : '-'}
                        </td>
                        {#if !showUnexported}
                            <td class="p-3 text-right text-gray-500">{formatters.formatNumber(quantity/numDays, 1)}</td>
                            <td class="p-3 text-right text-gray-500">{formatters.formatRevenue(revenue/numDays, 0)}</td>
                        {/if}
                        <td class="p-3 text-right font-bold text-emerald-700 bg-emerald-50/30">
                            {formatters.formatNumber(unitPrice / 1000000, 1)}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<style>
    /* [BẢO TOÀN CAPTURE]: Thả lỏng chiều cao bảng khi chụp ảnh để lấy full dòng */
    :global(.capture-container .luyke-list-capture-wrapper) { border: none !important; border-radius: 0 !important; }
    :global(.capture-container .luyke-list-scroll-area) {
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
    }
    :global(.capture-container .luyke-table-modern th) { position: static !important; }
</style>