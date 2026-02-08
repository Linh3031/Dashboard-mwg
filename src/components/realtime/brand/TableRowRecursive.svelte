<script>
    export let group;
    export let expandedRows;
    export let toggleRow;
    export let LEVEL_COLORS;
    export let fmtQty;
    export let fmtRev;
    export let fmtPct;

    // [NEW] Nhận flag từ cha
    export let isVelocityMode = false;
    
    $: isExpanded = expandedRows.has(group.id);
    $: levelColor = LEVEL_COLORS[group.level] || 'text-gray-700';
    $: paddingLeft = `${group.level * 24 + 16}px`;
    
    // Tính toán phần trăm
    $: traChamPercent = group.revenue > 0 ? (group.revenueTraCham / group.revenue) * 100 : 0;
    // [NEW] Tính % Quy đổi
    $: qdPercent = group.revenue > 0 ? (group.revenueQD / group.revenue) * 100 : 0;
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
            
            <span class="{levelColor} truncate">
                {group.name}
            </span>
        </div>
        
        {#if group.level > 0}
             <div class="absolute left-0 top-0 bottom-0 border-l border-gray-200" style="left: {group.level * 24}px"></div>
        {/if}
    </td>

    <td class="py-2 px-4 text-right font-medium text-gray-700">{fmtQty(group.quantity)}</td>
    
    <td class="py-2 px-4 text-right font-medium text-gray-800">{fmtRev(group.revenue)}</td>
    
    <td class="py-2 px-4 text-right text-gray-600">{fmtRev(group.revenueQD)}</td>

    <td class="py-2 px-4 text-center font-bold text-xs {qdPercent >= 100 ? 'text-green-700' : 'text-orange-600'}">
        {fmtPct(qdPercent)}
    </td>

    {#if !isVelocityMode}
        <td class="py-2 px-4 text-right text-yellow-700 bg-yellow-50/50">{fmtRev(group.revenueTraCham)}</td>
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
         />
    {/each}
{/if}