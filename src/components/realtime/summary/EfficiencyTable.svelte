<script>
  // File: src/components/realtime/summary/EfficiencyTable.svelte
  import { onMount } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import SortableTh from '../../common/SortableTh.svelte';

  export let items = [];
  let sortKey = 'label';
  let sortDirection = 'asc';

  onMount(() => {
    console.log('✅ EfficiencyTable (Summary) - DENSITY MODE ACTIVE');
  });

  function handleSort(event) {
    const key = event.detail;
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  $: sortedItems = [...items].sort((a, b) => {
    let valA, valB;
    if (sortKey === 'label') {
        valA = a.label || '';
        valB = b.label || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } 
    valA = a[sortKey] || 0;
    valB = b[sortKey] || 0;
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });
</script>

<div class="bg-white rounded-xl shadow-md p-4 border border-gray-200 h-full">
  <h3 class="text-lg font-bold text-gray-700 mb-4 uppercase border-b pb-2 bg-yellow-50 p-2 rounded">Hiệu quả khai thác</h3>

  {#if items.length === 0}
    <p class="text-gray-500 font-bold p-4 text-center">Vui lòng tải file realtime để xem chi tiết.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm table-bordered eff-table">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold">
          <tr>
            <SortableTh key="label" label="Chỉ số" align="left" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="value" label="Thực hiện" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="target" label="Mục tiêu" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item, index (index)}
            {@const isBelow = item.value < ((item.target || 0) / 100)}
            <tr class="border-t hover:bg-gray-50 eff-row">
              <td class="px-4 py-2 font-semibold text-gray-800 eff-label">{item.label}</td>
              <td class="px-4 py-2 text-right font-bold text-lg {isBelow ? 'bg-red-100 text-red-700' : 'text-blue-600'} eff-value">
                {formatters.formatPercentage(item.value)}
              </td>
              <td class="px-4 py-2 text-right text-gray-600 eff-target">{item.target || 0}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
    /* [FIX GENESIS]: Tối ưu mật độ bảng */
    :global(.capture-container .eff-row td) {
        padding: 4px 8px !important; /* Giảm đệm dòng */
    }
    :global(.capture-container .eff-label) {
        font-size: 14px !important;
    }
    :global(.capture-container .eff-value) {
        font-size: 18px !important; /* % Thực hiện to hơn */
        font-weight: 800 !important;
    }
    :global(.capture-container .eff-target) {
        font-size: 14px !important;
    }
</style>