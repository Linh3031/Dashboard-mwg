<script>
    import { afterUpdate } from 'svelte';
    import CompetitionCard from './CompetitionCard.svelte';
    
    export let sortedData = [];

    function sortData(items) {
        return [...items].sort((a, b) => b.hoanThanhDuKienValue - a.hoanThanhDuKienValue);
    }

    $: completed = sortData(sortedData.filter(d => d.hoanThanhDuKienValue >= 100));
    $: nearCompleted = sortData(sortedData.filter(d => d.hoanThanhDuKienValue >= 80 && d.hoanThanhDuKienValue < 100));
    $: pending = sortData(sortedData.filter(d => d.hoanThanhDuKienValue < 80));

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

{#if completed.length > 0}
    <div>
        <div class="text-sm font-bold text-blue-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
            <span class="bg-blue-100 p-1 rounded"><i data-feather="check" class="w-4 h-4"></i></span> Đã hoàn thành ({completed.length})
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each completed as item} 
                <CompetitionCard {item} />
            {/each}
        </div>
    </div>
{/if}

{#if nearCompleted.length > 0}
    <div>
        <div class="text-sm font-bold text-yellow-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-yellow-100">
            <span class="bg-yellow-100 p-1 rounded"><i data-feather="trending-up" class="w-4 h-4"></i></span> Gần đạt ({nearCompleted.length})
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each nearCompleted as item}
                <CompetitionCard {item} />
            {/each}
        </div>
    </div>
{/if}

{#if pending.length > 0}
    <div>
        <div class="text-sm font-bold text-red-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-red-100">
            <span class="bg-red-100 p-1 rounded"><i data-feather="clock" class="w-4 h-4"></i></span> Cần nỗ lực thêm ({pending.length})
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each pending as item} 
                <CompetitionCard {item} />
            {/each}
        </div>
    </div>
{/if}