<script>
  import { createEventDispatcher } from 'svelte';
  import { realtimeYCXData } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { getCompletionColor } from '../../../utils/kpi.utils.js';
  
  export let employee; 
  export let isGhostMode = false;
  export let injectedYcxData = null; 

  const dispatch = createEventDispatcher();
  let detailData = null;
  let employeeName = 'N/A';
  let goals = {};

  // Reactive: Tính toán dữ liệu chi tiết an toàn
  $: {
    const sourceYcxData = injectedYcxData || $realtimeYCXData;

    if (employee && sourceYcxData && sourceYcxData.length > 0) {
      employeeName = formatters.getShortEmployeeName(employee.hoTen, employee.maNV);
      const warehouse = employee.maKho || '';
      const settings = settingsService.getRealtimeGoalSettings(warehouse);
      goals = settings.goals || {};
      detailData = reportService.generateRealtimeEmployeeDetailReport(employee.maNV, sourceYcxData);
    }
  }

  function goBack() {
      dispatch('back');
  }
</script>

<div 
    class="{isGhostMode ? 'bg-white p-6 w-[1000px]' : 'max-w-7xl mx-auto px-4'} animate-fade-in pb-10"
    data-capture-group="revenue-detail-mobile"
    data-capture-filename={employee ? `DT_Realtime_${employee.hoTen}_${employee.maNV}` : 'ChiTietNhanVien'}
