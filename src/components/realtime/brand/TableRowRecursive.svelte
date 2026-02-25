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
    
    // [GENESIS ADD]: Nhận trạng thái So sánh từ bảng cha
    export let isCompareMode = false;
    
    $: isExpanded = expandedRows.has(group.id);
    $: levelColor = LEVEL_COLORS[group.level] || 'text-gray-700';
    $: paddingLeft = `${group.level * 24 + 16}px`;
    
    $: traChamPercent = group.revenue > 0 ? (group.revenueTraCham / group.revenue) * 100 : 0;
    $: qdPercent = group.revenue > 0 ? (group.revenueQD / group.revenue) * 100 : 0;

    // [GENESIS SURGICAL] Sửa hàm nhận diện Class theo đúng định dạng trả về của InventoryLogic
    const getAlertClass = (status) => {
        if (status === 'alert') return 'text-red-600 font-bold bg-red-50';
        if (status === 'ok') return 'text-emerald-600 font-bold';
        return 'text-gray-400';
    };

    // [FIX DISPLAY] Hàm format số nguyên cho tồn kho (bỏ số lẻ)
    const fmtInt = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

    // [GENESIS ADD]: Hàm tính toán chênh lệch hiển thị UI
    const getDiff = (current, prev) => (current || 0) - (prev || 0);
    const getPct = (current, prev) => {
        if (!prev) return current > 0 ? '+100%' : '0%';
        const diff = current - prev;
        const pct = (diff / prev) * 100;
        return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
    };
    const getDiffColor = (diff) => diff >= 0 ? 'text-blue-600' : 'text-red-500';
    const getDiffIcon = (diff) => diff >= 0 ? '▲' : '▼';
</script>

