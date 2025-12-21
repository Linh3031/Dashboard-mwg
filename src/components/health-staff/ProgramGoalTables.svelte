<script>
  import { createEventDispatcher } from 'svelte';
  
  export let programTables = [];
  const dispatch = createEventDispatcher();
  let localTables = [];

  // Logic đồng bộ: Store -> Biến cục bộ
  $: if (programTables) {
      const isDiff = JSON.stringify(programTables.map(t => t.id)) !== JSON.stringify(localTables.map(t => t.id));
      if (localTables.length === 0 || isDiff) {
          localTables = JSON.parse(JSON.stringify(programTables));
      }
  }

  function syncToStore() {
      dispatch('update', localTables);
  }
</script>

<div class="w-full space-y-6">
  {#if localTables && localTables.length > 0}
    {#each localTables as table, index (index)}
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        
        <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
          
          <h3 class="font-bold text-blue-700 text-sm uppercase tracking-wide border-l-4 border-blue-600 pl-2 truncate">
            {table.name || table.programName || `Chương trình ${index + 1}`}
          </h3>

          <div class="flex items-center gap-2 flex-shrink-0">
             <label class="text-xs font-bold text-gray-600 whitespace-nowrap cursor-pointer">
                Mục tiêu:
             </label>
             
             <div class="relative"> 
                <input 
                  type="number" 
                  bind:value={table.target} 
                  on:input={syncToStore}
                  class="block w-32 rounded border border-gray-300 bg-white text-right font-bold text-red-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-1 px-2 shadow-sm"
                  placeholder="0"
                />
                <span class="absolute right-0 top-0 text-[10px] text-gray-400 pointer-events-none mr-1 mt-1.5">đ</span>
             </div>
          </div>

        </div>

        <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="block text-xs font-medium text-gray-500 uppercase">Thực đạt (Actual)</label>
            <div class="relative">
                <input 
                    type="number" 
                    bind:value={table.actual} 
                    on:input={syncToStore}
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3 border font-bold text-gray-700"
                />
                <span class="absolute right-0 top-0 text-[10px] text-gray-400 pointer-events-none mr-2 mt-2.5">đ</span>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-medium text-gray-500 uppercase">Ghi chú</label>
            <textarea 
              bind:value={table.note} 
              on:input={syncToStore}
              rows="1"
              class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm py-2 px-3 border resize-none"
            ></textarea>
          </div>
        </div>
        
        <div class="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-end items-center gap-3">
             <span class="text-xs text-gray-500">Tiến độ:</span>
             <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full {table.actual >= table.target ? 'bg-green-500' : 'bg-orange-400'}" style="width: {Math.min((table.actual / (table.target || 1)) * 100, 100)}%"></div>
             </div>
             <span class="font-bold text-base {table.actual >= table.target ? 'text-green-600' : 'text-orange-600'}">
                {table.target > 0 ? ((table.actual / table.target) * 100).toFixed(1) : 0}%
             </span>
        </div>

      </div>
    {/each}
  {/if}
</div>