>
    {#if !isGhostMode}
    <div class="mb-4 flex justify-between items-center">
        <button class="text-blue-600 hover:underline font-semibold flex items-center gap-1" on:click={goBack}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Quay lại bảng tổng hợp
        </button>
    </div>
    {/if}

    {#if detailData}
        {@const summary = detailData.summary}
        {@const conversionRateTarget = (goals?.phanTramQD || 0) / 100}
        {@const isPositive = summary.conversionRate >= conversionRateTarget}
        
        {@const targetTC = (goals?.phanTramTC || 0) / 100}
        {@const tcClass = getCompletionColor(employee?.tyLeTraCham || 0, targetTC)}

        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-6 border border-blue-100 mb-6 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 class="text-3xl font-black text-blue-900 drop-shadow-sm">{employeeName}</h3>
            <p class="text-blue-600 font-bold uppercase tracking-wider text-sm mt-1">Chi tiết doanh thu Realtime</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
             <div class="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 text-center">
                 <div class="text-[11px] text-blue-600 font-black uppercase tracking-wider leading-tight">Tổng DT Thực</div>
                 <div class="text-xl font-black text-blue-800 mt-1">{formatters.formatRevenue(summary.totalRealRevenue, 1)}</div>
             </div>
             
             <div class="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100 text-center">
                 <div class="text-[11px] text-purple-600 font-black uppercase tracking-wider leading-tight">Tổng DTQĐ</div>
                 <div class="text-xl font-black text-purple-800 mt-1">{formatters.formatRevenue(summary.totalConvertedRevenue, 1)}</div>
             </div>
             
             <div class="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 text-center">
                 <div class="text-[11px] text-emerald-600 font-black uppercase tracking-wider leading-tight">Tỷ lệ Quy đổi</div>
                 <div class="text-xl font-black mt-1 {isPositive ? 'text-emerald-700' : 'text-red-600'}">
                    {formatters.formatPercentage(summary.conversionRate)}
                 </div>
             </div>
             
             <div class="bg-rose-50 p-4 rounded-xl shadow-sm border border-rose-100 text-center">
                <div class="text-[11px] text-rose-600 font-black uppercase tracking-wider leading-tight">Tỷ lệ Trả chậm</div>
                <div class="text-xl font-black mt-1 {tcClass}">
                    {formatters.formatPercentage(employee?.tyLeTraCham || 0)}
                </div>
            </div>
            
            <div class="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-100 text-center">
                <div class="text-[11px] text-amber-600 font-black uppercase tracking-wider leading-tight">Tổng Đơn</div>
                <div class="text-xl font-black text-amber-800 mt-1">{summary.totalOrders}</div>
            </div>
            
            <div class="bg-cyan-50 p-4 rounded-xl shadow-sm border border-cyan-100 text-center">
                 <div class="text-[11px] text-cyan-600 font-black uppercase tracking-wider leading-tight">Đơn Bán Kèm</div>
                <div class="text-xl font-black text-cyan-800 mt-1">{summary.bundledOrderCount}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col">
                <h4 class="text-lg font-black text-fuchsia-700 mb-4 border-b-2 border-fuchsia-100 pb-2 uppercase flex items-center gap-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    Chi tiết Ngành hàng
                </h4>
                <div class="flex-grow overflow-y-auto max-h-[500px] pr-2 custom-scrollbar relative">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-white sticky top-0 z-10 text-xs text-slate-500 uppercase border-b border-gray-200">
                            <tr>
                                <th class="py-2.5 px-2 font-bold">Tên Ngành Hàng</th>
                                <th class="py-2.5 px-2 text-center font-bold">SL</th>
                                <th class="py-2.5 px-2 text-right font-bold">DT Thực</th>
                                <th class="py-2.5 px-2 text-right font-bold">Đơn giá</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            {#each detailData.byProductGroup as group}
                                {@const donGia = group.quantity > 0 ? group.realRevenue / group.quantity : 0}
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 px-2 font-bold text-gray-800">{group.name}</td>
                                    <td class="py-3 px-2 text-center font-bold text-gray-600 bg-gray-50/50">{group.quantity}</td>
                                    <td class="py-3 px-2 text-right font-black text-blue-700">{formatters.formatRevenue(group.realRevenue, 1)}</td>
                                    <td class="py-3 px-2 text-right font-semibold text-fuchsia-600">{formatters.formatRevenue(donGia, 1)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col">
                <h4 class="text-lg font-black text-blue-700 mb-4 border-b-2 border-blue-100 pb-2 uppercase flex items-center gap-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Chi tiết Khách hàng ({detailData.byCustomer.length})
                </h4>
                <div class="flex-grow space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar relative">
                    {#each detailData.byCustomer as customer, index}
                        {@const totalDt = customer.products.reduce((sum, p) => sum + (p.realRevenue || 0), 0)}
                        {@const totalDtqd = customer.products.reduce((sum, p) => sum + (p.convertedRevenue !== undefined ? p.convertedRevenue : p.realRevenue), 0)}
                        {@const tyLeQd = totalDt > 0 ? (totalDtqd / totalDt) - 1 : 0}

                        <details class="group border border-gray-200 rounded-xl bg-white hover:border-blue-300 transition-all overflow-hidden shadow-sm open:shadow-md">
                            <summary class="flex flex-col sm:flex-row justify-between sm:items-center p-3 cursor-pointer list-none select-none gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="font-black text-gray-400 text-sm w-4">{index + 1}.</span>
                                    <span class="font-black text-gray-800 text-[13px] uppercase tracking-wide truncate max-w-[150px]" title={customer.name}>{customer.name}</span>
                                </div>
                                <div class="flex flex-wrap items-center gap-3 text-xs bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg shrink-0">
                                    <span class="font-bold text-gray-500">SL: <span class="text-gray-900">{customer.totalQuantity}</span></span>
                                    <span class="font-bold text-gray-500">DT: <span class="text-gray-900">{formatters.formatRevenue(totalDt, 1)}</span></span>
                                    <span class="font-bold text-gray-500">DTQĐ: <span class="text-blue-700 font-black">{formatters.formatRevenue(totalDtqd, 1)}</span></span>
                                    <span class="font-black px-1.5 py-0.5 rounded shadow-sm border {tyLeQd >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}">
                                        {formatters.formatPercentage(tyLeQd)}
                                    </span>
                                    <span class="transform group-open:rotate-180 transition-transform text-gray-400 hidden sm:block">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                                    </span>
                                </div>
                            </summary>
                            
                            <div class="p-3 border-t border-gray-100 bg-slate-50">
                                <table class="w-full text-xs">
                                    <thead class="text-slate-400 border-b border-gray-200 uppercase text-[10px] font-bold">
                                        <tr>
                                            <th class="text-left py-1.5 font-bold">Sản phẩm</th>
                                            <th class="text-center py-1.5 font-bold w-10">SL</th>
                                            <th class="text-right py-1.5 font-bold w-16">DT Thực</th>
                                            <th class="text-right py-1.5 font-bold w-16">DT QĐ</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100">
                                        {#each customer.products as p}
                                            {@const spQd = p.convertedRevenue !== undefined ? p.convertedRevenue : p.realRevenue}
                                            <tr class="hover:bg-white transition-colors">
                                                <td class="py-2.5 text-gray-700 font-medium leading-snug pr-2 text-xs">{p.productName}</td>
                                                <td class="py-2.5 text-center font-bold text-gray-600">{p.quantity}</td>
                                                <td class="py-2.5 text-right font-black text-gray-800">{formatters.formatRevenue(p.realRevenue, 1)}</td>
                                                <td class="py-2.5 text-right font-black text-blue-700">{formatters.formatRevenue(spQd, 1)}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    {/each}
                </div>
            </div>
        </div>

    {:else}
        <div class="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
             <p class="text-gray-500 font-medium">Đang tải hoặc không có dữ liệu chi tiết...</p>
        </div>
    {/if}
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  /* Xóa thanh cuộn ẩn của thẻ details */
  details > summary::-webkit-details-marker { display: none; }
  
  /* Custom scrollbar thanh lịch */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  /* OVERRIDE CHO CAPTURE NGẦM GIỮ NGUYÊN CSS */
  :global(.capture-container *) { transition: none !important; animation: none !important; }
</style>