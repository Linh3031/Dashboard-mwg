<script>
    import { createEventDispatcher } from 'svelte';
    import SortableTh from '../../common/SortableTh.svelte';

    export let config = {};
    export let tableMetrics = {};
    export let totalColSpan = 0;
    export let sortKey = '';
    export let sortDirection = 'desc';

    const dispatch = createEventDispatcher();

    // Helper màu sắc header phụ
    const getSubHeaderColor = (index) => {
        const colors = [
            'bg-indigo-100 text-indigo-900 border-indigo-200', 
            'bg-emerald-100 text-emerald-900 border-emerald-200', 
            'bg-amber-100 text-amber-900 border-amber-200', 
            'bg-rose-100 text-rose-900 border-rose-200', 
            'bg-cyan-100 text-cyan-900 border-cyan-200'
        ];
        return colors[index % colors.length];
    };

    function handleSort(event) {
        dispatch('sort', event.detail);
    }

    function handleManualSort(key) {
        dispatch('manualSort', key);
    }
</script>

<thead class="bg-gray-50 text-xs uppercase text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
    <tr>
        <th 
            class="px-4 py-2 pl-5 min-w-[180px] sticky left-0 z-30 bg-gray-100 border-r border-b border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-200 transition select-none text-left"
            rowspan="2"
            on:click={() => handleManualSort('hoTen')}
        >
            <div class="flex items-center gap-1 justify-start">
                <span class="font-bold uppercase text-xs {sortKey === 'hoTen' ? 'text-blue-800' : 'text-slate-700'}">Nhân viên</span>
                <span class="flex flex-col items-center justify-center w-4 h-4">
                    {#if sortKey !== 'hoTen'}
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    {:else if sortDirection === 'asc'}
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    {/if}
                </span>
            </div>
        </th>
        
        {#if totalColSpan > 0}
            <th colspan={totalColSpan} class="px-2 py-2 text-center border-b border-r border-gray-300 text-gray-900 bg-gray-200">
                TỔNG HỢP
            </th>
        {/if}

        {#each config.subColumns as col, index}
            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
            {@const colSpan = (metrics.sl ? 1 : 0) + (metrics.dt ? 1 : 0) + (metrics.dtqd ? 1 : 0)}
            {#if colSpan > 0}
                <th colspan={colSpan} class="px-2 py-2 text-center border-b border-r border-gray-200 {getSubHeaderColor(index)}">
                    {col.header}
                </th>
            {/if}
        {/each}
    </tr>

    <tr>
        {#if tableMetrics.sl}
            <SortableTh key="totalSL" label="SL" align="right" className="min-w-[60px] text-gray-700 bg-gray-100 border-r border-gray-300 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
        {/if}
        {#if tableMetrics.dt}
                <SortableTh key="mainValue" label="DT" align="right" className="min-w-[80px] text-blue-800 bg-gray-100 border-r border-gray-300 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
        {/if}
        {#if tableMetrics.dtqd}
                <SortableTh key="totalDTQD" label="QĐ" align="right" className="min-w-[80px] text-purple-800 bg-gray-100 border-r border-gray-300 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
        {/if}

        {#each config.subColumns as col}
            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
            {#if metrics.sl}
                <SortableTh key={`${col.header}|sl`} label="SL" align="right" className="min-w-[60px] text-gray-500 bg-white border-r border-gray-200 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
            {/if}
            {#if metrics.dt}
                <SortableTh key={`${col.header}|dt`} label="DT" align="right" className="min-w-[80px] text-blue-600 bg-white border-r border-gray-200 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
            {/if}
            {#if metrics.dtqd}
                <SortableTh key={`${col.header}|dtqd`} label="QĐ" align="right" className="min-w-[80px] text-purple-600 bg-white border-r border-gray-200 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
            {/if}
        {/each}
    </tr>
</thead>