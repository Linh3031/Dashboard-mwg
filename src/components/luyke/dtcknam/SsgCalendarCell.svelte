<script>
    import { formatters } from '../../../utils/formatters.js';
    export let data;
    export let toggles;

    const fmt = (n) => formatters.formatNumber(Math.round((n || 0) / 100000) / 10, 1);
    
    // Nếu hôm nay có dữ liệu 2026, kiểm tra xem nó có rớt đài so với 2025 không (Dùng doanh thu thực để xét đỏ)
    $: isNegativeDay = !data.isFuture && data.growthVal < 0;
</script>

{#if data.isEmpty}
    <div class="bg-transparent min-h-[120px]"></div>
{:else}
    <div class="flex flex-col border {isNegativeDay ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'} {data.isFuture ? 'border-dashed border-indigo-300 bg-indigo-50/20' : ''} rounded-md min-h-[120px] overflow-hidden hover:shadow-md transition">
        
        <div class="flex justify-between items-start px-2 py-1 border-b {isNegativeDay ? 'border-red-200 bg-red-100' : 'border-gray-200 bg-gray-50'}">
            <span class="text-lg font-black {data.isFuture ? 'text-indigo-400' : (isNegativeDay ? 'text-red-700' : 'text-gray-800')}">{data.dayNum}</span>
            <span class="text-[9px] text-gray-500 font-medium mt-1">{data.lunar} Âm</span>
        </div>

        <div class="flex-1 p-1.5 flex flex-col justify-center gap-1">
            {#if data.isFuture}
                <div class="text-center py-2 flex flex-col items-center justify-center h-full">
                    <p class="text-[9px] font-bold text-indigo-500 uppercase mb-1">Mục tiêu (Tr)</p>
                    <div class="flex items-center justify-center gap-1.5 w-full px-1">
                        {#if toggles.showThuc}
                            <span class="text-lg font-black text-blue-700" title="Mục tiêu DT Thực">{fmt(data.targetDt)}</span>
                        {/if}
                        
                        {#if toggles.showThuc && toggles.showQd}
                            <span class="text-gray-300 font-light">|</span>
                        {/if}
                        
                        {#if toggles.showQd}
                            <span class="text-lg font-black text-emerald-600" title="Mục tiêu DT Quy đổi">{fmt(data.targetQd)}</span>
                        {/if}
                        
                        {#if !toggles.showThuc && !toggles.showQd}
                            <span class="text-lg font-black text-blue-700">{fmt(data.targetDt)}</span>
                        {/if}
                    </div>
                </div>
            {:else}
                {#if toggles.show2025}
                    <div class="flex justify-between items-center px-1 py-0.5 bg-gray-100 rounded text-[10px]">
                        <span class="text-gray-500 font-bold">2025</span>
                        <div class="text-right">
                            {#if toggles.showThuc}<span class="text-gray-700 font-bold">{fmt(data.rev25)}</span>{/if}
                            {#if toggles.showThuc && toggles.showQd}<span class="text-gray-300 mx-0.5">|</span>{/if}
                            {#if toggles.showQd}<span class="text-emerald-600 font-medium">{fmt(data.revQd25)}</span>{/if}
                        </div>
                    </div>
                {/if}
                
                <div class="flex justify-between items-center px-1 py-1 {isNegativeDay ? 'bg-white' : 'bg-blue-50'} rounded border {isNegativeDay ? 'border-red-100' : 'border-blue-100'} text-[11px]">
                    <span class="text-blue-800 font-black">2026</span>
                    <div class="text-right">
                        {#if toggles.showThuc}<span class="text-blue-700 font-black">{fmt(data.rev26)}</span>{/if}
                        {#if toggles.showThuc && toggles.showQd}<span class="text-blue-300 mx-0.5">|</span>{/if}
                        {#if toggles.showQd}<span class="text-emerald-600 font-bold">{fmt(data.revQd26)}</span>{/if}
                    </div>
                </div>
            {/if}
        </div>

        {#if !data.isFuture && toggles.showGrowth}
            <div class="border-t {isNegativeDay ? 'border-red-200' : 'border-gray-200'} px-2 py-1 flex justify-between items-center text-[10px] font-bold {isNegativeDay ? 'text-red-600' : 'text-emerald-600'}">
                <span>{data.growthVal > 0 ? '+' : ''}{fmt(data.growthVal)}</span>
                <span class="px-1 rounded bg-white shadow-sm border {isNegativeDay ? 'border-red-200' : 'border-emerald-100'}">
                    {(data.growthPct * 100).toFixed(1)}%
                </span>
            </div>
        {/if}
    </div>
{/if}