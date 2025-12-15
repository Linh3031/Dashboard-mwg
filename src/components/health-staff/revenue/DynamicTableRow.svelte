<script>
    import { formatters } from '../../../utils/formatters.js';

    export let item = {}; // Dữ liệu 1 dòng (đã processed)
    export let config = {};
    export let tableMetrics = {}; // { sl, dt, dtqd }

    // Tính toán trước để tránh logic trong template
    $: columns = config.subColumns || [];
</script>

<tr class="hover:bg-blue-50/50 transition-colors group">
    <td class="px-5 py-2 font-semibold text-gray-700 border-r border-b border-gray-300 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
        <span class="text-blue-700">{formatters.getShortEmployeeName(item.hoTen, item.maNV)}</span>
    </td>
    
    {#if tableMetrics.sl}
        <td class="px-2 py-2 text-right font-bold text-gray-800 bg-gray-50/50 border-r border-gray-300 border-b">{formatters.formatNumber(item.cells?.mainValue?.value_sl || item.mainValue_sl)}</td>
    {/if}
    {#if tableMetrics.dt}
        <td class="px-2 py-2 text-right font-bold text-blue-800 bg-gray-50/50 border-r border-gray-300 border-b">{formatters.formatRevenue(item.cells?.mainValue?.value || item.mainValue)}</td>
    {/if}
    {#if tableMetrics.dtqd}
        <td class="px-2 py-2 text-right font-bold text-purple-800 bg-gray-50/50 border-r border-gray-300 border-b">{formatters.formatRevenue(item.cells?.mainValue?.value_dtqd || item.mainValue_dtqd)}</td>
    {/if}

    {#each columns as col}
        {@const cell = item.cells ? item.cells[col.id || col.header] : null}
        {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
        
        {#if metrics.sl}
            <td class="px-2 py-2 text-right border-r border-gray-200 border-b text-gray-600" title={cell?.tooltip}>
                {formatters.formatNumber(cell?.value_sl || cell?.sl)}
            </td>
        {/if}
        {#if metrics.dt}
            <td class="px-2 py-2 text-right border-r border-gray-200 border-b font-medium text-gray-800" title={cell?.tooltip}>
                {formatters.formatRevenue(cell?.value || cell?.dt)}
            </td>
        {/if}
        {#if metrics.dtqd}
            <td class="px-2 py-2 text-right border-r border-gray-200 border-b font-medium text-purple-600" title={cell?.tooltip}>
                {formatters.formatRevenue(cell?.value_dtqd || cell?.dtqd)}
            </td>
        {/if}
    {/each}
</tr>