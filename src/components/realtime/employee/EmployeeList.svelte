<script>
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store'; 
  import { formatters } from '../../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../../utils.js';
  import { kpiStore, realtimeYCXData } from '../../../stores.js'; 
  import { getCompletionColor } from '../../../utils/kpi.utils.js';

  import { batchCaptureService } from '../../../services/batchCapture.service.js';
  import EmployeeDetail from './EmployeeDetail.svelte';

  export let reportData = [];
  const dispatch = createEventDispatcher();

  let sortKey = 'doanhThuQuyDoi';
  let sortDirection = 'desc';
  let groupedData = {};
  let departmentOrder = [];
  
  $: flatSortedData = [...reportData].sort((a, b) => (Number(b.doanhThuQuyDoi) || 0) - (Number(a.doanhThuQuyDoi) || 0));

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

  $: totalStats = reportData.reduce((acc, item) => {
      acc.doanhThu += Number(item.doanhThu) || 0;
      acc.doanhThuQuyDoi += Number(item.doanhThuQuyDoi) || 0;
      acc.doanhThuTraGop += Number(item.doanhThuTraGop) || 0;
      acc.doanhThuQuyDoiChuaXuat += Number(item.doanhThuQuyDoiChuaXuat) || 0;
      return acc;
  }, { doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0, doanhThuQuyDoiChuaXuat: 0 });
  
  $: totalPctQD = totalStats.doanhThu > 0 ? (totalStats.doanhThuQuyDoi / totalStats.doanhThu) - 1 : 0;
  $: totalPctTC = totalStats.doanhThu > 0 ? (totalStats.doanhThuTraGop / totalStats.doanhThu) : 0;

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  function sortEmployees(employees, key, dir) {
    return [...employees].sort((a, b) => {
      if (key === 'hoTen') {
        const nameA = a.hoTen || '';
        const nameB = b.hoTen || '';
        return dir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
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

  function getRowStyle(index, totalCount) {
      const topCount = totalCount <= 15 ? 3 : 5;
      if (index === 0) return 'bg-yellow-50/80 hover:bg-yellow-100'; 
      if (index === 1) return 'bg-slate-100 hover:bg-slate-200';
      if (index === 2) return 'bg-orange-50/60 hover:bg-orange-100'; 
      if (index < topCount) return 'bg-blue-50/50 hover:bg-blue-100';
      return index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50/50 hover:bg-blue-50';
  }

  function getStickyClass(index, totalCount) {
      const topCount = totalCount <= 15 ? 3 : 5;
      if (index === 0) return 'bg-yellow-50 group-hover:bg-yellow-100'; 
      if (index === 1) return 'bg-slate-100 group-hover:bg-slate-200';
      if (index === 2) return 'bg-orange-50 group-hover:bg-orange-100'; 
      if (index < topCount) return 'bg-blue-50 group-hover:bg-blue-100';
      return index % 2 === 0 ? 'bg-white group-hover:bg-blue-50' : 'bg-slate-50 group-hover:bg-blue-50';
  }

  function getRankIcon(index, totalCount) {
      const topCount = totalCount <= 15 ? 3 : 5;
      if (index === 0) return '🏆';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index < topCount) return '⭐';
      return `#${index + 1}`;
  }

  function handleBatchCapture(event) {
      const mode = event.target.value;
      if (!mode) return;

      let targetData = [];
      if (mode === 'top5') targetData = flatSortedData.slice(0, 5);
      else if (mode === 'bot5') targetData = flatSortedData.slice(-5);
      else if (mode === 'all') targetData = flatSortedData;

      const currentYcx = get(realtimeYCXData);

      batchCaptureService.captureBatch(
          EmployeeDetail, 
          targetData, 
          "DT_Realtime", 
          (empObj) => ({ employee: empObj, injectedYcxData: currentYcx }) 
      );

      event.target.value = ""; 
  }
</script>

<!-- [SURGICAL LOGIC]: Tiêm data-capture-filename="DT NV Real" vào thẻ cha để ép tên ảnh -->
<div class="space-y-6" id="realtime-revenue-table-wrapper" data-capture-group="realtime-revenue-table" data-capture-filename="DT NV Real">

  <div class="action-toolbar flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
      <div class="text-sm font-bold text-gray-700 flex items-center gap-2">
          <i data-feather="list" class="w-4 h-4"></i> Danh sách theo bộ phận
      </div>
      <div class="relative flex items-center">
          <div class="absolute left-3 text-blue-600 pointer-events-none flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          </div>
          <select class="text-sm font-bold text-gray-700 bg-gray-50 border border-gray-300 rounded-lg shadow-sm py-2 pl-9 pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  on:change={handleBatchCapture}>
              <option value="" disabled selected>Chụp Hàng Loạt</option>
              <option value="top5">Chụp Top 5 NV (DTQĐ)</option>
              <option value="bot5">Chụp Bot 5 NV (DTQĐ)</option>
              <option value="all">Chụp Tất Cả</option>
          </select>
      </div>
  </div>

  <div class="flex flex-col gap-8">
    {#each departmentOrder as deptName, dIndex}
      {#if groupedData[deptName]}
        {@const deptTotal = groupedData[deptName].length}
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b {getHeaderDeptClass(deptName)}">
            <h4 class="text-lg font-bold uppercase">{deptName}</h4>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-gray-600 table-bordered">
              <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-20 shadow-sm">
                <tr>
                  <th class="p-0 text-center sticky left-0 bg-slate-200 z-30 select-none border-r border-slate-300 whitespace-nowrap">
                    <div class="w-[50px] max-w-[50px] overflow-hidden mx-auto py-3">Hạng</div>
                  </th>
                  
                  <th class="px-4 py-3 cursor-pointer hover:bg-slate-300 transition sticky left-[50px] bg-slate-200 z-30 select-none border-r border-slate-300 min-w-[160px] whitespace-nowrap" on:click={() => handleSort('hoTen')}>
                    <div class="flex items-center gap-1">
                      <span>Nhân viên</span>
                      <svg class="w-3 h-3 flex-shrink-0 {sortKey === 'hoTen' ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-50'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    { id: 'doanhThuQuyDoiChuaXuat', label: 'DTQĐ Chưa xuất', group: 'bg-yellow-50 text-yellow-800' }
                  ] as col, i}
                    <th class="px-2 py-3 cursor-pointer hover:opacity-80 transition select-none {col.group} min-w-[95px] max-w-[110px] {i === 5 ? 'pr-6' : ''}" on:click={() => handleSort(col.id)}>
                      <div class="flex items-center justify-end gap-1">
                        <span class="text-right leading-relaxed whitespace-normal pb-0.5">{col.label}</span>
                        <svg class="w-3 h-3 flex-shrink-0 {sortKey === col.id ? 'opacity-100' : 'opacity-40'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="{sortKey === col.id ? 3 : 2}" d="{sortKey === col.id && sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}" />
                        </svg>
                      </div>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each sortEmployees(groupedData[deptName], sortKey, sortDirection) as item, index (item.maNV)}
                  {@const userTarget = $kpiStore.targets[item.maNV] || $kpiStore.globalSettings}
                  {@const targetQD = (userTarget?.phanTramQD || 0) / 100}
                  {@const targetTC = (userTarget?.phanTramTC || 0) / 100}
                  {@const qdClass = getCompletionColor(item.hieuQuaQuyDoi, targetQD)}
                  {@const tcClass = getCompletionColor(item.tyLeTraCham, targetTC)}
                  
                  <tr class="transition cursor-pointer interactive-row group {getRowStyle(index, deptTotal)}" on:click={() => dispatch('viewDetail', { employeeId: item.maNV })}>
                    
                    <td class="p-0 text-center font-bold sticky left-0 z-10 border-r border-gray-200 transition-colors {getStickyClass(index, deptTotal)} {index <= 2 ? 'text-lg' : 'text-sm text-slate-400'} whitespace-nowrap">
                        <div class="w-[50px] max-w-[50px] overflow-hidden mx-auto py-3">
                           {getRankIcon(index, deptTotal)}
                        </div>
                    </td>

                    <td class="px-4 py-3 font-semibold text-blue-600 sticky left-[50px] z-10 border-r border-gray-200 transition-colors whitespace-nowrap {getStickyClass(index, deptTotal)}">
                      <span class="leading-relaxed">{formatters.getShortEmployeeName(item.hoTen, item.maNV)}</span>
                    </td>
                    
                    <td class="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatters.formatRevenue(item.doanhThu)}</td>
                    <td class="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td>
                    <td class="px-3 py-3 text-right font-bold {qdClass} whitespace-nowrap">{formatters.formatPercentage(item.hieuQuaQuyDoi)}</td>
                    <td class="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatters.formatRevenue(item.doanhThuTraGop)}</td>
                    <td class="px-3 py-3 text-right font-bold {tcClass} whitespace-nowrap">{formatters.formatPercentage(item.tyLeTraCham)}</td>
                    <td class="px-3 py-3 pr-6 text-right font-bold text-gray-500 whitespace-nowrap">{formatters.formatRevenue(item.doanhThuQuyDoiChuaXuat)}</td>
                  </tr>
                {/each}
              </tbody>

              {#if dIndex === departmentOrder.length - 1}
              <tfoot class="bg-gray-100 font-bold text-gray-900 text-xs uppercase border-t-[3px] border-gray-300">
                <tr>
                  <td class="p-0 border-r border-gray-300 text-center tracking-wider whitespace-nowrap sticky left-0 z-20 bg-gray-100">
                      <div class="w-[50px] max-w-[50px] overflow-hidden mx-auto py-3 text-gray-900">TỔNG</div>
                  </td>
                  <td class="px-4 py-3 border-r border-gray-300 text-center tracking-wider min-w-[160px] whitespace-nowrap sticky left-[50px] z-20 bg-gray-100">CỘNG</td>
                  
                  <td class="px-3 py-3 text-right text-base min-w-[95px] max-w-[110px] whitespace-nowrap">{formatters.formatRevenue(totalStats.doanhThu)}</td>
                  <td class="px-3 py-3 text-right text-base text-blue-700 min-w-[95px] max-w-[110px] whitespace-nowrap">{formatters.formatRevenue(totalStats.doanhThuQuyDoi)}</td>
                  <td class="px-3 py-3 text-right text-base text-blue-700 min-w-[95px] max-w-[110px] whitespace-nowrap">{formatters.formatPercentage(totalPctQD)}</td>
                  <td class="px-3 py-3 text-right text-base min-w-[95px] max-w-[110px] whitespace-nowrap">{formatters.formatRevenue(totalStats.doanhThuTraGop)}</td>
                  <td class="px-3 py-3 text-right text-base min-w-[95px] max-w-[110px] whitespace-nowrap">{formatters.formatPercentage(totalPctTC)}</td>
                  <td class="px-3 py-3 pr-6 text-right text-base text-gray-600 min-w-[95px] max-w-[110px] whitespace-nowrap">{formatters.formatRevenue(totalStats.doanhThuQuyDoiChuaXuat)}</td>
                </tr>
              </tfoot>
              {/if}

            </table>
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
    /* 1. Tàng hình toolbar */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] .action-toolbar) {
        display: none !important;
    }

    /* 2. ÁO GIÁP BẢO VỆ HTML2CANVAS */
    :global(.capture-container [data-capture-group="realtime-revenue-table"]) {
        width: fit-content !important;
        min-width: fit-content !important;
        max-width: fit-content !important;
        margin: 0 auto !important;
        background-color: transparent !important;
        overflow: visible !important;
    }

    /* 3. Mở khóa div bao quanh */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] .bg-white.rounded-xl),
    :global(.capture-container [data-capture-group="realtime-revenue-table"] .overflow-x-auto) {
        width: max-content !important;
        min-width: max-content !important;
        max-width: max-content !important;
        overflow: visible !important;
    }

    /* 4. Định dạng Bảng */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] table) {
        width: max-content !important;
        min-width: max-content !important;
        max-width: max-content !important;
        table-layout: auto !important;
        background-color: #ffffff !important;
        overflow: visible !important;
    }

    /* 5. Khóa cứng 2 cột đầu tiên (Gọt cho gọn lại 1 xíu so với bản cũ) */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] table th:nth-child(1)),
    :global(.capture-container [data-capture-group="realtime-revenue-table"] table td:nth-child(1)) { 
        width: 45px !important; 
        min-width: 45px !important;
        max-width: 45px !important;
    } 
    :global(.capture-container [data-capture-group="realtime-revenue-table"] table th:nth-child(2)),
    :global(.capture-container [data-capture-group="realtime-revenue-table"] table td:nth-child(2)) { 
        width: 175px !important; 
        min-width: 175px !important;
        max-width: 175px !important;
    } 

    /* ========================================================
       6. [PHẪU THUẬT ÉP MỎNG]: Thu gọn chiều cao dòng, tăng size chữ
       ======================================================== */
    
    /* Gọt bớt header */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] th) {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
    }

    /* Gọt sạch padding của các ô dữ liệu, trả height về tự động */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] td) {
        white-space: nowrap !important;
        height: auto !important; /* Xóa bỏ giới hạn 40px cũ */
        padding-top: 4px !important; /* Gọt cực mỏng khoảng cách trên/dưới */
        padding-bottom: 4px !important;
        font-size: 13.5px !important; /* Tăng nhẹ font chữ để chữ to rõ và cân đối hơn */
    }

    /* Vô hiệu hóa triệt để class py-3 (padding 12px) của Tailwind nằm trong các thẻ div (như icon Hạng) */
    :global(.capture-container [data-capture-group="realtime-revenue-table"] td > div) {
        padding-top: 2px !important;
        padding-bottom: 2px !important;
        height: auto !important;
    }
</style>