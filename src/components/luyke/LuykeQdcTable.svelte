<script>
  import { afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';

  export let items = [];
  export let numDays = 1;

  $: sortedItems = [...items].sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
  $: maxVal = sortedItems.length > 0 ? sortedItems[0].dtqd : 0;

  afterUpdate(() => {
    if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="luyke-widget h-full">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-yellow-100 rounded text-yellow-600 mr-2">
          <i data-feather="star" class="w-4 h-4"></i>
      </div>
      <span>Top Quy Đổi Cao</span>
    </div>
  </div>

  <div class="luyke-widget-body custom-scrollbar">
    {#if sortedItems.length === 0}
       <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <p class="text-sm">Chưa có dữ liệu QĐC.</p>
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each sortedItems as item, index}
          {@const percent = maxVal > 0 ? (item.dtqd / maxVal) * 100 : 0}
          
          <div class="py-2 border-b border-dashed border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-1">
            <div class="flex items-center gap-3">
               <div class="w-6 text-center font-bold text-gray-400 text-xs">#{index + 1}</div>
               
               <div class="flex-grow">
                   <div class="flex justify-between items-center mb-1">
                       <span class="text-sm font-semibold text-gray-700">{item.name}</span>
                       <span class="text-sm font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</span>
                   </div>
                   
                   <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <div class="h-full bg-yellow-400 rounded-full" style="width: {percent}%"></div>
                   </div>
                   
                   <div class="flex justify-between mt-1 text-[10px] text-gray-400">
                       <span>SL: {formatters.formatNumber(item.sl)}</span>
                       <span>TB: {formatters.formatNumber(item.sl / numDays, 1)}/ngày</span>
                   </div>
               </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>