<tr class="hover:bg-gray-50 transition-colors border-b last:border-0 group-row">
    <td class="py-2 pr-4 border-r relative" style="padding-left: {paddingLeft}">
        <div class="flex items-center">
            {#if !group.isLeaf}
                <button 
                    on:click={() => toggleRow(group.id)}
                    class="mr-2 p-1 rounded hover:bg-gray-200 text-gray-500 focus:outline-none transition-transform duration-200"
                    style="transform: rotate({isExpanded ? '90deg' : '0deg'})"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
            {:else}
                <span class="w-6 inline-block"></span>
            {/if}
            <span class="{levelColor} truncate" title={group.name}>{group.name}</span>
        </div>
        {#if group.level > 0}
             <div class="absolute left-0 top-0 bottom-0 border-l border-gray-200" style="left: {group.level * 24}px"></div>
        {/if}
    </td>

    <td class="py-2 px-4 text-right group relative">
        <div class="flex items-center justify-end gap-1.5 font-medium text-gray-700">
            <span>{fmtQty(group.quantity)}</span>
            {#if isCompareMode && !isVelocityMode}
                {@const diff = getDiff(group.quantity, group.quantityCK)}
                <span class="text-gray-300 font-light">|</span>
                <span class="text-xs {getDiffColor(diff)}">
                    {diff > 0 ? '+' : ''}{fmtQty(diff)}
                </span>
            {/if}
        </div>
        {#if isCompareMode && !isVelocityMode}
            {@const diff = getDiff(group.quantity, group.quantityCK)}
            <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">
                {getDiffIcon(diff)} {getPct(group.quantity, group.quantityCK)}
            </div>
            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap">
                Cùng kỳ: <b>{fmtQty(group.quantityCK)}</b> <br/>
                Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtQty(diff)} ({getPct(group.quantity, group.quantityCK)})</b>
            </div>
        {/if}
    </td>
    
    <td class="py-2 px-4 text-right group relative">
        <div class="flex items-center justify-end gap-1.5 font-medium text-gray-800">
            <span>{fmtRev(group.revenue)}</span>
            {#if isCompareMode && !isVelocityMode}
                {@const diff = getDiff(group.revenue, group.revenueCK)}
                <span class="text-gray-300 font-light">|</span>
                <span class="text-xs {getDiffColor(diff)}">
                    {diff > 0 ? '+' : ''}{fmtRev(diff)}
                </span>
            {/if}
        </div>
        {#if isCompareMode && !isVelocityMode}
            {@const diff = getDiff(group.revenue, group.revenueCK)}
            <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">
                {getDiffIcon(diff)} {getPct(group.revenue, group.revenueCK)}
            </div>
            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap">
                Cùng kỳ: <b>{fmtRev(group.revenueCK)}</b> <br/>
                Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtRev(diff)} ({getPct(group.revenue, group.revenueCK)})</b>
            </div>
        {/if}
    </td>
    
    <td class="py-2 px-4 text-right group relative">
        <div class="flex items-center justify-end gap-1.5 text-gray-600">
            <span>{fmtRev(group.revenueQD)}</span>
            {#if isCompareMode && !isVelocityMode}
                {@const diff = getDiff(group.revenueQD, group.revenueQDCK)}
                <span class="text-gray-300 font-light">|</span>
                <span class="text-xs {getDiffColor(diff)} font-medium">
                    {diff > 0 ? '+' : ''}{fmtRev(diff)}
                </span>
            {/if}
        </div>
        {#if isCompareMode && !isVelocityMode}
            {@const diff = getDiff(group.revenueQD, group.revenueQDCK)}
            <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">
                {getDiffIcon(diff)} {getPct(group.revenueQD, group.revenueQDCK)}
            </div>
            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap">
                Cùng kỳ: <b>{fmtRev(group.revenueQDCK)}</b> <br/>
                Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtRev(diff)} ({getPct(group.revenueQD, group.revenueQDCK)})</b>
            </div>
        {/if}
    </td>

    {#if !isVelocityMode}
        <td class="py-2 px-4 text-center font-bold text-xs {qdPercent >= 100 ? 'text-green-700' : 'text-orange-600'}">
            {fmtPct(qdPercent)}
        </td>
    {/if}

    {#if hasInventoryData}
        <td class="py-2 px-4 text-right font-bold text-emerald-700 bg-emerald-50/30">
            {group.inventoryQty !== undefined ? fmtInt(group.inventoryQty) : '-'}
        </td>
        <td class="py-2 px-4 text-center text-xs {getAlertClass(group.inventoryStatus)}">
            {#if group.inventoryStatus === 'alert'}
                <div class="flex items-center justify-center gap-1">
                    ⚠️ {group.inventoryMessage}
                </div>
            {:else if group.inventoryStatus === 'ok'}
                <span>✓ {group.inventoryMessage}</span>
            {:else}
                <span>{group.inventoryMessage || '-'}</span>
            {/if}
        </td>
    {/if}

    {#if !isVelocityMode}
        <td class="py-2 px-4 text-right bg-yellow-50/50 group relative">
            <div class="flex items-center justify-end gap-1.5 text-yellow-700">
                <span>{fmtRev(group.revenueTraCham)}</span>
                {#if isCompareMode}
                    {@const diff = getDiff(group.revenueTraCham, group.revenueTraChamCK)}
                    <span class="text-yellow-200 font-light">|</span>
                    <span class="text-xs {getDiffColor(diff)} font-medium">
                        {diff > 0 ? '+' : ''}{fmtRev(diff)}
                    </span>
                {/if}
            </div>
            {#if isCompareMode}
                {@const diff = getDiff(group.revenueTraCham, group.revenueTraChamCK)}
                <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">
                    {getDiffIcon(diff)} {getPct(group.revenueTraCham, group.revenueTraChamCK)}
                </div>
                <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap">
                    Cùng kỳ: <b>{fmtRev(group.revenueTraChamCK)}</b> <br/>
                    Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtRev(diff)} ({getPct(group.revenueTraCham, group.revenueTraChamCK)})</b>
                </div>
            {/if}
        </td>
        <td class="py-2 px-4 text-center text-yellow-700 bg-yellow-50/50 font-bold text-xs">
            {fmtPct(traChamPercent)}
        </td>
    {/if}
</tr>

{#if isExpanded && group.children}
    {#each group.children as child (child.id)}
        <svelte:self 
            group={child} 
            {expandedRows} 
            {toggleRow} 
            {LEVEL_COLORS}
            {fmtQty} {fmtRev} {fmtPct} 
            {isVelocityMode}
            {hasInventoryData} 
            {isCompareMode}
         />
    {/each}
{/if}