<script>
  import { onMount, afterUpdate } from 'svelte';
  import EvaluationBadge from '../shared/EvaluationBadge.svelte';

  export let title = '';
  export let icon = '';
  export let colorClass = 'sknv-header-blue';
  export let data = []; // Mảng các rows { label, value, average, rawValue, rawAverage }

  // Logic sắp xếp nội bộ
  let sortKey = 'label';
  let sortDirection = 'asc';

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'asc'; // Mặc định asc cho text
    }
  }

  $: sortedData = [...data].sort((a, b) => {
      let valA, valB;
      if (sortKey === 'label') {
          valA = a.label || '';
          valB = b.label || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortKey === 'value') {
          valA = a.rawValue || 0;
          valB = b.rawValue || 0;
      } else {
          valA = a.rawAverage || 0;
          valB = b.rawAverage || 0;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Helper đánh giá
  function isAboveAverage(val, avg) {
      if (!isFinite(val) || !isFinite(avg)) return false;
      return val >= avg;
  }

  afterUpdate(() => {
      if (window.feather) window.feather.replace();
  });
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden h-full flex flex-col">
    <div class="sknv-detail-card-header {colorClass} flex items-center gap-2 p-3 text-white">
        <i data-feather={icon} class="w-5 h-5"></i>
        <h4 class="text-lg font-bold">{title}</h4>
    </div>
    
    <div class="overflow-x-auto flex-grow">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" on:click={() => handleSort('label')}>
                        Chỉ số {sortKey==='label' ? (sortDirection==='asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" on:click={() => handleSort('value')}>
                        Thực hiện {sortKey==='value' ? (sortDirection==='asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" on:click={() => handleSort('average')}>
                        Trung bình {sortKey==='average' ? (sortDirection==='asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="px-3 py-2 text-right font-semibold text-gray-600">Đánh giá</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                {#each sortedData as row}
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3 py-2 font-medium text-gray-700">{row.label}</td>
                        <td class="px-3 py-2 text-right font-bold text-gray-900 {row.valueClass || ''}">{row.value}</td>
                        <td class="px-3 py-2 text-right text-gray-500 italic">{row.average}</td>
                        <td class="px-3 py-2 text-right">
                            <EvaluationBadge isAbove={isAboveAverage(row.rawValue, row.rawAverage)} />
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>