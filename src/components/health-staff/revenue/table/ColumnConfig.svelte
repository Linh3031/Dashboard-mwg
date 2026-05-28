<script>
    import { createEventDispatcher } from 'svelte';
    export let columnSettings = [];
    const dispatch = createEventDispatcher();
</script>

<details class="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4 capture-hide" style="cursor: pointer;">
    <summary class="text-xs font-bold text-gray-500 uppercase select-none outline-none flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        Cấu hình ẩn / hiện cột dữ liệu báo cáo
    </summary>
    <div class="flex flex-wrap gap-2 mt-2.5" on:click|stopPropagation>
        {#each columnSettings as col}
            <button 
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none {col.visible ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}"
                on:click={() => dispatch('toggle', col.key)}
            >
                {col.visible ? '✓ ' : '+ '} {col.label}
            </button>
        {/each}
    </div>
</details>

<style>
    details > summary::-webkit-details-marker { display: none; }
</style>