<script>
    import { createEventDispatcher } from 'svelte';
    import TabGeneral from './tabs/TabGeneral.svelte';
    import TabKPI from './tabs/TabKPI.svelte';
    import TabRanking from './tabs/TabRanking.svelte';
    import TabDetails from './tabs/TabDetails.svelte';

    export let supermarketReport = {}; // Nhận từ cha, truyền cho TabDetails

    const dispatch = createEventDispatcher();
    let activeTagTab = 'general'; 

    function handleInsert(event) {
        // Chuyển tiếp sự kiện insert lên ComposerModal
        dispatch('insertTag', event.detail);
    }
</script>

<div class="w-full md:w-80 bg-slate-50 flex flex-col border-l border-gray-200 h-full">
    <div class="flex border-b border-gray-200 bg-white">
            {#each ['general', 'kpi', 'ranking', 'details'] as tab}
            <button 
                class="flex-1 py-3 text-xs font-bold uppercase tracking-wide text-center hover:bg-slate-50 transition-colors border-b-2 
                {activeTagTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}"
                on:click={() => activeTagTab = tab}
            >
                {tab}
            </button>
        {/each}
    </div>

    <div class="flex-grow overflow-y-auto p-4 custom-scrollbar">
        {#if activeTagTab === 'general'}
            <TabGeneral on:insert={handleInsert} />
        {:else if activeTagTab === 'kpi'}
            <TabKPI on:insert={handleInsert} />
        {:else if activeTagTab === 'ranking'}
            <TabRanking on:insert={handleInsert} />
        {:else if activeTagTab === 'details'}
            <TabDetails {supermarketReport} on:insert={handleInsert} />
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
</style>