<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../utils.js';

  export let reportData = [];

  const dispatch = createEventDispatcher();

  let sortKey = 'doanhThu';
  let sortDirection = 'desc';
  let groupedData = {};
  let departmentOrder = [];

  $: {
    groupedData = {};
    reportData.forEach(item => {
      const dept = item.boPhan || 'Khác';
      if (!groupedData[dept]) groupedData[dept] = [];
      groupedData[dept].push(item);
    });
    departmentOrder = getSortedDepartmentList(reportData);
  }

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  function getSortClass(key) {
    if (sortKey === key) {
      return sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc';
    }
    return '';
  }

  function sortEmployees(employees) {
    return [...employees].sort((a, b) => {
      let valA = a[sortKey] || 0;
      let valB = b[sortKey] || 0;
      if (sortKey === 'hoTen') {
        valA = a.hoTen || '';
        valB = b.hoTen || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }

  function onViewDetail(employeeId) {
    dispatch('viewDetail', { employeeId });
  }

  function getHeaderDeptClass(deptName) {
    if (deptName.includes('Tư Vấn')) return 'department-header-tv';
    if (deptName.includes('Kho')) return 'department-header-kho';
    if (deptName.includes('Trang Trí')) return 'department-header-tt';
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
            <thead class="text-xs text-slate-800 uppercase font-bold sticky top-0 z-20">
              <tr>
                <th class="px-4 py-3 cursor-pointer bg-slate-200 z-30 min-w-[200px] sortable {getSortClass('hoTen')}" on:click={() => handleSort('hoTen')}>
                  Nhân viên <span class="sort-indicator"></span>
                </th>
                
                <th class="px-4 py-3 text-right cursor-pointer header-group-4 sortable {getSortClass('doanhThu')}" on:click={() => handleSort('doanhThu')}>
                  DT Thực <span class="sort-indicator"></span>
                </th>
                <th class="px-4 py-3 text-right cursor-pointer header-group-4 sortable {getSortClass('doanhThuQuyDoi')}" on:click={() => handleSort('doanhThuQuyDoi')}>
                  DT QĐ <span class="sort-indicator"></span>
                </th>
                <th class="px-4 py-3 text-right cursor-pointer header-group-4 sortable {getSortClass('hieuQuaQuyDoi')}" on:click={() => handleSort('hieuQuaQuyDoi')}>
                  % QĐ <span class="sort-indicator"></span>
                </th>

                <th class="px-4 py-3 text-right cursor-pointer header-group-5 sortable {getSortClass('doanhThuTraGop')}" on:click={() => handleSort('doanhThuTraGop')}>
                  DT Trả chậm <span class="sort-indicator"></span>
                </th>
                <th class="px-4 py-3 text-right cursor-pointer header-group-5 sortable {getSortClass('tyLeTraCham')}" on:click={() => handleSort('tyLeTraCham')}>
                  % Trả chậm <span class="sort-indicator"></span>
                </th>

                <th class="px-4 py-3 text-right cursor-pointer header-group-6 sortable {getSortClass('doanhThuChuaXuat')}" on:click={() => handleSort('doanhThuChuaXuat')}>
                  DT Chưa xuất <span class="sort-indicator"></span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each sortEmployees(groupedData[deptName]) as item (item.maNV)}
                {@const qdClass = (item.mucTieu && item.hieuQuaQuyDoi < (item.mucTieu.phanTramQD / 100)) ? 'cell-performance is-below' : 'text-green-600'}
                {@const tcClass = (item.mucTieu && item.tyLeTraCham < (item.mucTieu.phanTramTC / 100)) ? 'cell-performance is-below' : ''}
                
                <tr class="hover:bg-blue-50 transition cursor-pointer interactive-row" on:click={() => onViewDetail(item.maNV)}>
                  <td class="px-4 py-2 font-semibold text-blue-600 sticky left-0 bg-white hover:bg-blue-50 z-10 border-r border-gray-200 employee-name-cell">
                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                  </td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900">
                    {formatters.formatRevenue(item.doanhThu)}
                  </td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900">
                    {formatters.formatRevenue(item.doanhThuQuyDoi)}
                  </td>
                  <td class="px-4 py-2 text-right font-bold {qdClass}">
                    {formatters.formatPercentage(item.hieuQuaQuyDoi)}
                  </td>
                  <td class="px-4 py-2 text-right font-medium">
                    {formatters.formatRevenue(item.doanhThuTraGop)}
                  </td>
                  <td class="px-4 py-2 text-right font-medium {tcClass}">
                    {formatters.formatPercentage(item.tyLeTraCham)}
                  </td>
                  <td class="px-4 py-2 text-right font-medium text-gray-500">
                    {formatters.formatRevenue(item.doanhThuChuaXuat)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/each}
</div>