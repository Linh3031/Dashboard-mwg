<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { kpiStore, ycxDataThangTruoc } from '../../stores.js';
  import { getCompletionColor } from '../../utils/kpi.utils.js';
  import { batchCaptureService } from '../../services/batchCapture.service.js';
  import RevenueDetailView from './revenue/RevenueDetailView.svelte';
  import { dataProcessing } from '../../services/dataProcessing.js';
  
  export let reportData = [];

  const dispatch = createEventDispatcher();
  
  // --- THỜI GIAN ĐỂ TÍNH DỰ KIẾN ---
  let currentDay = 1;
  let daysInMonth = 30;

  $: {
      const today = new Date();
      const d = today.getDate();
      if (d === 1) {
          const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          currentDay = lastMonth.getDate(); 
          daysInMonth = lastMonth.getDate();
      } else {
          currentDay = Math.max(d - 1, 1);
          daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      }
  }

  // --- TỔNG HỢP DATA CÙNG KỲ (THÁNG TRƯỚC) ---
  $: lastMonthDataMap = (() => {
      const map = {};
      const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
      ($ycxDataThangTruoc || []).forEach(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          if (!msnvMatch) return;
          const maNV = msnvMatch[1].trim();
          
          const hinhThucXuat = row.hinhThucXuat;
          const trangThaiXuat = (row.trangThaiXuat || '').trim();
          const isBaseValid = (row.trangThaiThuTien || '').trim() === 'Đã thu' &&
                              (row.trangThaiHuy || '').trim() === 'Chưa hủy' &&
                              (row.tinhTrangTra || '').trim() === 'Chưa trả';
          const isDaXuat = !trangThaiXuat || trangThaiXuat === 'Đã xuất' || trangThaiXuat === 'Đã giao';
          const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(hinhThucXuat);

          if (isDoanhThuHTX && isDaXuat && isBaseValid) {
              map[maNV] = (map[maNV] || 0) + (row.revenueQuyDoi || 0);
          }
      });
      return map;
  })();

  // --- MERGE VÀ TÍNH TOÁN DỰ KIẾN SO CK ---
  $: enrichedReportData = reportData.map(item => {
      const dtqd = item.doanhThuQuyDoi || 0;
      const dtqdCK = lastMonthDataMap[item.maNV] || 0;
      const projectedDTQD = (dtqd / currentDay) * daysInMonth;
      const duKienSoCK = projectedDTQD - dtqdCK;
      
      return {
          ...item,
          dtqdCK,
          duKienSoCK
      };
  });

  // --- QUẢN LÝ CỘT HIỂN THỊ DYNAMIC (CẬP NHẬT MÀU VÀ VIỀN TÁCH KHỐI) ---
  let columnSettings = [
      { key: 'doanhThu', label: 'DT Thực', visible: true, headerClass: 'bg-slate-100 text-slate-800 border-l border-slate-200' },
      { key: 'doanhThuQuyDoi', label: 'DT Quy Đổi', visible: true, headerClass: 'bg-slate-100 text-slate-800' },
      { key: 'hieuQuaQuyDoi', label: '% QĐ', visible: true, headerClass: 'bg-slate-100 text-slate-800' },
      
      // BLOCK CÙNG KỲ: Viền trái đậm (border-l-2), nền xanh dương
      { key: 'dtqdCK', label: 'DTQĐ CÙNG KỲ', visible: true, headerClass: 'bg-blue-100 text-blue-900 border-l-2 border-blue-300 font-black' },
      // BLOCK TĂNG TRƯỞNG: Nền xanh lá nhạt, viền phải đậm (border-r-2) tạo thành 1 cục
      { key: 'duKienSoCK', label: 'DỰ KIẾN SO CK', visible: true, headerClass: 'bg-emerald-100 text-emerald-900 border-r-2 border-emerald-300 font-black' },
      
      { key: 'doanhThuTraGop', label: 'DT Trả chậm', visible: true, headerClass: 'bg-amber-50 text-amber-800 border-l border-amber-200' },
      { key: 'tyLeTraCham', label: '% Trả chậm', visible: true, headerClass: 'bg-amber-50 text-amber-800' },
      { key: 'doanhThuQuyDoiChuaXuat', label: 'DTQĐ Chưa Xuất', visible: true, headerClass: 'bg-gray-50 text-gray-600 border-l border-gray-200' }
  ];

  onMount(() => {
      const saved = localStorage.getItem('sknv_revenue_table_cols_v2');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              columnSettings = columnSettings.map(c => {
                  const s = parsed.find(p => p.key === c.key);
                  return s ? { ...c, visible: s.visible } : c;
              });
          } catch(e){}
      }
  });

  function toggleColumn(key) {
      columnSettings = columnSettings.map(c => c.key === key ? { ...c, visible: !c.visible } : c);
      localStorage.setItem('sknv_revenue_table_cols_v2', JSON.stringify(columnSettings));
  }

  $: visibleColumns = columnSettings.filter(c => c.visible);

  // --- LOGIC SẮP XẾP ---
  let sortKey = 'doanhThuQuyDoi';
  let sortDirection = 'desc';

  function handleSort(key) {
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  $: sortedData = [...enrichedReportData].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      return sortDirection === 'asc' ? (Number(valA)||0) - (Number(valB)||0) : (Number(valB)||0) - (Number(valA)||0);
  });

  $: topCount = sortedData.length <= 15 ? 3 : 5;

  function getRowStyle(index) {
      if (index === 0) return 'bg-yellow-50/80 hover:bg-yellow-100';
      if (index === 1) return 'bg-slate-100 hover:bg-slate-200'; 
      if (index === 2) return 'bg-orange-50/60 hover:bg-orange-100';
      if (index < topCount) return 'bg-blue-50/50 hover:bg-blue-100'; 
      return index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50/50 hover:bg-blue-50';
  }

  function getRankIcon(index) {
      if (index === 0) return '🏆';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index < topCount) return '⭐';
      return `#${index + 1}`;
  }

  $: totals = enrichedReportData.reduce((acc, item) => {
      acc.doanhThu += item.doanhThu || 0;
      acc.doanhThuQuyDoi += item.doanhThuQuyDoi || 0;
      acc.doanhThuTraGop += item.doanhThuTraGop || 0;
      acc.doanhThuQuyDoiChuaXuat += item.doanhThuQuyDoiChuaXuat || 0;
      acc.dtqdCK += item.dtqdCK || 0;
      acc.duKienSoCK += item.duKienSoCK || 0;
      return acc;
  }, { doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0, doanhThuQuyDoiChuaXuat: 0, dtqdCK: 0, duKienSoCK: 0 });

  $: totalPctQD = totals.doanhThu > 0 ? (totals.doanhThuQuyDoi / totals.doanhThu) - 1 : 0;
  $: totalPctTC = totals.doanhThu > 0 ? totals.doanhThuTraGop / totals.doanhThu : 0;

  function getCellClass(item, colKey) {
      const isBoldCol = ['doanhThu', 'doanhThuQuyDoi', 'doanhThuTraGop', 'doanhThuQuyDoiChuaXuat', 'hieuQuaQuyDoi', 'tyLeTraCham'].includes(colKey);
      let baseClass = isBoldCol ? 'font-bold text-gray-800' : 'text-gray-600';

      const userTarget = $kpiStore.targets[item.maNV];
      const targetSettings = userTarget || $kpiStore.globalSettings;
      if (!targetSettings || Object.keys(targetSettings).length === 0) return baseClass;

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

  function handleBatchCapture(event) {
      const mode = event.target.value;
      if (!mode) return;

      let targetData = [];
      if (mode === 'top5') targetData = sortedData.slice(0, 5);
      else if (mode === 'bot5') targetData = sortedData.slice(-5);
      else if (mode === 'all') targetData = sortedData;
      
      const ids = targetData.map(item => item.maNV);
      batchCaptureService.captureBatch(RevenueDetailView, ids, "DTLK_ChiTiet", (id) => ({ employeeId: id }));

      event.target.value = "";
  }
</script>

<div class="space-y-4">
    <details class="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4 capture-hide" style="cursor: pointer;">
        <summary class="text-xs font-bold text-gray-500 uppercase select-none outline-none flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Cấu hình ẩn / hiện cột dữ liệu báo cáo
        </summary>
        <div class="flex flex-wrap gap-2 mt-2.5" on:click|stopPropagation>
            {#each columnSettings as col}
                <button 
                    type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none {col.visible ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}"
                    on:click={() => toggleColumn(col.key)}
                >
                    {col.visible ? '✓ ' : '+ '} {col.label}
                </button>
            {/each}
        </div>
    </details>

    <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fade-in" data-capture-group="revenue-table">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div class="flex items-center gap-2">
                <div class="p-2 bg-blue-100 rounded-lg text-blue-600"><i data-feather="dollar-sign" class="w-5 h-5"></i></div>
                <div>
                    <h3 class="font-bold text-gray-800 text-lg uppercase">Chi tiết Doanh Thu Lũy Kế</h3>
                    <p class="text-xs text-gray-500">Dữ liệu được cập nhật từ file YCX mới nhất</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">Đơn vị: Triệu</span>
                
                <div class="flex items-center gap-2 ml-1 border-l border-gray-300 pl-4" title="Chuyển sang chế độ xem nhiều tháng">
                    <span class="text-xs font-semibold text-gray-500 cursor-pointer" on:click={() => dispatch('toggleMode')}>Xem nhiều tháng</span>
                    <button class="bg-gray-300 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none" on:click={() => dispatch('toggleMode')}>
                        <span class="translate-x-0 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                    </button>
                </div>

                <div class="relative flex items-center border-l border-gray-300 pl-4 ml-1">
                    <div class="absolute left-6 text-blue-600 pointer-events-none flex items-center justify-center">
                        <i data-feather="camera" class="w-4 h-4"></i>
                    </div>
                    <select class="text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm py-1.5 pl-8 pr-6 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                            on:change={handleBatchCapture}>
                        <option value="" disabled selected>Chụp Hàng Loạt</option>
                        <option value="top5">Chụp Top 5 NV</option>
                        <option value="bot5">Chụp Bot 5 NV</option>
                        <option value="all">Chụp Tất Cả</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left border-collapse">
                <thead class="uppercase text-xs font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-4 py-3 transition select-none whitespace-nowrap bg-gray-100 text-gray-700 w-14 text-center">Hạng</th>
                        <th class="px-4 py-3 transition select-none whitespace-nowrap bg-gray-100 text-gray-700 text-left cursor-pointer hover:bg-gray-200" on:click={() => handleSort('hoTen')}>
                            <div class="flex items-center gap-1 justify-start">
                                Nhân viên
                                {#if sortKey === 'hoTen'}<span class="ml-1 text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                            </div>
                        </th>
                        {#each visibleColumns as col}
                            <th class="px-4 py-3 transition select-none whitespace-nowrap {col.headerClass} text-right cursor-pointer hover:bg-opacity-80" on:click={() => handleSort(col.key)}>
                                <div class="flex items-center justify-end gap-1">
                                    {col.label}
                                    {#if sortKey === col.key}<span class="ml-1 opacity-70">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                                </div>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    {#if sortedData.length === 0}
                        <tr><td colspan={visibleColumns.length + 2} class="p-12 text-center text-gray-400 italic bg-gray-50">Chưa có dữ liệu hiển thị.</td></tr>
                    {:else}
                        {#each sortedData as item, index (item.maNV)}
                            <tr class="transition-colors duration-150 group cursor-pointer {getRowStyle(index)}" on:click={() => handleRowClick(item.maNV)}>
                                <td class="px-2 py-3 text-center border-r border-gray-200 font-bold {index <= 2 ? 'text-xl' : 'text-sm text-slate-400'}">
                                    {getRankIcon(index)}
                                </td>
                                <td class="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap border-r border-gray-200 group-hover:text-blue-800 group-hover:underline">
                                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                                </td>
                                
                                {#each visibleColumns as col}
                                    {#if col.key === 'doanhThu'}
                                        <td class="px-4 py-3 text-right border-r border-gray-200 {getCellClass(item, 'doanhThu')}">{formatters.formatRevenue(item.doanhThu)}</td>
                                    {:else if col.key === 'doanhThuQuyDoi'}
                                        <td class="px-4 py-3 text-right border-r border-gray-200 {getCellClass(item, 'doanhThuQuyDoi')}">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td>
                                    {:else if col.key === 'hieuQuaQuyDoi'}
                                        <td class="px-4 py-3 text-right border-r border-gray-200 {getCellClass(item, 'hieuQuaQuyDoi')}">{formatters.formatPercentage(item.hieuQuaQuyDoi)}</td>
                                    
                                    {:else if col.key === 'dtqdCK'}
                                        <td class="px-4 py-3 text-right border-l-2 border-blue-300 border-r border-blue-100 bg-blue-50/60 font-bold text-blue-800">
                                            {formatters.formatRevenue(item.dtqdCK)}
                                        </td>
                                    {:else if col.key === 'duKienSoCK'}
                                        <td class="px-4 py-3 text-right border-r-2 border-emerald-300 font-black bg-emerald-50/50 {item.duKienSoCK >= 0 ? 'text-emerald-600' : 'text-red-600'}">
                                            {item.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(item.duKienSoCK)}
                                        </td>
                                        
                                    {:else if col.key === 'doanhThuTraGop'}
                                        <td class="px-4 py-3 text-right border-l border-gray-200 {getCellClass(item, 'doanhThuTraGop')}">{formatters.formatRevenue(item.doanhThuTraGop)}</td>
                                    {:else if col.key === 'tyLeTraCham'}
                                        <td class="px-4 py-3 text-right border-r border-gray-200 {getCellClass(item, 'tyLeTraCham')}">{formatters.formatPercentage(item.tyLeTraCham)}</td>
                                    {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                                        <td class="px-4 py-3 text-right border-l border-gray-200 {getCellClass(item, 'doanhThuQuyDoiChuaXuat')}">{formatters.formatRevenue(item.doanhThuQuyDoiChuaXuat)}</td>
                                    {/if}
                                {/each}
                            </tr>
                        {/each}
                    {/if}
                </tbody>
                <tfoot class="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300 text-xs uppercase">
                    <tr>
                        <td class="px-4 py-3 text-center tracking-wider" colspan="2">TỔNG CỘNG</td>
                        {#each visibleColumns as col}
                            {#if col.key === 'doanhThu'}
                                <td class="px-4 py-3 text-right text-base border-r border-gray-300">{formatters.formatRevenue(totals.doanhThu)}</td>
                            {:else if col.key === 'doanhThuQuyDoi'}
                                <td class="px-4 py-3 text-right text-base text-blue-700 border-r border-gray-300">{formatters.formatRevenue(totals.doanhThuQuyDoi)}</td>
                            {:else if col.key === 'hieuQuaQuyDoi'}
                                <td class="px-4 py-3 text-right text-base text-blue-700 border-r border-gray-300">{formatters.formatPercentage(totalPctQD)}</td>
                                
                            {:else if col.key === 'dtqdCK'}
                                <td class="px-4 py-3 text-right text-base font-black text-blue-900 bg-blue-100/80 border-l-2 border-blue-300 border-r border-blue-200">
                                    {formatters.formatRevenue(totals.dtqdCK)}
                                </td>
                            {:else if col.key === 'duKienSoCK'}
                                <td class="px-4 py-3 text-right text-base font-black border-r-2 border-emerald-300 bg-emerald-100/80 {totals.duKienSoCK >= 0 ? 'text-emerald-700' : 'text-red-700'}">
                                    {totals.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(totals.duKienSoCK)}
                                </td>
                                
                            {:else if col.key === 'doanhThuTraGop'}
                                <td class="px-4 py-3 text-right text-base border-l border-gray-300 border-r">{formatters.formatRevenue(totals.doanhThuTraGop)}</td>
                            {:else if col.key === 'tyLeTraCham'}
                                <td class="px-4 py-3 text-right text-base border-r border-gray-300">{formatters.formatPercentage(totalPctTC)}</td>
                            {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                                <td class="px-4 py-3 text-right text-base text-gray-600 border-l border-gray-300">{formatters.formatRevenue(totals.doanhThuQuyDoiChuaXuat)}</td>
                            {/if}
                        {/each}
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; } 
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    details > summary::-webkit-details-marker { display: none; }
</style>