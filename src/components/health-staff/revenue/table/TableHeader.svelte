<script>
    import { createEventDispatcher } from 'svelte';
    import { revenueTableUtils } from '../../../../utils/revenue-table.utils.js';

    export let visibleColumns = [];
    export let sortKey = '';
    export let sortDirection = 'desc';

    const dispatch = createEventDispatcher();
</script>

<thead class="uppercase text-[11px] font-bold sticky top-0 z-10 shadow-sm align-middle">
    <tr>
        <th class="px-1 py-3 transition select-none bg-gray-100 text-gray-700 text-center border-r border-gray-200 overflow-hidden" style="width: 45px; min-width: 45px; max-width: 45px;">Hạng</th>
        
        <th class="px-3 py-3 transition select-none bg-gray-100 text-gray-700 text-left cursor-pointer hover:bg-gray-200 border-r border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis" style="width: 160px; min-width: 160px; max-width: 160px;" on:click={() => dispatch('sort', 'hoTen')}>
            <div class="flex items-center justify-start gap-1.5 w-full">
                <span class="truncate">Nhân viên</span>
                {#if sortKey === 'hoTen'}<span class="text-blue-600 font-black text-[10px] flex-shrink-0">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
            </div>
        </th>
        
        {#each visibleColumns as col}
            <th class="px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 {revenueTableUtils.getGroupHeaderClass(col)} overflow-hidden" style="width: 90px; min-width: 90px; max-width: 90px;" on:click={() => dispatch('sort', col.key)}>
                <div class="flex flex-row items-center justify-center w-full h-full gap-1">
                    <span class="whitespace-normal break-words leading-tight w-full truncate">{col.label}</span>
                    {#if sortKey === col.key}
                        <span class="text-blue-600 font-black flex-shrink-0 text-[10px] mt-0.5">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    {/if}
                </div>
            </th>
        {/each}
    </tr>
</thead>