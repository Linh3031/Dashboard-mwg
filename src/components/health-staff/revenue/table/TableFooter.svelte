<script>
    import { formatters } from '../../../../utils/formatters.js';
    import { revenueTableUtils } from '../../../../utils/revenue-table.utils.js';

    export let totals;
    export let visibleColumns = [];
    export let totalPctQD;
    export let totalPctTC;
    export let avgSupermarketDtTrenGc;
</script>

<tfoot class="font-bold text-gray-900 border-t-[3px] border-gray-400 text-sm uppercase">
    <tr>
        <td class="px-3 py-4 text-center tracking-wider bg-gray-100 border-r border-gray-300" colspan="2">TỔNG CỘNG</td>
        {#each visibleColumns as col}
            <td class="px-2 py-4 text-right {revenueTableUtils.getGroupHeaderClass(col).replace('border-gray-200', 'border-gray-300')} bg-opacity-50">
                {#if col.key === 'doanhThu'}
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