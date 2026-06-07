<script>
    import { formatters } from '../../../../utils/formatters.js';
    import { revenueTableUtils } from '../../../../utils/revenue-table.utils.js';

    export let totals;
    export let visibleColumns = [];
    export let totalPctQD;
    export let totalPctTC;
    export let avgSupermarketDtTrenGc;
    export let averages;
    
    export let shopTargetQD = 0;
    export let totalTyLeDuKien = 0;
</script>

<tfoot class="font-bold border-t-[3px] border-gray-400 text-sm uppercase">
    <tr class="bg-gray-50 border-b border-gray-300 text-gray-600 text-xs">
        <td class="px-3 py-3 text-center tracking-wider border-r border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" colspan="2" style="width: 205px; min-width: 205px; max-width: 205px;">TRUNG BÌNH</td>
        {#each visibleColumns as col}
            <td class="px-2 py-3 text-right overflow-hidden whitespace-nowrap text-ellipsis {revenueTableUtils.getGroupHeaderClass(col).replace('border-gray-200', 'border-gray-300')} bg-opacity-30" style="width: 90px; min-width: 90px; max-width: 90px;">
                {#if col.key === 'targetCaNhan'}
                    <span class="text-gray-700 font-bold">{formatters.formatRevenue(Math.round(averages.targetCaNhan))}</span>
                {:else if col.key === 'tyLeDuKien'}
                    <span class="text-gray-800 font-bold">{Math.round(averages.tyLeDuKien * 100)}%</span>
                {:else if col.key === 'doanhThu'}
                    {formatters.formatRevenue(averages.doanhThu)}
                {:else if col.key === 'doanhThuQuyDoi'}
                    <span class="text-sky-700">{formatters.formatRevenue(averages.doanhThuQuyDoi)}</span>
                {:else if col.key === 'hieuQuaQuyDoi'}
                    <span class="text-sky-700">{formatters.formatPercentage(averages.hieuQuaQuyDoi)}</span>
                {:else if col.key === 'dtqdCK'}
                    <span class="text-indigo-800">{formatters.formatRevenue(averages.dtqdCK)}</span>
                {:else if col.key === 'duKienSoCK'}
                    <span class="{averages.duKienSoCK >= 0 ? 'text-blue-600' : 'text-red-500'}">
                        {averages.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(averages.duKienSoCK)}
                    </span>
                {:else if col.key === 'doanhThuTraGop'}
                    {formatters.formatRevenue(averages.doanhThuTraGop)}
                {:else if col.key === 'tyLeTraCham'}
                    {formatters.formatPercentage(averages.tyLeTraCham)}
                {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                    <span class="text-gray-600">{formatters.formatRevenue(averages.doanhThuQuyDoiChuaXuat)}</span>
                {:else if col.key === 'dtTrenGc'}
                    <span class="text-emerald-700">{averages.dtTrenGc > 0 ? Math.round(averages.dtTrenGc).toLocaleString('vi-VN') : '-'}</span>
                {/if}
            </td>
        {/each}
    </tr>

    <tr class="text-gray-900">
        <td class="px-3 py-4 text-center tracking-wider bg-gray-100 border-r border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" colspan="2" style="width: 205px; min-width: 205px; max-width: 205px;">TỔNG CỘNG</td>
        {#each visibleColumns as col}
            <td class="px-2 py-4 text-right overflow-hidden whitespace-nowrap text-ellipsis {revenueTableUtils.getGroupHeaderClass(col).replace('border-gray-200', 'border-gray-300')} bg-opacity-50" style="width: 90px; min-width: 90px; max-width: 90px;">
                {#if col.key === 'targetCaNhan'}
                    <span class="text-gray-900 font-bold">{formatters.formatRevenue(Math.round(shopTargetQD))}</span>
                {:else if col.key === 'tyLeDuKien'}
                    <span class="text-gray-900 font-black">{Math.round(totalTyLeDuKien * 100)}%</span>
                {:else if col.key === 'doanhThu'}
                    {formatters.formatRevenue(totals.doanhThu)}
                {:else if col.key === 'doanhThuQuyDoi'}
                    <span class="text-sky-800">{formatters.formatRevenue(totals.doanhThuQuyDoi)}</span>
                {:else if col.key === 'hieuQuaQuyDoi'}
                    <span class="text-sky-800">{formatters.formatPercentage(totalPctQD)}</span>
                {:else if col.key === 'dtqdCK'}
                    <span class="text-indigo-900">{formatters.formatRevenue(totals.dtqdCK)}</span>
                {:else if col.key === 'duKienSoCK'}
                    <span class="{totals.duKienSoCK >= 0 ? 'text-blue-700' : 'text-red-600'}">
                        {totals.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(totals.duKienSoCK)}
                    </span>
                {:else if col.key === 'doanhThuTraGop'}
                    {formatters.formatRevenue(totals.doanhThuTraGop)}
                {:else if col.key === 'tyLeTraCham'}
                    {formatters.formatPercentage(totalPctTC)}
                {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                    <span class="text-gray-700">{formatters.formatRevenue(totals.doanhThuQuyDoiChuaXuat)}</span>
                {:else if col.key === 'dtTrenGc'}
                    <span class="text-emerald-800">{totals.gioCong > 0 ? Math.round(avgSupermarketDtTrenGc).toLocaleString('vi-VN') : '-'}</span>
                {/if}
            </td>
        {/each}
    </tr>
</tfoot>