<script>
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import EvaluationBadge from '../shared/EvaluationBadge.svelte';
  import CardFilter from './CardFilter.svelte';

  export let title = '';
  export let icon = '';
  export let colorClass = 'sknv-header-blue';
  export let data = []; // Array of metrics { id, label, value, average, ... }
  export let allowAdd = false; // Cho phép thêm mới (chỉ cho Đơn giá/Hiệu quả)

  const dispatch = createEventDispatcher();

  let sortKey = 'label';
  let sortDirection = 'asc';
  
  // Trạng thái hiển thị cục bộ (Map id -> boolean)
  let visibilityState = {};

  // Khởi tạo visibility mặc định là true cho tất cả item mới
  $: {
      if(data) {
          data.forEach(item => {
              if (visibilityState[item.id] === undefined) {
                  visibilityState[item.id] = true;
              }
          });
          // Tính toán lại ngay khi data thay đổi
          calculateAndEmitCount();
      }
  }

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
  }

  function handleFilterChange(event) {
      const id = event.detail;
      // Toggle visibility
      visibilityState[id] = !visibilityState[id];
      // Force update UI & recalculate count
      visibilityState = { ...visibilityState }; 
      calculateAndEmitCount();
  }

  function calculateAndEmitCount() {
      // Lọc các item đang hiển thị
      const visibleItems = data.filter(item => visibilityState[item.id] !== false);
      
      // Đếm số lượng đạt chỉ tiêu (Trên TB)
      const aboveCount = visibleItems.filter(item => isAboveAverage(item.rawValue, item.rawAverage)).length;
      const totalCount = visibleItems.length;

      // Gửi sự kiện lên cha (DetailView) để cập nhật Header
      dispatch('updateCount', { title, above: aboveCount, total: totalCount });
  }

  function isAboveAverage(val, avg) {
      if (!isFinite(val) || avg === undefined || !isFinite(avg)) return false;
      return val >= avg;
  }

  // Lọc và Sắp xếp dữ liệu hiển thị
  $: sortedData = [...data]
      .filter(item => visibilityState[item.id] !== false)
      .sort((a, b) => {
          let valA, valB;
          if (sortKey === 'label') {
              valA = a.label || ''; valB = b.label || '';
              return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          } else if (sortKey === 'value') {
              valA = a.rawValue || 0; valB = b.rawValue || 0;
          } else {
              valA = a.rawAverage || 0; valB = b.rawAverage || 0;
          }
          return sortDirection === 'asc' ? valA - valB : valB - valA;
      });

  afterUpdate(() => {
      if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden h-full flex flex-col">
    <div class="sknv-detail-card-header {colorClass} flex justify-between items-center p-3 text-white">
        <div class="flex items-center gap-2">
            <i data-feather={icon} class="w-5 h-5"></i>
            <h4 class="text-lg font-bold">{title}</h4>
        </div>
        
        <div class="flex items-center gap-1">
            {#if allowAdd}
                <button 
                    class="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-full transition-colors"
                    title="Thêm chỉ số mới"
                    on:click={() => dispatch('add')}
                >
                    <i data-feather="plus" class="w-4 h-4"></i>
                </button>
            {/if}
            
            <CardFilter 
                items={data.map(i => ({ id: i.id, label: i.label, visible: visibilityState[i.id] !== false }))} 
                on:change={handleFilterChange} 
            />
        </div>
    </div>
    
    <div class="overflow-x-auto flex-grow">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" on:click={() => handleSort('label')}>
                        Chỉ số {sortKey==='label' ? (sortDirection==='asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" on:click={() => handleSort('value')}>
                        Thực hiện {sortKey==='value' ? (sortDirection==='asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" on:click={() => handleSort('average')}>
                        Trung bình {sortKey==='average' ? (sortDirection==='asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="px-3 py-2 text-right font-semibold text-gray-600">Đánh giá</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                {#if sortedData.length === 0}
                    <tr><td colspan="4" class="p-4 text-center text-gray-400 italic text-xs">Đã ẩn tất cả chỉ số.</td></tr>
                {:else}
                    {#each sortedData as row (row.id)}
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-3 py-2 font-medium text-gray-700 flex items-center gap-1">
                                {row.label}
                                {#if row.isCustom}
                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Mới</span>
                                {/if}
                            </td>
                            <td class="px-3 py-2 text-right font-bold text-gray-900 {row.valueClass || ''}">{row.value}</td>
                            <td class="px-3 py-2 text-right text-gray-500 italic">{row.average}</td>
                            <td class="px-3 py-2 text-right">
                                <EvaluationBadge isAbove={isAboveAverage(row.rawValue, row.rawAverage)} />
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>