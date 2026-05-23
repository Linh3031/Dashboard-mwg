<script>
    export let group;
    export let expandedRows;
    export let toggleRow;
    export let LEVEL_COLORS;
    export let fmtQty;
    export let fmtRev;
    export let fmtPct;

    export let isVelocityMode = false;
    export let hasInventoryData = false;
    export let isCompareMode = false;
    export let columnSettings = [];
    export let elapsedDays = 1;
    export let daysInMonth = 30;

    $: isExpanded = expandedRows.has(group.id);
    $: levelColor = LEVEL_COLORS[group.level] || 'text-gray-700';
    $: paddingLeft = `${group.level * 24 + 16}px`;

    $: traChamPercent = group.revenue > 0 ? (group.revenueTraCham / group.revenue) * 100 : 0;
    $: qdPercent = group.revenue > 0 ? ((group.revenueQD / group.revenue) * 100) - 100 : 0;

    $: isColVisible = (id) => {
        const found = columnSettings.find(c => c.id === id);
        return found ? found.visible : true;
    };

    $: getProjected = (val) => {
        if (!val) return 0;
        return (val / elapsedDays) * daysInMonth;
    };

    $: getPctVal = (currProj, prev) => prev ? ((currProj - prev) / prev) * 100 : (currProj > 0 ? 100 : 0);
    $: fmtDiffText = (diff, formatter) => diff === 0 ? '0' : (diff > 0 ? '+' : '') + formatter(diff);
    $: fmtPctText = (pct) => pct === 0 ? '0.0%' : (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
    $: getColorClass = (val) => val >= 0 ? 'text-blue-600 font-semibold' : 'text-red-500 font-semibold';

    const getAlertClass = (status) => {
        if (status === 'alert') return 'text-red-600 font-bold bg-red-50';
        if (status === 'ok') return 'text-emerald-600 font-bold';
        return 'text-gray-400';
    };
    const fmtInt = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
</script>

<tr class="hover:bg-gray-50 transition-colors border-b last:border-0 group-row text-xs">
    <td class="py-2 pr-4 border-r relative" style="padding-left: {paddingLeft}">
        <div class="flex items-center">
            {#if !group.isLeaf}
                <button on:click={() => toggleRow(group.id)} class="mr-2 p-1 rounded hover:bg-gray-200 text-gray-500 focus:outline-none transition-transform duration-200" style="transform: rotate({isExpanded ? '90deg' : '0deg'})">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                </button>
            {:else}<span class="w-6 inline-block"></span>{/if}
            <span class="{levelColor} truncate" title={group.name}>{group.name}</span>
        </div>
        {#if group.level > 0}<div class="absolute left-0 top-0 bottom-0 border-l border-gray-200" style="left: {group.level * 24}px"></div>{/if}
    </td>

    {#if isColVisible('quantity')}
        {#if isCompareMode && !isVelocityMode}
            {@const prev = group.quantityCK || 0} {@const currProj = getProjected(group.quantity || 0)}
            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
            <td class="py-2 px-1 text-right bg-slate-50/30 border-r">{fmtQty(prev)}</td>
            <td class="py-2 px-1 text-right bg-slate-50/30 border-r font-semibold text-gray-800">{fmtQty(currProj)}</td>
            <td class="py-2 px-1 text-right bg-slate-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtQty)}</td>
            <td class="py-2 px-1 text-center bg-slate-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
        {:else}
            <td class="py-2 px-4 text-right bg-slate-50/30 border-r font-semibold text-gray-700">{fmtQty(group.quantity)}</td>
        {/if}
    {/if}

    {#if isColVisible('revenue')}
        {#if isCompareMode && !isVelocityMode}
            {@const prev = group.revenueCK || 0} {@const currProj = getProjected(group.revenue || 0)}
            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
            <td class="py-2 px-1 text-right bg-blue-50/30 border-r">{fmtRev(prev)}</td>
            <td class="py-2 px-1 text-right bg-blue-50/30 border-r font-semibold text-blue-900">{fmtRev(currProj)}</td>
            <td class="py-2 px-1 text-right bg-blue-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
            <td class="py-2 px-1 text-center bg-blue-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
        {:else}
            <td class="py-2 px-4 text-right bg-blue-50/30 border-r font-semibold text-blue-800">{fmtRev(group.revenue)}</td>
        {/if}
    {/if}

    {#if isColVisible('donGia')}
        {#if isCompareMode && !isVelocityMode}
            {@const prev = group.quantityCK > 0 ? group.revenueCK / group.quantityCK : 0}
            {@const currProj = getProjected(group.quantity > 0 ? group.revenue / group.quantity : 0)}
            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
            <td class="py-2 px-1 text-right bg-amber-50/30 border-r">{fmtRev(prev)}</td>
            <td class="py-2 px-1 text-right bg-amber-50/30 border-r font-semibold text-amber-900">{fmtRev(currProj)}</td>
            <td class="py-2 px-1 text-right bg-amber-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
            <td class="py-2 px-1 text-center bg-amber-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
        {:else}
            <td class="py-2 px-4 text-right bg-amber-50/30 border-r font-semibold text-amber-700">{group.quantity > 0 ? fmtRev(group.revenue / group.quantity) : '-'}</td>
        {/if}
    {/if}

    {#if isColVisible('revenueQD')}
        {#if isCompareMode && !isVelocityMode}
            {@const prev = group.revenueQDCK || 0} {@const currProj = getProjected(group.revenueQD || 0)}
            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r">{fmtRev(prev)}</td>
            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r font-semibold text-indigo-900">{fmtRev(currProj)}</td>
            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
            <td class="py-2 px-1 text-center bg-indigo-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
        {:else}
            <td class="py-2 px-4 text-right bg-indigo-50/30 border-r text-gray-600">{fmtRev(group.revenueQD)}</td>
            {#if !isVelocityMode}<td class="py-2 px-4 text-center bg-indigo-50/30 font-bold border-r {qdPercent >= 0 ? 'text-green-700' : 'text-orange-600'}">{fmtPct(qdPercent)}</td>{/if}
        {/if}
    {/if}

    {#if hasInventoryData}
        <td class="py-2 px-4 text-right font-bold text-emerald-700 bg-emerald-50/30 border-r">{group.inventoryQty !== undefined ? fmtInt(group.inventoryQty) : '-'}</td>
        <td class="py-2 px-4 text-center text-xs {getAlertClass(group.inventoryStatus)} border-r">
            {#if group.inventoryStatus === 'alert'} <div class="flex items-center justify-center gap-1">⚠️ {group.inventoryMessage}</div>
            {:else if group.inventoryStatus === 'ok'} <span>✓ {group.inventoryMessage}</span>
            {:else} <span>{group.inventoryMessage || '-'}</span> {/if}
        </td>
    {/if}

    {#if isColVisible('revenueTraCham')}
        {#if isCompareMode && !isVelocityMode}
            {@const prev = group.revenueTraChamCK || 0} {@const currProj = getProjected(group.revenueTraCham || 0)}
            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r">{fmtRev(prev)}</td>
            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r font-semibold text-yellow-900">{fmtRev(currProj)}</td>
            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
            <td class="py-2 px-1 text-center bg-yellow-50/30 {getColorClass(diff)}">{fmtPctText(pct)}</td>
        {:else}
            <td class="py-2 px-4 text-right bg-yellow-50/30 text-yellow-700 border-r">{fmtRev(group.revenueTraCham)}</td>
            <td class="py-2 px-4 text-center text-yellow-700 bg-yellow-50/30 font-bold">{fmtPct(traChamPercent)}</td>
        {/if}
    {/if}
</tr>

{#if isExpanded && group.children}
    {#each group.children as child (child.id)}
        <svelte:self group={child} {expandedRows} {toggleRow} {LEVEL_COLORS} {fmtQty} {fmtRev} {fmtPct} {isVelocityMode} {hasInventoryData} {isCompareMode} {columnSettings} {elapsedDays} {daysInMonth} />
    {/each}
{/if}