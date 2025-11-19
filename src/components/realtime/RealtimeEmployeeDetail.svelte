<script>
  import { createEventDispatcher } from 'svelte';
  import { realtimeYCXData, employeeMaNVMap } from '../../stores.js';
  import { reportService } from '../../services/reportService.js';
  import { settingsService } from '../../modules/settings.service.js';
  import { formatters } from '../../utils/formatters.js';

  export let employeeId;

  const dispatch = createEventDispatcher();

  // Reactive State
  let detailData = null;
  let employeeName = 'N/A';
  let goals = {};

  // Tự động tính toán lại khi employeeId hoặc dữ liệu thay đổi
  $: {
    if (employeeId && $realtimeYCXData.length > 0) {
      // 1. Lấy thông tin NV
      const info = $employeeMaNVMap.get(String(employeeId));
      employeeName = info ? formatters.getShortEmployeeName(info.hoTen, info.maNV) : `NV ${employeeId}`;

      // 2. Lấy mục tiêu (để so sánh tỷ lệ)
      const warehouse = info ? info.maKho : '';
      const settings = settingsService.getRealtimeGoalSettings(warehouse);
      goals = settings.goals || {};

      // 3. Tạo báo cáo chi tiết
      detailData = reportService.generateRealtimeEmployeeDetailReport(employeeId, $realtimeYCXData);
    }
  }

  // Helper tính % thanh tiến độ
  function calcPercent(part, total) {
    if (!total || total === 0) return 0;
    return Math.min((part / total) * 100, 100);
  }
</script>

<div class="max-w-4xl mx-auto animate-fade-in">
  <div class="mb-6 flex items-center gap-4">
    <button 
      class="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition"
      on:click={() => dispatch('back')}
    >
      <i data-feather="arrow-left" class="w-5 h-5"></i>
      Quay lại danh sách
    </button>
    <h3 class="text-xl font-bold text-gray-800 ml-auto">Chi tiết nhân viên</h3>
  </div>

  {#if detailData}
    {@const sum = detailData.summary}
    {@const targetTLQD = (goals.phanTramQD || 0) / 100}
    {@const tlqdClass = sum.conversionRate >= targetTLQD ? 'text-green-600' : 'text-red-600'}

    <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      
      <div class="p-6 bg-gray-50 border-b border-gray-200 text-center">
        <h2 class="text-2xl font-black text-gray-900 uppercase mb-1">{employeeName}</h2>
        <p class="text-sm text-gray-500">Chi tiết doanh thu Realtime</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-200 bg-white">
        <div class="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
          <div class="text-xs font-bold text-blue-500 uppercase mb-1">DT Thực</div>
          <div class="text-xl font-black text-blue-900">{formatters.formatRevenue(sum.totalRealRevenue, 1)}</div>
        </div>
        <div class="p-4 rounded-lg bg-purple-50 border border-purple-100 text-center">
          <div class="text-xs font-bold text-purple-500 uppercase mb-1">DT Quy Đổi</div>
          <div class="text-xl font-black text-purple-900">{formatters.formatRevenue(sum.totalConvertedRevenue, 1)}</div>
        </div>
        <div class="p-4 rounded-lg bg-yellow-50 border border-yellow-100 text-center">
          <div class="text-xs font-bold text-yellow-600 uppercase mb-1">Tỷ Lệ QĐ</div>
          <div class="text-xl font-black {tlqdClass}">{formatters.formatPercentage(sum.conversionRate)}</div>
        </div>
        <div class="p-4 rounded-lg bg-red-50 border border-red-100 text-center">
          <div class="text-xs font-bold text-red-500 uppercase mb-1">DT Chưa Xuất</div>
          <div class="text-xl font-black text-red-900">{formatters.formatRevenue(sum.unexportedRevenue, 1)}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
        
        <div class="p-6 border-r border-gray-200">
          <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i data-feather="layers" class="w-5 h-5"></i> Theo Nhóm Hàng
          </h4>
          <div class="space-y-4">
            {#each detailData.byProductGroup as group}
              {@const totalRev = detailData.byProductGroup.reduce((a, b) => a + b.realRevenue, 0)}
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">{group.name}</span>
                  <span class="font-bold text-gray-900">{formatters.formatRevenue(group.realRevenue, 1)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div class="bg-blue-600 h-2.5 rounded-full" style="width: {calcPercent(group.realRevenue, totalRev)}%"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="p-6 bg-gray-50">
          <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i data-feather="users" class="w-5 h-5"></i> Đơn Hàng Gần Nhất
          </h4>
          <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {#each detailData.byCustomer as cust, index}
              <details class="group bg-white rounded-lg border border-gray-200 shadow-sm open:shadow-md transition-all">
                <summary class="flex justify-between items-center p-3 cursor-pointer list-none select-none hover:bg-gray-50">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    <span class="text-sm font-semibold text-gray-800 line-clamp-1">{cust.name}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">{cust.totalQuantity} SP</span>
                    <i data-feather="chevron-down" class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"></i>
                  </div>
                </summary>
                <div class="p-3 pt-0 border-t border-gray-100">
                  <table class="w-full text-xs mt-2">
                    {#each cust.products as p}
                      <tr class="border-b last:border-0 border-dashed border-gray-200">
                        <td class="py-2 pr-2 text-gray-600">{p.productName}</td>
                        <td class="py-2 text-right font-mono font-bold text-gray-800">{formatters.formatRevenue(p.realRevenue)}</td>
                      </tr>
                    {/each}
                  </table>
                </div>
              </details>
            {/each}
          </div>
        </div>

      </div>
    </div>
  {:else}
    <div class="p-10 text-center bg-gray-100 rounded-lg border border-dashed border-gray-300">
      <p class="text-gray-500">Không tìm thấy dữ liệu chi tiết cho nhân viên này.</p>
    </div>
  {/if}
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>