<script>
    import { createEventDispatcher } from 'svelte';
    import { formatters } from '../../../../utils/formatters.js';
    import { revenueTableUtils } from '../../../../utils/revenue-table.utils.js';

    export let item;
    export let index;
    export let visibleColumns = [];
    export let topCount;
    export let avgSupermarketDtTrenGc;
    export let kpiTargets;
    export let kpiGlobalSettings;

    const dispatch = createEventDispatcher();

    $: userTarget = kpiTargets[item.maNV];
</script>

<tr class="group cursor-pointer hover:bg-gray-50/50" on:click={() => dispatch('viewDetail', item.maNV)}>
    <td class="w-[45px] min-w-[45px] max-w-[45px] px-1 py-3 text-center border-r border-gray-200 font-bold bg-white group-hover:bg-gray-50 {index <= 2 ? 'text-xl' : 'text-sm text-slate-400'}">
        {revenueTableUtils.getRankIcon(index, topCount)}
    </td>
    <td class="w-[160px] min-w-[160px] px-3 py-3 font-semibold text-blue-700 whitespace-nowrap border-r border-gray-200 bg-white group-hover:bg-gray-50 group-hover:text-blue-800 truncate">
        {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
    </td>
    
    {#each visibleColumns as col}
        <td class="w-[90px] min-w-[90px] max-w-[90px] px-2 py-3 text-right text-sm {revenueTableUtils.getGroupBodyClass(col)}">
            {#if col.key === 'doanhThu'}
                <span class={revenueTableUtils.getCellTextClass(item, 'doanhThu', userTarget, kpiGlobalSettings)}>{formatters.formatRevenue(item.doanhThu)}</span>
            {:else if col.key === 'doanhThuQuyDoi'}
                <span class={revenueTableUtils.getCellTextClass(item, 'doanhThuQuyDoi', userTarget, kpiGlobalSettings)}>{formatters.formatRevenue(item.doanhThuQuyDoi)}</span>
            {:else if col.key === 'hieuQuaQuyDoi'}
                <span class={revenueTableUtils.getCellTextClass(item, 'hieuQuaQuyDoi', userTarget, kpiGlobalSettings)}>{formatters.formatPercentage(item.hieuQuaQuyDoi)}</span>
            {:else if col.key === 'dtqdCK'}
                <span class="font-bold text-indigo-700">{formatters.formatRevenue(item.dtqdCK)}</span>
            {:else if col.key === 'duKienSoCK'}
                <span class="font-bold {item.duKienSoCK >= 0 ? 'text-blue-600' : 'text-red-500'}">
                    {item.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(item.duKienSoCK)}
                </span>
            {:else if col.key === 'doanhThuTraGop'}
                <span class={revenueTableUtils.getCellTextClass(item, 'doanhThuTraGop', userTarget, kpiGlobalSettings)}>{formatters.formatRevenue(item.doanhThuTraGop)}</span>
            {:else if col.key === 'tyLeTraCham'}
                <span class={revenueTableUtils.getCellTextClass(item, 'tyLeTraCham', userTarget, kpiGlobalSettings)}>{formatters.formatPercentage(item.tyLeTraCham)}</span>
            {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                <span class={revenueTableUtils.getCellTextClass(item, 'doanhThuQuyDoiChuaXuat', userTarget, kpiGlobalSettings)}>{formatters.formatRevenue(item.doanhThuQuyDoiChuaXuat)}</span>
            {:else if col.key === 'dtTrenGc'}
                {@const roundedVal = Math.round(item.dtTrenGc)}
                <span class="font-bold {item.dtTrenGc < avgSupermarketDtTrenGc ? 'text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100' : 'text-emerald-700'}">
                    {item.dtTrenGc > 0 ? roundedVal.toLocaleString('vi-VN') : '-'}
                </span>
            {/if}
        </td>
    {/each}
</tr>