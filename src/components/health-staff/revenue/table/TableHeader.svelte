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
        <th class="w-[45px] min-w-[45px] max-w-[45px] px-1 py-3 transition select-none bg-gray-100 text-gray-700 text-center border-r border-gray-200">Hạng</th>
        
        <th class="w-[160px] min-w-[160px] px-3 py-3 transition select-none bg-gray-100 text-gray-700 text-left cursor-pointer hover:bg-gray-200 border-r border-gray-200" on:click={() => dispatch('sort', 'hoTen')}>
            <div class="flex items-center justify-between">
                Nhân viên
                {#if sortKey === 'hoTen'}<span class="text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
            </div>
        </th>
        
        {#each visibleColumns as col}
            <th class="w-[90px] min-w-[90px] max-w-[90px] px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 {revenueTableUtils.getGroupHeaderClass(col)}" on:click={() => dispatch('sort', col.key)}>
                <div class="flex flex-col items-center justify-center w-full h-full">
                    <span class="whitespace-normal break-words leading-tight">{col.label}</span>
                    {#if sortKey === col.key}<span class="text-[10px] opacity-70 mt-0.5">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                </div>
            </th>
        {/each}
    </tr>
</thead>