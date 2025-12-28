<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { kpiStore } from '../../stores.js';
  import { getCompletionColor } from '../../utils/kpi.utils.js';
  
  export let reportData = [];

  // [LOGGER] Theo dõi dữ liệu đầu vào
  $: {
      console.log(`[RevenueTable ${new Date().toLocaleTimeString()}] Store Value:`, $kpiStore);
      console.log(`[RevenueTable] Report Data Length:`, reportData.length);
  }

  const dispatch = createEventDispatcher();
  let sortKey = 'doanhThu';
  let sortDirection = 'desc';

  // [CẤU HÌNH] Cập nhật cột cuối cùng thành DTQĐ Chưa Xuất
  const columns = [
      { key: 'hoTen', label: 'Nhân viên', align: 'left', headerClass: 'bg-gray-100 text-gray-700' },
      // [STYLE FIX] Đổi border-blue-200 để khớp tông màu header xanh
      { key: 'doanhThu', label: 'DT Thực', align: 'right', headerClass: 'bg-blue-100 text-blue-800 border-l border-blue-200' },
      { key: 'doanhThuQuyDoi', label: 'DT Quy Đổi', align: 'right', headerClass: 'bg-blue-100 text-blue-800' },
      { key: 'hieuQuaQuyDoi', label: '% QĐ', align: 'right', headerClass: 'bg-blue-100 text-blue-800' },
      // [STYLE FIX] Đổi border-green-200
      { key: 'doanhThuTraGop', label: 'DT Trả chậm', align: 'right', headerClass: 'bg-green-100 text-green-800 border-l border-green-200' },
      { key: 'tyLeTraCham', label: '% Trả chậm', align: 'right', headerClass: 'bg-green-100 text-green-800' },
      // [FIX] Hiển thị DTQĐ Chưa Xuất thay vì DT Thực
      { key: 'doanhThuQuyDoiChuaXuat', label: 'DTQĐ Chưa Xuất', align: 'right', headerClass: 'bg-yellow-50 text-yellow-800 border-l border-yellow-200' }
  ];

  function handleSort(key) {
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  $: sortedData = [...reportData].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      return sortDirection === 'asc' ? (Number(valA)||0) - (Number(valB)||0) : (Number(valB)||0) - (Number(valA)||0);
  });

  // [FIX] Cập nhật logic tính tổng cho cột mới
  $: totals = reportData.reduce((acc, item) => {
      acc.doanhThu += item.doanhThu || 0;
      acc.doanhThuQuyDoi += item.doanhThuQuyDoi || 0;
      acc.doanhThuTraGop += item.doanhThuTraGop || 0;
      acc.doanhThuQuyDoiChuaXuat += item.doanhThuQuyDoiChuaXuat || 0;
      return acc;
  }, { doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0, doanhThuQuyDoiChuaXuat: 0 });

  $: totalPctQD = totals.doanhThu > 0 ? (totals.doanhThuQuyDoi / totals.doanhThu) - 1 : 0;
  $: totalPctTC = totals.doanhThu > 0 ? totals.doanhThuTraGop / totals.doanhThu : 0;

  function getCellClass(item, colKey) {
      // [FIX] Thêm key mới vào danh sách in đậm
      const isBoldCol = ['doanhThu', 'doanhThuQuyDoi', 'doanhThuTraGop', 'doanhThuQuyDoiChuaXuat', 'hieuQuaQuyDoi', 'tyLeTraCham'].includes(colKey);
      let baseClass = isBoldCol ? 'font-bold text-gray-800' : 'text-gray-600';

      const userTarget = $kpiStore.targets[item.maNV];
      const targetSettings = userTarget || $kpiStore.globalSettings;

      if (!targetSettings || Object.keys(targetSettings).length === 0) {
          return baseClass;
      }

      if (colKey === 'hieuQuaQuyDoi') {
          const actual = item.hieuQuaQuyDoi;
          const target = (targetSettings.phanTramQD || 0) / 100; 
          const colorClass = getCompletionColor(actual, target);
          return colorClass ? `${colorClass} font-bold` : baseClass;
      }
      
      if (colKey === 'tyLeTraCham') {
          const actual = item.tyLeTraCham;
          const target = (targetSettings.phanTramTC || 0) / 100;
          const colorClass = getCompletionColor(actual, target);
          return colorClass ? `${colorClass} font-bold` : baseClass;
      }

      return baseClass;
  }

  function handleRowClick(employeeId) {
      dispatch('viewDetail', { employeeId });
  }
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mt-6 animate-fade-in" data-capture-group="revenue-table">
    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div class="flex items-center gap-2">
            <div class="p-2 bg-blue-100 rounded-lg text-blue-600"><i data-feather="dollar-sign" class="w-5 h-5"></i></div>
            <div>
                <h3 class="font-bold text-gray-800 text-lg uppercase">Chi tiết Doanh Thu Lũy Kế</h3>
                <p class="text-xs text-gray-500">Dữ liệu được cập nhật từ file YCX mới nhất</p>
            </div>
        </div>
        <span class="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">Đơn vị: Triệu</span>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full text-sm text-left border-collapse">
            <thead class="uppercase text-xs font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                    {#each columns as col}
                        <th class="px-4 py-3 cursor-pointer transition select-none whitespace-nowrap {col.headerClass} {col.align === 'right' ? 'text-right' : 'text-left'}" on:click={() => handleSort(col.key)}>
                            <div class="flex items-center gap-1 {col.align === 'right' ? 'justify-end' : ''}">
                                {col.label}
                                {#if sortKey === col.key}<span class="ml-1 text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                            </div>
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                {#if sortedData.length === 0}
                    <tr><td colspan={columns.length} class="p-12 text-center text-gray-400 italic bg-gray-50">Chưa có dữ liệu hiển thị.</td></tr>
                {:else}
                    {#each sortedData as item, index (item.maNV)}
                        <tr class="hover:bg-blue-50 transition-colors duration-150 group cursor-pointer {index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}" on:click={() => handleRowClick(item.maNV)}>
                            <td class="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap border-r border-gray-200 group-hover:text-blue-800 group-hover:underline">
                                {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                            </td>
                            <td class="px-4 py-3 text-right border-r border-gray-200 {getCellClass(item, 'doanhThu')}">{formatters.formatRevenue(item.doanhThu)}</td>
                            <td class="px-4 py-3 text-right {getCellClass(item, 'doanhThuQuyDoi')}">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td>
                            <td class="px-4 py-3 text-right {getCellClass(item, 'hieuQuaQuyDoi')}">{formatters.formatPercentage(item.hieuQuaQuyDoi)}</td>
                            <td class="px-4 py-3 text-right border-l border-gray-200 {getCellClass(item, 'doanhThuTraGop')}">{formatters.formatRevenue(item.doanhThuTraGop)}</td>
                            <td class="px-4 py-3 text-right {getCellClass(item, 'tyLeTraCham')}">{formatters.formatPercentage(item.tyLeTraCham)}</td>
                            
                            <td class="px-4 py-3 text-right border-l border-gray-200 {getCellClass(item, 'doanhThuQuyDoiChuaXuat')}">{formatters.formatRevenue(item.doanhThuQuyDoiChuaXuat)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
            <tfoot class="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300 text-xs uppercase">
                <tr>
                    <td class="px-4 py-3">TỔNG CỘNG</td>
                    <td class="px-4 py-3 text-right text-base">{formatters.formatRevenue(totals.doanhThu)}</td>
                    <td class="px-4 py-3 text-right text-base text-blue-700">{formatters.formatRevenue(totals.doanhThuQuyDoi)}</td>
                    <td class="px-4 py-3 text-right text-base text-blue-700">{formatters.formatPercentage(totalPctQD)}</td>
                    <td class="px-4 py-3 text-right text-base">{formatters.formatRevenue(totals.doanhThuTraGop)}</td>
                    <td class="px-4 py-3 text-right text-base">{formatters.formatPercentage(totalPctTC)}</td>
                    <td class="px-4 py-3 text-right text-base text-gray-600">{formatters.formatRevenue(totals.doanhThuQuyDoiChuaXuat)}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>
<style>.animate-fade-in { animation: fadeIn 0.4s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }</style>