<script>
  import { createEventDispatcher } from 'svelte';
  import { realtimeYCXData, employeeMaNVMap } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  // [FIX] Cập nhật đường dẫn đúng: modules -> services
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  
  export let employeeId;

  const dispatch = createEventDispatcher();
  let detailData = null;
  let employeeName = 'N/A';
  let goals = {};

  // Reactive: Tính toán dữ liệu chi tiết khi employeeId thay đổi
  $: {
    if (employeeId && $realtimeYCXData.length > 0) {
      const info = $employeeMaNVMap.get(String(employeeId));
      employeeName = info ? formatters.getShortEmployeeName(info.hoTen, info.maNV) : `NV ${employeeId}`;
      
      const warehouse = info ? info.maKho : '';
      const settings = settingsService.getRealtimeGoalSettings(warehouse);
      goals = settings.goals || {};
      
      detailData = reportService.generateRealtimeEmployeeDetailReport(employeeId, $realtimeYCXData);
    }
  }

  function goBack() {
      dispatch('back');
  }
</script>

<div class="max-w-4xl mx-auto animate-fade-in pb-10">
    <div class="mb-4 flex justify-between items-center">
        <button class="text-blue-600 hover:underline font-semibold flex items-center gap-1" on:click={goBack}>
            ‹ Quay lại bảng tổng hợp
        </button>
    </div>

    {#if detailData}
        {@const summary = detailData.summary}
        {@const conversionRateTarget = (goals?.phanTramQD || 0) / 100}
        {@const isPositive = summary.conversionRate >= conversionRateTarget}

        <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6 text-center">
            <h3 class="text-2xl font-extrabold text-gray-800">{employeeName}</h3>
            <p class="text-gray-500 font-medium">Chi tiết doanh thu Realtime</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
             <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                 <div class="text-sm text-gray-500 font-medium uppercase">Tổng DT Thực</div>
                 <div class="text-2xl font-bold text-blue-600 mt-1">{formatters.formatRevenue(summary.totalRealRevenue, 1)}</div>
             </div>
             <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                 <div class="text-sm text-gray-500 font-medium uppercase">Tổng DTQĐ</div>
                 <div class="text-2xl font-bold text-purple-600 mt-1">{formatters.formatRevenue(summary.totalConvertedRevenue, 1)}</div>
             </div>
             <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                 <div class="text-sm text-gray-500 font-medium uppercase">Tỷ lệ QĐ</div>
                 <div class="text-2xl font-bold mt-1 {isPositive ? 'text-green-600' : 'text-red-600'}">
                    {formatters.formatPercentage(summary.conversionRate)}
                 </div>
             </div>
             <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                <div class="text-sm text-gray-500 font-medium uppercase">DT Chưa Xuất</div>
                 <div class="text-2xl font-bold text-yellow-600 mt-1">{formatters.formatRevenue(summary.unexportedRevenue, 1)}</div>
            </div>
             <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                <div class="text-sm text-gray-500 font-medium uppercase">Tổng Đơn</div>
                <div class="text-2xl font-bold text-gray-800 mt-1">{summary.totalOrders}</div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                 <div class="text-sm text-gray-500 font-medium uppercase">Đơn Bán Kèm</div>
                <div class="text-2xl font-bold text-gray-800 mt-1">{summary.bundledOrderCount}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div class="bg-white rounded-lg shadow-md border border-gray-200 p-5">
                <h4 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Tỷ trọng Nhóm hàng</h4>
                <div class="space-y-4">
                    {#each detailData.byProductGroup as group}
                        {@const percent = summary.totalRealRevenue > 0 ? (group.realRevenue / summary.totalRealRevenue) * 100 : 0}
                        <div>
                             <div class="flex justify-between text-sm mb-1">
                                <span class="font-semibold">{group.name}</span>
                                <span class="font-bold text-gray-700">{formatters.formatRevenue(group.realRevenue, 0)}</span>
                             </div>
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div class="bg-blue-600 h-2.5 rounded-full" style="width: {percent}%"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-md border border-gray-200 p-5">
                <h4 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Chi tiết Khách hàng ({detailData.byCustomer.length})</h4>
                <div class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                     {#each detailData.byCustomer as customer, index}
                        <details class="group border border-gray-200 rounded-lg bg-gray-50 open:bg-white open:shadow-sm transition-all">
                            <summary class="flex justify-between items-center p-3 cursor-pointer list-none select-none">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-gray-500 text-sm">{index + 1}.</span>
                                    <span class="font-semibold text-gray-800 text-sm">{customer.name}</span>
                                    <span class="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{customer.totalQuantity} SP</span>
                                </div>
                                <span class="transform group-open:rotate-180 transition-transform text-gray-400">▼</span>
                            </summary>
                             <div class="p-3 border-t border-gray-100 text-sm">
                                <table class="w-full">
                                    {#each customer.products as p}
                                        <tr class="border-b last:border-0 border-gray-100">
                                            <td class="py-2 text-gray-600">{p.productName}</td>
                                            <td class="py-2 text-right font-bold text-gray-800">{formatters.formatRevenue(p.realRevenue)}</td>
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
             <p class="text-gray-500">Đang tải hoặc không có dữ liệu chi tiết...</p>
        </div>
    {/if}
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>