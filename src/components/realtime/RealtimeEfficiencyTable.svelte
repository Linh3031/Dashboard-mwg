<script>
  import { formatters } from '../../utils/formatters.js';
  export let items = []; 

  // State sắp xếp
  let sortKey = 'label'; // Mặc định theo Tên chỉ số
  let sortDirection = 'asc';

  function handleSort(key) {
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
    
    // Sort theo giá trị thực hiện hoặc mục tiêu
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
      <table class="min-w-full text-sm table-bordered">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold">
          <tr>
            <th class="px-4 py-2 text-left cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => handleSort('label')}>
              Chỉ số {sortKey === 'label' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th class="px-4 py-2 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => handleSort('value')}>
              Thực hiện {sortKey === 'value' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th class="px-4 py-2 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => handleSort('target')}>
              Mục tiêu {sortKey === 'target' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.id)}
            {@const isBelow = item.value < ((item.target || 0) / 100)}
            <tr class="border-t hover:bg-gray-50">
              <td class="px-4 py-2 font-semibold text-gray-800">{item.label}</td>
              <td class="px-4 py-2 text-right font-bold text-lg {isBelow ? 'bg-red-100 text-red-700' : 'text-green-600'}">
                {formatters.formatPercentage(item.value)}
              </td>
              <td class="px-4 py-2 text-right text-gray-600">{item.target || 0}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>