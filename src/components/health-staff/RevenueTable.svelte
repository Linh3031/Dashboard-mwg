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
      
      return { ...item, dtqdCK, duKienSoCK };
  });

  // --- QUẢN LÝ CẤU TRÚC NHÓM CỘT DYNAMIC ---
  let columnSettings = [
      { key: 'doanhThu', label: 'DT Thực', group: 'dt', visible: true },
      { key: 'doanhThuQuyDoi', label: 'DT Quy Đổi', group: 'dt', visible: true },
      { key: 'hieuQuaQuyDoi', label: '% QĐ', group: 'dt', visible: true },
      
      { key: 'dtqdCK', label: 'DTQĐ Cùng Kỳ', group: 'ck', visible: true },
      { key: 'duKienSoCK', label: 'Dự Kiến So CK', group: 'ck', visible: true },
      
      { key: 'doanhThuTraGop', label: 'DT Trả Chậm', group: 'tc', visible: true },
      { key: 'tyLeTraCham', label: '% Trả Chậm', group: 'tc', visible: true },
      
      { key: 'doanhThuQuyDoiChuaXuat', label: 'DTQĐ Chưa Xuất', group: 'cx', visible: true }
  ];

  onMount(() => {
      const saved = localStorage.getItem('sknv_revenue_table_cols_v4');
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
      localStorage.setItem('sknv_revenue_table_cols_v4', JSON.stringify(columnSettings));
  }

  // Phân tích nhóm để vẽ viền tự động
  $: visibleColumns = columnSettings.filter(c => c.visible).map((c, index, arr) => {
      const isLast = index === arr.length - 1 || arr[index + 1].group !== c.group;
      const isFirst = index === 0 || arr[index - 1].group !== c.group;
      return { ...c, isLastInGroup: isLast, isFirstInGroup: isFirst };
  });

  // --- ENGINE SINH CSS TỰ ĐỘNG THEO GROUP ---
  function getGroupHeaderClass(col) {
      let bg = '', border = 'border-r border-gray-200';
      if (col.group === 'dt') bg = 'bg-sky-100/80 text-sky-900';
      else if (col.group === 'ck') bg = 'bg-indigo-100/90 text-indigo-900';
      else if (col.group === 'tc') bg = 'bg-orange-100/80 text-orange-900';
      else if (col.group === 'cx') bg = 'bg-gray-200 text-gray-800';

      if (col.isLastInGroup) {
          if (col.group === 'dt') border = 'border-r-[2px] border-sky-400';
          else if (col.group === 'ck') border = 'border-r-[2px] border-indigo-400';
          else if (col.group === 'tc') border = 'border-r-[2px] border-orange-400';
          else if (col.group === 'cx') border = 'border-r-[2px] border-gray-400';
      }
      if (col.isFirstInGroup) {
          if (col.group === 'dt') border += ' border-l-[2px] border-l-sky-400';
          else if (col.group === 'ck') border += ' border-l-[2px] border-l-indigo-400';
          else if (col.group === 'tc') border += ' border-l-[2px] border-l-orange-400';
          else if (col.group === 'cx') border += ' border-l-[2px] border-l-gray-400';
      }
      return `${bg} ${border}`;
  }

  function getGroupBodyClass(col) {
      let bg = '', border = 'border-r border-gray-200';
      if (col.group === 'dt') bg = 'bg-sky-50/40 group-hover:bg-sky-100/50';
      else if (col.group === 'ck') bg = 'bg-indigo-50/50 group-hover:bg-indigo-100/60';
      else if (col.group === 'tc') bg = 'bg-orange-50/40 group-hover:bg-orange-100/60';
      else if (col.group === 'cx') bg = 'bg-gray-50/80 group-hover:bg-gray-200/60';

      if (col.isLastInGroup) {
          if (col.group === 'dt') border = 'border-r-[2px] border-sky-300';
          else if (col.group === 'ck') border = 'border-r-[2px] border-indigo-300';
          else if (col.group === 'tc') border = 'border-r-[2px] border-orange-300';
          else if (col.group === 'cx') border = 'border-r-[2px] border-gray-300';
      }
      if (col.isFirstInGroup) {
          if (col.group === 'dt') border += ' border-l-[2px] border-l-sky-300';
          else if (col.group === 'ck') border += ' border-l-[2px] border-l-indigo-300';
          else if (col.group === 'tc') border += ' border-l-[2px] border-l-orange-300';
          else if (col.group === 'cx') border += ' border-l-[2px] border-l-gray-300';
      }
      return `${bg} ${border} transition-colors duration-150`;
  }

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

  function getCellTextClass(item, colKey) {
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
            <table class="min-w-full text-sm text-left border-collapse table-auto">
                <thead class="uppercase text-[11px] font-bold sticky top-0 z-10 shadow-sm align-middle">
                    <tr>
                        <!-- Khóa cứng cột Hạng bằng min-w và max-w -->
                        <th class="w-[45px] min-w-[45px] max-w-[45px] px-1 py-3 transition select-none bg-gray-100 text-gray-700 text-center border-r border-gray-200">Hạng</th>
                        
                        <!-- Cột Nhân Viên -->
                        <th class="w-[160px] min-w-[160px] px-3 py-3 transition select-none bg-gray-100 text-gray-700 text-left cursor-pointer hover:bg-gray-200 border-r border-gray-200" on:click={() => handleSort('hoTen')}>
                            <div class="flex items-center justify-between">
                                Nhân viên
                                {#if sortKey === 'hoTen'}<span class="text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                            </div>
                        </th>
                        
                        <!-- Cột Dữ Liệu: Gập dòng tự động (whitespace-normal break-words) -->
                        {#each visibleColumns as col}
                            <th class="w-[90px] min-w-[90px] max-w-[90px] px-1 py-2 transition select-none text-center cursor-pointer hover:brightness-95 {getGroupHeaderClass(col)}" on:click={() => handleSort(col.key)}>
                                <div class="flex flex-col items-center justify-center w-full h-full">
                                    <span class="whitespace-normal break-words leading-tight">{col.label}</span>
                                    {#if sortKey === col.key}<span class="text-[10px] opacity-70 mt-0.5">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                                </div>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                    {#if sortedData.length === 0}
                        <tr><td colspan={visibleColumns.length + 2} class="p-12 text-center text-gray-400 italic bg-gray-50">Chưa có dữ liệu hiển thị.</td></tr>
                    {:else}
                        {#each sortedData as item, index (item.maNV)}
                            <tr class="group cursor-pointer hover:bg-gray-50/50" on:click={() => handleRowClick(item.maNV)}>
                                <td class="w-[45px] min-w-[45px] max-w-[45px] px-1 py-3 text-center border-r border-gray-200 font-bold bg-white group-hover:bg-gray-50 {index <= 2 ? 'text-xl' : 'text-sm text-slate-400'}">
                                    {getRankIcon(index)}
                                </td>
                                <td class="w-[160px] min-w-[160px] px-3 py-3 font-semibold text-blue-700 whitespace-nowrap border-r border-gray-200 bg-white group-hover:bg-gray-50 group-hover:text-blue-800 truncate">
                                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                                </td>
                                
                                {#each visibleColumns as col}
                                    <td class="w-[90px] min-w-[90px] max-w-[90px] px-2 py-3 text-right text-sm {getGroupBodyClass(col)}">
                                        {#if col.key === 'doanhThu'}
                                            <span class={getCellTextClass(item, 'doanhThu')}>{formatters.formatRevenue(item.doanhThu)}</span>
                                        {:else if col.key === 'doanhThuQuyDoi'}
                                            <span class={getCellTextClass(item, 'doanhThuQuyDoi')}>{formatters.formatRevenue(item.doanhThuQuyDoi)}</span>
                                        {:else if col.key === 'hieuQuaQuyDoi'}
                                            <span class={getCellTextClass(item, 'hieuQuaQuyDoi')}>{formatters.formatPercentage(item.hieuQuaQuyDoi)}</span>
                                        
                                        {:else if col.key === 'dtqdCK'}
                                            <span class="font-bold text-indigo-700">{formatters.formatRevenue(item.dtqdCK)}</span>
                                        {:else if col.key === 'duKienSoCK'}
                                            <span class="font-bold {item.duKienSoCK >= 0 ? 'text-blue-600' : 'text-red-500'}">
                                                {item.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(item.duKienSoCK)}
                                            </span>
                                            
                                        {:else if col.key === 'doanhThuTraGop'}
                                            <span class={getCellTextClass(item, 'doanhThuTraGop')}>{formatters.formatRevenue(item.doanhThuTraGop)}</span>
                                        {:else if col.key === 'tyLeTraCham'}
                                            <span class={getCellTextClass(item, 'tyLeTraCham')}>{formatters.formatPercentage(item.tyLeTraCham)}</span>
                                        
                                        {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                                            <span class={getCellTextClass(item, 'doanhThuQuyDoiChuaXuat')}>{formatters.formatRevenue(item.doanhThuQuyDoiChuaXuat)}</span>
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    {/if}
                </tbody>
                <tfoot class="font-bold text-gray-900 border-t-[3px] border-gray-400 text-sm uppercase">
                    <tr>
                        <td class="px-3 py-4 text-center tracking-wider bg-gray-100 border-r border-gray-300" colspan="2">TỔNG CỘNG</td>
                        {#each visibleColumns as col}
                            <td class="px-2 py-4 text-right {getGroupHeaderClass(col).replace('border-gray-200', 'border-gray-300')} bg-opacity-50">
                                {#if col.key === 'doanhThu'}
                                    {formatters.formatRevenue(totals.doanhThu)}
                                {:else if col.key === 'doanhThuQuyDoi'}
                                    <span class="text-sky-800">{formatters.formatRevenue(totals.doanhThuQuyDoi)}</span>
                                {:else if col.key === 'hieuQuaQuyDoi'}
                                    <span class="text-sky-800">{formatters.formatPercentage(totalPctQD)}</span>
                                    
                                {:else if col.key === 'dtqdCK'}
                                    <span class="text-indigo-900">{formatters.formatRevenue(totals.dtqdCK)}</span>
                                {:else if col.key === 'duKienSoCK'}
                                    <span class="{totals.duKienSoCK >= 0 ? 'text-blue-700' : 'text-red-600'}">
                                        {totals.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(totals.duKienSoCK)}
                                    </span>
                                    
                                {:else if col.key === 'doanhThuTraGop'}
                                    {formatters.formatRevenue(totals.doanhThuTraGop)}
                                {:else if col.key === 'tyLeTraCham'}
                                    {formatters.formatPercentage(totalPctTC)}
                                
                                {:else if col.key === 'doanhThuQuyDoiChuaXuat'}
                                    <span class="text-gray-700">{formatters.formatRevenue(totals.doanhThuQuyDoiChuaXuat)}</span>
                                {/if}
                            </td>
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