<script>
  import { createEventDispatcher } from 'svelte';
  import { realtimeYCXData } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { getCompletionColor } from '../../../utils/kpi.utils.js'; // [PHẪU THUẬT] Import hàm tính màu động
  
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
    class="{isGhostMode ? 'bg-white p-6 w-[1000px]' : 'max-w-4xl mx-auto'} animate-fade-in pb-10"
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

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
             <div class="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 text-center">
                 <div class="text-xs text-blue-600 font-black uppercase tracking-wider">Tổng DT Thực</div>
                 <div class="text-2xl font-black text-blue-800 mt-1">{formatters.formatRevenue(summary.totalRealRevenue, 1)}</div>
             </div>
             
             <div class="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100 text-center">
                 <div class="text-xs text-purple-600 font-black uppercase tracking-wider">Tổng DTQĐ</div>
                 <div class="text-2xl font-black text-purple-800 mt-1">{formatters.formatRevenue(summary.totalConvertedRevenue, 1)}</div>
             </div>
             
             <div class="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 text-center">
                 <div class="text-xs text-emerald-600 font-black uppercase tracking-wider">Tỷ lệ Quy đổi</div>
                 <div class="text-2xl font-black mt-1 {isPositive ? 'text-emerald-700' : 'text-red-600'}">
                    {formatters.formatPercentage(summary.conversionRate)}
                 </div>
             </div>
             
             <div class="bg-rose-50 p-4 rounded-xl shadow-sm border border-rose-100 text-center">
                <div class="text-xs text-rose-600 font-black uppercase tracking-wider">Tỷ lệ Trả chậm</div>
                <div class="text-2xl font-black mt-1 {tcClass}">
                    {formatters.formatPercentage(employee?.tyLeTraCham || 0)}
                </div>
            </div>
            
             <div class="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-100 text-center">
                <div class="text-xs text-amber-600 font-black uppercase tracking-wider">Tổng Đơn</div>
                <div class="text-2xl font-black text-amber-800 mt-1">{summary.totalOrders}</div>
            </div>
            
            <div class="bg-cyan-50 p-4 rounded-xl shadow-sm border border-cyan-100 text-center">
                 <div class="text-xs text-cyan-600 font-black uppercase tracking-wider">Đơn Bán Kèm</div>
                <div class="text-2xl font-black text-cyan-800 mt-1">{summary.bundledOrderCount}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h4 class="text-lg font-black text-fuchsia-700 mb-4 border-b-2 border-fuchsia-100 pb-2 uppercase flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                    Tỷ trọng Nhóm hàng
                </h4>
                <div class="space-y-4">
                    {#each detailData.byProductGroup as group}
                        {@const percent = summary.totalRealRevenue > 0 ? (group.realRevenue / summary.totalRealRevenue) * 100 : 0}
                        <div>
                             <div class="flex justify-between text-sm mb-1">
                                <span class="font-bold text-gray-800">{group.name}</span>
                                <span class="font-black text-gray-900">{formatters.formatRevenue(group.realRevenue, 0)}</span>
                             </div>
                            <div class="w-full bg-gray-100 rounded-full h-2">
                                <div class="bg-fuchsia-500 h-2 rounded-full" style="width: {percent}%"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h4 class="text-lg font-black text-blue-700 mb-4 border-b-2 border-blue-100 pb-2 uppercase flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Chi tiết Khách hàng ({detailData.byCustomer.length})
                </h4>
                <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {#each detailData.byCustomer as customer, index}
                        {@const totalDt = customer.products.reduce((sum, p) => sum + (p.realRevenue || 0), 0)}
                        {@const totalDtqd = customer.products.reduce((sum, p) => sum + (p.convertedRevenue || p.realRevenue || 0), 0)}
                        {@const tyLeQd = totalDt > 0 ? (totalDtqd / totalDt) - 1 : 0}

                        <details class="group border border-gray-200 rounded-xl bg-white hover:border-blue-300 transition-all overflow-hidden shadow-sm">
                            <summary class="flex flex-col sm:flex-row justify-between sm:items-center p-3 cursor-pointer list-none select-none gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="font-black text-gray-400 text-sm">{index + 1}.</span>
                                    <span class="font-black text-gray-800 text-[13px] uppercase tracking-wide">{customer.name}</span>
                                </div>
                                <div class="flex flex-wrap items-center gap-3 text-xs bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                    <span class="font-bold text-gray-500">SL: <span class="text-gray-900">{customer.totalQuantity}</span></span>
                                    <span class="font-bold text-gray-500">DT: <span class="text-gray-900">{formatters.formatRevenue(totalDt)}</span></span>
                                    <span class="font-bold text-gray-500">DTQĐ: <span class="text-blue-700 font-black">{formatters.formatRevenue(totalDtqd)}</span></span>
                                    <span class="font-black px-1.5 py-0.5 rounded shadow-sm border {tyLeQd >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}">{formatters.formatPercentage(tyLeQd)}</span>
                                    <span class="transform group-open:rotate-180 transition-transform text-gray-400 hidden sm:block">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                                    </span>
                                </div>
                            </summary>
                             <div class="p-3 border-t border-gray-100 bg-slate-50 text-sm">
                                <table class="w-full">
                                    {#each customer.products as p}
                                        <tr class="border-b last:border-0 border-gray-200">
                                            <td class="py-2.5 text-gray-700 font-medium leading-snug pr-2">{p.productName}</td>
                                            <td class="py-2.5 text-right font-black text-gray-900 whitespace-nowrap">{formatters.formatRevenue(p.realRevenue)}</td>
                                        </tr>
                                    {/each}
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