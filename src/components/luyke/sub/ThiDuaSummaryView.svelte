<script>
    import { afterUpdate } from 'svelte';
    import CompetitionCard from './CompetitionCard.svelte';
    
    export let sortedData = [];

    function sortDataByTarget(items) { 
        return [...items].sort((a, b) => (parseFloat(b.target) || 0) - (parseFloat(a.target) || 0));
    }

    $: dataDoanhThu = sortDataByTarget(sortedData.filter(d => d.type === 'doanhThu'));
    $: dataSoLuong = sortDataByTarget(sortedData.filter(d => d.type === 'soLuong'));

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

{#if dataDoanhThu.length > 0}
    <div>
        <div class="text-sm font-bold text-blue-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
            <span class="bg-blue-100 p-1 rounded"><i data-feather="dollar-sign" class="w-4 h-4"></i></span> Thi Đua Doanh Thu ({dataDoanhThu.length})
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each dataDoanhThu as item} 
                <CompetitionCard {item} /> 
            {/each}
        </div>
    </div>
{/if}

{#if dataSoLuong.length > 0}
    <div>
        <div class="text-sm font-bold text-orange-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-orange-100">
            <span class="bg-orange-100 p-1 rounded"><i data-feather="box" class="w-4 h-4"></i></span> Thi Đua Số Lượng ({dataSoLuong.length})
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each dataSoLuong as item} 
                <CompetitionCard {item} /> 
            {/each}
        </div>
    </div>
{/if}