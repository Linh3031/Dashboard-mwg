<script>
  import { formatters } from '../../../utils/formatters.js';
  // Import component mới
  import SortableTh from '../../common/SortableTh.svelte';

  export let viewType = 'brand'; // 'brand' hoặc 'employee'
  export let reportData = [];

  let sortKey = 'revenue';
  let sortDirection = 'desc';

  // Reset sort khi đổi chế độ xem
  $: if (viewType) {
      sortKey = 'revenue';
      sortDirection = 'desc';
  }

  // Hàm xử lý sự kiện sort từ component con
  function handleSort(event) {
    const key = event.detail; // Nhận key từ dispatch('sort', key)
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  // Hàm sort dữ liệu
  function sortData(items, key, dir) {
      return [...items].sort((a, b) => {
          // Sort chữ
          if (key === 'name') {
             const valA = a.name || '';
             const valB = b.name || '';
             return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          // Sort số
          let valA = Number(a[key]) || 0;
          let valB = Number(b[key]) || 0;
          return dir === 'asc' ? valA - valB : valB - valA;
      });
  }

  // Cấu hình cột cho từng chế độ xem
  $: columns = viewType === 'brand' 
    ? [
        { id: 'name', label: 'Hãng', align: 'left' },
        { id: 'quantity', label: 'Số lượng', align: 'right' },
        { id: 'revenue', label: 'Doanh thu', align: 'right' },
        { id: 'avgPrice', label: 'Đơn giá TB', align: 'right' }
      ]
    : [
        { id: 'name', label: 'Nhân viên', align: 'left' },
        { id: 'quantity', label: 'Số lượng', align: 'right' },
        { id: 'revenue', label: 'Doanh thu', align: 'right' }
    ];
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
  <div class="p-4 border-b bg-gray-50 border-gray-200 flex justify-between items-center">
      <h4 class="text-lg font-bold uppercase text-gray-700">
          {viewType === 'brand' ? 'Thống kê theo Hãng' : 'Thống kê theo Nhân viên'}
      </h4>
  </div>

  <div class="overflow-x-auto">
    <table class="min-w-full text-sm text-left text-gray-600 table-bordered">
      <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-20 shadow-sm">
        <tr>
          {#each columns as col}
            <SortableTh 
              key={col.id}
              label={col.label}
              align={col.align}
              {sortKey}
              {sortDirection}
              on:sort={handleSort} 
            />
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#if reportData.length === 0}
            <tr><td colspan={columns.length} class="p-4 text-center text-gray-500 italic">Không có dữ liệu.</td></tr>
        {:else}
            {#each sortData(reportData, sortKey, sortDirection) as item}
              <tr class="hover:bg-blue-50 transition">
                <td class="px-4 py-2 font-semibold text-blue-600 {viewType === 'employee' ? 'sticky left-0 bg-white hover:bg-blue-50 z-10 border-r' : ''}">
                  {item.name}
                </td>
                <td class="px-4 py-2 text-right font-bold text-gray-900">{formatters.formatNumber(item.quantity)}</td>
                <td class="px-4 py-2 text-right font-bold text-gray-900">{formatters.formatRevenue(item.revenue)}</td>
                {#if viewType === 'brand'}
                    <td class="px-4 py-2 text-right font-bold text-green-600">{formatters.formatRevenue(item.avgPrice)}</td>
                {/if}
              </tr>
            {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>