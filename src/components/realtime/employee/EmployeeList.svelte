<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../../utils.js';

  export let reportData = [];
  const dispatch = createEventDispatcher();

  let sortKey = 'doanhThu';
  let sortDirection = 'desc';
  let groupedData = {};
  let departmentOrder = [];

  // Reactive statement để nhóm dữ liệu
  $: {
      groupedData = {};
      if (reportData && reportData.length > 0) {
          reportData.forEach(item => {
            const dept = item.boPhan || 'Khác';
            if (!groupedData[dept]) groupedData[dept] = [];
            groupedData[dept].push(item);
          });
          departmentOrder = getSortedDepartmentList(reportData);
      } else {
          departmentOrder = [];
      }
  }

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  // SỬA LỖI: Thêm tham số key và dir vào hàm để Svelte nhận biết sự thay đổi
  function sortEmployees(employees, key, dir) {
    return [...employees].sort((a, b) => {
      if (key === 'hoTen') {
        const nameA = a.hoTen || '';
        const nameB = b.hoTen || '';
        return dir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      
      // Ép kiểu số an toàn
      let valA = Number(a[key]) || 0;
      let valB = Number(b[key]) || 0;
      
      return dir === 'asc' ? valA - valB : valB - valA;
    });
  }

  function getHeaderDeptClass(deptName) {
    if (deptName.includes('Tư Vấn')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (deptName.includes('Kho')) return 'bg-green-100 text-green-800 border-green-200';
    if (deptName.includes('Trang Trí')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
</script>

<div class="space-y-8">
  {#each departmentOrder as deptName}
    {#if groupedData[deptName]}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-4 border-b {getHeaderDeptClass(deptName)}">
          <h4 class="text-lg font-bold uppercase">{deptName}</h4>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm text-left text-gray-600 table-bordered">
            <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-20 shadow-sm">
              <tr>
                <th class="px-4 py-3 cursor-pointer hover:bg-slate-300 transition sticky left-0 bg-slate-200 z-30 min-w-[180px] select-none" on:click={() => handleSort('hoTen')}>
                  <div class="flex items-center gap-1">
                    <span>Nhân viên</span>
                     <svg class="w-3 h-3 {sortKey === 'hoTen' ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-50'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="{sortKey === 'hoTen' && sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}" />
                    </svg>
                  </div>
                </th>
                
                {#each [
                  { id: 'doanhThu', label: 'DT Thực', group: 'bg-blue-50 text-blue-800' },
                  { id: 'doanhThuQuyDoi', label: 'DT QĐ', group: 'bg-blue-50 text-blue-800' },
                  { id: 'hieuQuaQuyDoi', label: '% QĐ', group: 'bg-blue-50 text-blue-800' },
                  { id: 'doanhThuTraGop', label: 'DT Trả chậm', group: 'bg-green-50 text-green-800' },
                  { id: 'tyLeTraCham', label: '% Trả chậm', group: 'bg-green-50 text-green-800' },
                  { id: 'doanhThuChuaXuat', label: 'DT Chưa xuất', group: 'bg-yellow-50 text-yellow-800' }
                ] as col}
                  <th class="px-4 py-3 cursor-pointer hover:opacity-80 transition select-none {col.group}" on:click={() => handleSort(col.id)}>
                    <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                      <span>{col.label}</span>
                      <svg class="w-3 h-3 {sortKey === col.id ? 'opacity-100' : 'opacity-40'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="{sortKey === col.id ? 3 : 2}" d="{sortKey === col.id && sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}" />
                      </svg>
                    </div>
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each sortEmployees(groupedData[deptName], sortKey, sortDirection) as item (item.maNV)}
                {@const qdClass = (item.mucTieu && item.hieuQuaQuyDoi < (item.mucTieu.phanTramQD / 100)) ? 'text-red-600 bg-red-50' : 'text-green-600'}
                {@const tcClass = (item.mucTieu && item.tyLeTraCham < (item.mucTieu.phanTramTC / 100)) ? 'text-red-600 bg-red-50' : ''}
                 
                <tr class="hover:bg-blue-50 transition cursor-pointer interactive-row" on:click={() => dispatch('viewDetail', { employeeId: item.maNV })}>
                  <td class="px-4 py-2 font-semibold text-blue-600 sticky left-0 bg-white hover:bg-blue-50 z-10 border-r border-gray-200">
                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                  </td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900">{formatters.formatRevenue(item.doanhThu)}</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td>
                  <td class="px-4 py-2 text-right font-bold {qdClass}">{formatters.formatPercentage(item.hieuQuaQuyDoi)}</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900">{formatters.formatRevenue(item.doanhThuTraGop)}</td>
                  <td class="px-4 py-2 text-right font-bold {tcClass}">{formatters.formatPercentage(item.tyLeTraCham)}</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-500">{formatters.formatRevenue(item.doanhThuChuaXuat)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/each}
</div>