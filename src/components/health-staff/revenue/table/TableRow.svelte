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
    export let averages;

    const dispatch = createEventDispatcher();
    $: userTarget = kpiTargets[item.maNV];
</script>

<tr class="group cursor-pointer hover:bg-gray-50/50" on:click={() => dispatch('viewDetail', item.maNV)}>
    <td class="px-1 py-3 text-center border-r border-gray-200 font-bold bg-white group-hover:bg-gray-50 overflow-hidden whitespace-nowrap {index <= 2 ? 'text-xl' : 'text-sm text-slate-400'}" style="width: 45px; min-width: 45px; max-width: 45px;">
        {revenueTableUtils.getRankIcon(index, topCount)}
    </td>
    <td class="px-3 py-3 font-semibold text-blue-700 border-r border-gray-200 bg-white group-hover:bg-gray-50 group-hover:text-blue-800 overflow-hidden whitespace-nowrap text-ellipsis" style="width: 160px; min-width: 160px; max-width: 160px;">
        {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
    </td>
    
    {#each visibleColumns as col}
        {@const isBelowAvg = averages && averages[col.key] !== undefined && item[col.key] < averages[col.key]}
        {@const redClass = isBelowAvg ? '!text-red-600 !font-bold' : ''}

        <td class="px-2 py-3 text-right text-sm overflow-hidden whitespace-nowrap text-ellipsis {revenueTableUtils.getGroupBodyClass(col)}" style="width: 90px; min-width: 90px; max-width: 90px;">
            {#if col.key === 'targetCaNhan'}
                <span class="font-bold text-gray-700">{formatters.formatRevenue(item.targetCaNhan)}</span>
            {:else if col.key === 'tyLeDuKien'}
                <!-- Làm tròn tuyệt đối không số lẻ & Đổi màu xanh nếu đạt >= 100% -->
                <span class="font-bold {redClass} {item.tyLeDuKien >= 1 && !isBelowAvg ? 'text-green-600' : ''}">{Math.round(item.tyLeDuKien * 100)}%</span>
            {:else if col.key === 'doanhThu'}
                <span class="{revenueTableUtils.getCellTextClass(item, 'doanhThu', userTarget, kpiGlobalSettings)} {redClass}">{formatters.formatRevenue(item.doanhThu)}</span>
            {:else if col.key === 'doanhThuQuyDoi'}
                <span class="{revenueTableUtils.getCellTextClass(item, 'doanhThuQuyDoi', userTarget, kpiGlobalSettings)} {redClass}">{formatters.formatRevenue(item.doanhThuQuyDoi)}</span>
            {:else if col.key === 'hieuQuaQuyDoi'}
                <span class="{revenueTableUtils.getCellTextClass(item, 'hieuQuaQuyDoi', userTarget, kpiGlobalSettings)} {redClass}">{formatters.formatPercentage(item.hieuQuaQuyDoi)}</span>
            {:else if col.key === 'dtqdCK'}
                <span class="font-bold {isBelowAvg ? 'text-red-600' : 'text-indigo-700'}">{formatters.formatRevenue(item.dtqdCK)}</span>
            {:else if col.key === 'duKienSoCK'}
                <span class="font-bold {isBelowAvg ? 'text-red-600' : (item.duKienSoCK >= 0 ? 'text-blue-600' : 'text-red-500')}">
                    {item.duKienSoCK > 0 && !isBelowAvg ? '+' : ''}{formatters.formatRevenue(item.duKienSoCK)}
                </span>
            {:else if col.key === 'doanhThuTraGop'}
                <span class="{revenueTableUtils.getCellTextClass(item, 'doanhThuTraGop', userTarget, kpiGlobalSettings)} {redClass}">{formatters.formatRevenue(item.doanhThuTraGop)}</span>
            {:else if col.key === 'tyLeTraCham'}
                <span class="{revenueTableUtils.getCellTextClass(item, 'tyLeTraCham', userTarget, kpiGlobalSettings)} {redClass}">{formatters.formatPercentage(item.tyLeTraCham)}</span>
            {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                <span class="{revenueTableUtils.getCellTextClass(item, 'doanhThuQuyDoiChuaXuat', userTarget, kpiGlobalSettings)} {redClass}">{formatters.formatRevenue(item.doanhThuQuyDoiChuaXuat)}</span>
            {:else if col.key === 'dtTrenGc'}
                {@const roundedVal = Math.round(item.dtTrenGc)}
                <span class="font-bold {isBelowAvg ? 'text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100' : 'text-emerald-700'}">
                    {item.dtTrenGc > 0 ? roundedVal.toLocaleString('vi-VN') : '-'}
                </span>
            {/if}
        </td>
    {/each}
</tr>