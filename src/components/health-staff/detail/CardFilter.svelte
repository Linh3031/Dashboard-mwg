<script>
    import { createEventDispatcher } from 'svelte';
    
    export let items = []; // Array { id, label, visible }

    const dispatch = createEventDispatcher();
    let isOpen = false;
    let containerRef; 

    function toggleDropdown() {
        isOpen = !isOpen;
    }

    function toggleItem(id) {
        dispatch('change', id);
    }

    // Đóng dropdown khi click ra ngoài container của chính component này
    function close(e) {
        if (isOpen && containerRef && !containerRef.contains(e.target)) {
            isOpen = false;
        }
    }
</script>

<svelte:window on:click={close} />

<div class="relative inline-block text-left" bind:this={containerRef}>
    <button 
        type="button" 
        class="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
        on:click|stopPropagation={toggleDropdown}
        title="Lọc chỉ số hiển thị"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
    </button>

    {#if isOpen}
        <div class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] animate-fade-in-fast origin-top-right">
            <div class="p-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <span class="text-xs font-bold text-gray-500 uppercase">Hiển thị chỉ số</span>
            </div>
            <div class="p-1 max-h-60 overflow-y-auto custom-scrollbar">
                {#if items.length === 0}
                    <div class="px-3 py-2 text-xs text-gray-400 text-center">Không có mục nào.</div>
                {:else}
                    {#each items as item (item.id)}
                        <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded transition-colors group">
                            <input 
                                type="checkbox" 
                                checked={item.visible !== false} 
                                on:change={() => toggleItem(item.id)}
                                class="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            >
                            <span class="text-sm text-gray-700 group-hover:text-blue-700 truncate select-none" title={item.label}>
                                {item.label}
                            </span>
                        </label>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in-fast { animation: fadeIn 0.1s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
</style>