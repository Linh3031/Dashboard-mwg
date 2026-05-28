<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { danhSachNhanVien } from '../../stores.js';
  import { multiMonthReportLogic } from '../../services/reports/multiMonth.report.js';
  
  export let rawData = [];

  const dispatch = createEventDispatcher();
  let sortKey = 'total';
  let sortDirection = 'desc';

  // --- TRẠNG THÁI ---
  let allMonths = [];
  let selectedMonths = []; 
  let showFilter = false;
  let processedMap = new Map();

  const formatRevenueNoDecimal = (val) => {
      if (!val || isNaN(val)) return '-';
      return Math.round(val / 1000000).toLocaleString('vi-VN');
  };

  // [SURGICAL LOGIC]: Nhờ Context Passing, hàm này giờ chạy siêu tốc, render tức thì
  $: calculatedResult = multiMonthReportLogic.generateMultiMonthReport(rawData, $danhSachNhanVien);

  $: if (calculatedResult) {
      processedMap = calculatedResult.processedMap;
      const newMonthsStr = JSON.stringify(calculatedResult.allMonths);
      const oldMonthsStr = JSON.stringify(allMonths);
      
      if (newMonthsStr !== oldMonthsStr) {
          allMonths = calculatedResult.allMonths;
          // Khởi tạo selectedMonths lần đầu hoặc reset nếu tập dữ liệu gốc đổi
          selectedMonths = [...allMonths];
      }
  }

  function toggleMonth(month) {
      if (selectedMonths.includes(month)) {
          selectedMonths = selectedMonths.filter(m => m !== month);
      } else {
          selectedMonths = [...selectedMonths, month].sort((a,b) => {
              const [ma, ya] = a.split('/'); const [mb, yb] = b.split('/');
              return new Date(ya, ma-1) - new Date(yb, mb-1);
          });
      }
  }

  $: uniqueMonths = selectedMonths;

  $: groupedData = Array.from(processedMap.values()).map(emp => {
      let totalDt = 0; let totalDtqd = 0;
      uniqueMonths.forEach(m => {
          if (emp.months[m]) {
              totalDt += emp.months[m].dt;
              totalDtqd += emp.months[m].dtqd;
          }
      });
      return { ...emp, totalDt, totalDtqd };
  }).filter(emp => emp.totalDtqd > 0);

  $: footerStats = (() => {
      const count = groupedData.length || 1;
      const stats = { 
          total: { dtqd: 0, dt: 0, months: {} }, 
          avg: { dtqd: 0, months: {} } 
      };
      uniqueMonths.forEach(m => {
          stats.total.months[m] = { dtqd: 0, dt: 0, tyle: 0 };
     
          groupedData.forEach(item => {
              if (item.months[m]) {
                  stats.total.months[m].dtqd += item.months[m].dtqd;
                  stats.total.months[m].dt += item.months[m].dt;
              }
          });
          stats.avg.months[m] = stats.total.months[m].dtqd / count;
          stats.total.months[m].tyle = stats.total.months[m].dt > 0 ? (stats.total.months[m].dtqd / stats.total.months[m].dt) - 1 : 0;
      });
      stats.total.dtqd = groupedData.reduce((sum, item) => sum + item.totalDtqd, 0);
      stats.total.dt = groupedData.reduce((sum, item) => sum + item.totalDt, 0);
      stats.avg.dtqd = stats.total.dtqd / count;
      return stats;
  })();

  $: sortedData = [...groupedData].sort((a, b) => {
      let valA = 0, valB = 0;
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
      if (sortKey === 'total') { valA = a.totalDtqd; valB = b.totalDtqd; }
      else if (sortKey.startsWith('month_')) {
          const [_, m, type] = sortKey.split('_');
          const aM = a.months[m] || {dtqd: 0, dt: 0};
          const bM = b.months[m] || {dtqd: 0, dt: 0};
          valA = type === 'dtqd' ? aM.dtqd : (aM.dt > 0 ? aM.dtqd/aM.dt : -1);
          valB = type === 'dtqd' ? bM.dtqd : (bM.dt > 0 ? bM.dtqd/bM.dt : -1);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  $: topCount = sortedData.length <= 15 ? 3 : 5;

  function handleSort(key) {
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  function getRowStyle(index) {
      if (index === 0) return 'bg-amber-50/40 hover:bg-amber-100/60';
      if (index === 1) return 'bg-slate-100/50 hover:bg-slate-200/60'; 
      if (index === 2) return 'bg-orange-50/30 hover:bg-orange-100/50';
      if (index < topCount) return 'bg-blue-50/20 hover:bg-blue-50/60'; 
      return 'bg-white hover:bg-slate-50 border-b border-gray-100';
  }

  function getRankIcon(index) {
      if (index === 0) return '🏆';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index < topCount) return '⭐';
      return `#${index + 1}`;
  }

  function handleRowClick(employeeId) {
      dispatch('viewDetail', { employeeId });
  }
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mt-6 animate-fade-in">
    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50">
        <div class="flex items-center gap-2">
            <div class="p-2 bg-indigo-100 rounded-lg text-indigo-600"><i data-feather="layers" class="w-5 h-5"></i></div>
            <div>
                <h3 class="font-bold text-indigo-900 text-lg uppercase">Phân tích Lũy kế nhiều tháng</h3>
                <p class="text-xs text-indigo-600/80">Tính theo doanh thu tạo</p>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <div class="relative">
                <button on:click={() => showFilter = !showFilter} class="flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-sm">
                    <i data-feather="calendar" class="w-3.5 h-3.5"></i>
                    Tháng ({selectedMonths.length}/{allMonths.length})
                    <i data-feather={showFilter ? 'chevron-up' : 'chevron-down'} class="w-3.5 h-3.5"></i>
                </button>
                {#if showFilter}
                    <div class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] p-2">
                        <div class="flex justify-between border-b pb-2 mb-2 px-1">
                            <button on:click={() => selectedMonths = [...allMonths]} class="text-[10px] text-blue-600 font-bold hover:underline">Tất cả</button>
                            <button on:click={() => selectedMonths = []} class="text-[10px] text-red-500 font-bold hover:underline">Bỏ hết</button>
                        </div>
                        <div class="max-h-48 overflow-y-auto custom-scrollbar">
                            {#each allMonths as m}
                                <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={selectedMonths.includes(m)} on:change={() => toggleMonth(m)} class="rounded text-indigo-600">
                                    <span class="text-sm font-medium text-gray-700">Tháng {m}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
            <div class="flex items-center gap-2 border-l border-indigo-200 pl-4">
                <span class="text-xs font-bold text-indigo-700 cursor-pointer" on:click={() => dispatch('toggleMode')}>Xem nhiều tháng</span>
                <button class="bg-indigo-600 relative inline-flex h-5 w-9 rounded-full border-2 border-transparent" on:click={() => dispatch('toggleMode')}>
                    <span class="translate-x-4 inline-block h-4 w-4 transform rounded-full bg-white shadow transition"></span>
                </button>
            </div>
        </div>
    </div>

    <div class="overflow-x-auto custom-scrollbar">
        <table class="min-w-full text-sm text-left border-collapse" style="min-width: {350 + uniqueMonths.length * 160}px">
            <thead class="uppercase text-xs sticky top-0 z-30 shadow-sm">
                <tr class="bg-slate-50 border-b border-gray-200 text-slate-500">
                    <th rowspan="2" class="px-2 py-3 text-center w-[56px] border-r border-gray-200 sticky left-0 z-40 bg-slate-50 font-bold">Hạng</th>
                    <th rowspan="2" class="px-4 py-3 text-left w-[180px] border-r border-gray-200 sticky left-[56px] z-40 bg-slate-50 font-bold cursor-pointer" on:click={() => handleSort('hoTen')}>
                        Nhân viên {#if sortKey === 'hoTen'}<span class="text-indigo-500">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                    </th>
                    <th rowspan="2" class="px-4 py-3 text-right border-r border-gray-200 sticky left-[236px] z-40 bg-indigo-50 font-black text-indigo-900 cursor-pointer" on:click={() => handleSort('total')}>
                        Tổng DTQĐ {#if sortKey === 'total'}<span class="text-indigo-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                    </th>
                    {#each uniqueMonths as month}
                        <th colspan="2" class="px-4 py-2 text-center border-r border-gray-200 border-l-2 border-l-slate-300 font-bold text-slate-600">Tháng {month}</th>
                    {/each}
                </tr>
                <tr class="bg-white border-b border-gray-200">
                    {#each uniqueMonths as month}
                        <th class="px-3 py-2 text-right text-slate-600 border-r border-gray-100 border-l-2 border-l-slate-300 cursor-pointer" on:click={() => handleSort(`month_${month}_dtqd`)}>
                            DT QĐ {#if sortKey === `month_${month}_dtqd`}<span class="text-indigo-500 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                        </th>
                        <th class="px-3 py-2 text-right text-slate-400 border-r border-gray-200 cursor-pointer" on:click={() => handleSort(`month_${month}_tyle`)}>
                            % QĐ {#if sortKey === `month_${month}_tyle`}<span class="text-indigo-500 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                {#if sortedData.length === 0}
                    <tr><td colspan={3 + uniqueMonths.length * 2} class="p-12 text-center text-gray-400 italic">Vui lòng chọn tháng hoặc không có dữ liệu hợp lệ.</td></tr>
                {:else}
                    {#each sortedData as item, index (item.maNV)}
                        <tr class="transition-colors cursor-pointer {getRowStyle(index)}" on:click={() => handleRowClick(item.maNV)}>
                            <td class="px-2 py-3 text-center border-r border-gray-100 font-bold sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] {index <= 2 ? 'text-xl' : 'text-sm text-slate-400'} {getRowStyle(index)}">
                                {getRankIcon(index)}
                            </td>
                            <td class="px-4 py-3 font-semibold text-slate-700 truncate border-r border-gray-100 sticky left-[56px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] {getRowStyle(index)}">
                                {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                            </td>
                            <td class="px-4 py-3 text-right font-black text-indigo-700 border-r border-gray-100 sticky left-[236px] z-20 bg-indigo-50/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {formatRevenueNoDecimal(item.totalDtqd)}
                            </td>
                            
                            {#each uniqueMonths as month}
                                {@const mData = item.months[month] || {dtqd: 0, dt: 0}}
                                {@const tyle = mData.dt > 0 ? (mData.dtqd / mData.dt) - 1 : 0}
                                {@const isDtqdBelowAvg = mData.dtqd > 0 && mData.dtqd < footerStats.avg.months[month]}
                                {@const shopTyle = footerStats.total.months[month].tyle}
                                {@const isTyleBelowAvg = mData.dtqd > 0 && tyle < shopTyle}
                                
                                <td class="px-3 py-3 text-right font-bold border-r border-gray-100 border-l-2 border-l-slate-200 {isDtqdBelowAvg ? 'bg-red-50 text-red-500' : 'text-gray-800'}">
                                    {mData.dtqd > 0 ? formatRevenueNoDecimal(mData.dtqd) : '-'}
                                </td>
                                <td class="px-3 py-3 text-right text-xs border-r border-gray-100 font-medium {isTyleBelowAvg ? 'bg-red-50 text-red-400' : 'text-slate-400'}">
                                    {mData.dtqd > 0 ? formatters.formatPercentage(tyle) : '-'}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            </tbody>
            {#if sortedData.length > 0}
            <tfoot class="sticky bottom-0 z-30 shadow-md">
                <tr class="bg-slate-100 text-slate-600 font-bold text-xs uppercase border-t-2 border-slate-300">
                    <td colspan="2" class="px-4 py-3 text-center sticky left-0 z-40 bg-slate-100 border-r border-gray-300">Trung Bình</td>
                    <td class="px-4 py-3 text-right sticky left-[236px] z-40 bg-slate-200 border-r border-gray-300">{formatRevenueNoDecimal(footerStats.avg.dtqd)}</td>
                    {#each uniqueMonths as month}
                        <td class="px-3 py-3 text-right border-r border-gray-200 border-l-2 border-l-slate-300">{formatRevenueNoDecimal(footerStats.avg.months[month])}</td>
                        <td class="bg-slate-100 border-r border-gray-200"></td>
                    {/each}
                </tr>
                <tr class="bg-indigo-600 text-white font-black text-xs uppercase">
                    <td colspan="2" class="px-4 py-3 text-center sticky left-0 z-40 bg-indigo-600 border-r border-indigo-500">Tổng Cộng</td>
                    <td class="px-4 py-3 text-right sticky left-[236px] z-40 bg-indigo-700 border-r border-indigo-500">{formatRevenueNoDecimal(footerStats.total.dtqd)}</td>
                    {#each uniqueMonths as month}
                        {@const monthTotal = footerStats.total.months[month]}
                        <td class="px-3 py-3 text-right border-r border-indigo-500 border-l-2 border-l-indigo-400">{formatRevenueNoDecimal(monthTotal.dtqd)}</td>
                        <td class="px-3 py-3 text-right text-[10px] bg-indigo-700/50">{formatters.formatPercentage(monthTotal.tyle)}</td>
                    {/each}
                </tr>
            </tfoot>
            {/if}
        </table>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; } 
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>