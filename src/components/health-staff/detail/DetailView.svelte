<script>
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { masterReportData } from '../../../stores.js';
  import { sknvService } from '../../../services/sknv.service.js';
  import { formatters } from '../../../utils/formatters.js';
  
  // Import Components con
  import DetailHeader from './DetailHeader.svelte';
  import MetricGrid from './MetricGrid.svelte';

  export let employeeId; // Nhận ID từ component cha

  const dispatch = createEventDispatcher();

  let employeeData = null;
  let detailStats = {};
  let qdcData = [];
  let nganhHangData = [];
  let totalAbove = 0;
  let totalCriteria = 0;

  // Reactive: Tính toán lại khi employeeId hoặc data thay đổi
  $: if (employeeId && $masterReportData.sknv.length > 0) {
      // 1. Tìm nhân viên
      const rawEmployee = $masterReportData.sknv.find(e => String(e.maNV) === String(employeeId));
      
      if (rawEmployee) {
          // 2. Tính trung bình bộ phận
          const deptAvg = sknvService.calculateDepartmentAverages(rawEmployee.boPhan, $masterReportData.sknv);
          
          // 3. Đánh giá nhân viên để lấy totalAbove/Criteria
          const evaluated = sknvService.evaluateEmployee(rawEmployee, deptAvg);
          totalAbove = evaluated.totalAbove;
          totalCriteria = evaluated.totalCriteria;
          employeeData = rawEmployee;

          // 4. Lấy dữ liệu chi tiết cho các Grid (Doanh thu, Năng suất...)
          detailStats = sknvService.getDetailStats(rawEmployee, deptAvg);

          // 5. Chuẩn bị dữ liệu cho Bảng QĐC (Logic từ ui-sknv.js cũ)
          if (rawEmployee.qdc) {
              qdcData = Object.entries(rawEmployee.qdc)
                  .map(([id, val]) => ({ id, ...val }))
                  .filter(item => (item.sl || 0) > 0)
                  .sort((a, b) => b.dtqd - a.dtqd);
          }

          // 6. Chuẩn bị dữ liệu cho Bảng Ngành Hàng
          if (rawEmployee.doanhThuTheoNganhHang) {
              nganhHangData = Object.entries(rawEmployee.doanhThuTheoNganhHang)
                  .map(([name, val]) => ({ name, ...val }))
                  .filter(item => (item.revenue || 0) > 0)
                  .sort((a, b) => b.revenue - a.revenue);
          }
      }
  }

  function goBack() {
      dispatch('back');
  }

  afterUpdate(() => {
      if (window.feather) window.feather.replace();
  });
</script>

<div class="animate-fade-in pb-10 max-w-7xl mx-auto">
    <div class="mb-4">
        <button on:click={goBack} class="text-blue-600 hover:underline font-semibold flex items-center gap-1">
            <i data-feather="chevron-left" class="w-4 h-4"></i> Quay lại bảng tổng hợp
        </button>
    </div>

    {#if employeeData}
        <DetailHeader employee={employeeData} {totalAbove} {totalCriteria} />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="space-y-6">
                <MetricGrid title="Doanh thu" icon="trending-up" colorClass="sknv-header-blue" data={detailStats.doanhThu || []} />
                <MetricGrid title="Hiệu quả khai thác" icon="award" colorClass="sknv-header-orange" data={detailStats.hieuQua || []} />
            </div>
            <div class="space-y-6">
                <MetricGrid title="Năng suất" icon="dollar-sign" colorClass="sknv-header-green" data={detailStats.nangSuat || []} />
                <MetricGrid title="Đơn giá" icon="tag" colorClass="sknv-header-yellow" data={detailStats.donGia || []} />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div class="sknv-detail-card-header sknv-header-indigo flex items-center gap-2 p-3 text-white">
                    <i data-feather="star" class="w-5 h-5"></i>
                    <h4 class="text-lg font-bold">Nhóm hàng Quy đổi cao</h4>
                </div>
                <div class="overflow-x-auto max-h-96">
                    <table class="w-full text-sm table-bordered table-striped">
                        <thead class="bg-gray-50 font-bold text-gray-700">
                            <tr>
                                <th class="px-3 py-2 text-left">Nhóm hàng</th>
                                <th class="px-3 py-2 text-right">SL</th>
                                <th class="px-3 py-2 text-right">DTQĐ (Tr)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#if qdcData.length === 0}
                                <tr><td colspan="3" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
                            {:else}
                                {#each qdcData as item}
                                    <tr class="border-t hover:bg-slate-50">
                                        <td class="px-3 py-2 font-medium">{item.name}</td>
                                        <td class="px-3 py-2 text-right font-bold">{formatters.formatNumber(item.sl)}</td>
                                        <td class="px-3 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</td>
                                    </tr>
                                {/each}
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div class="sknv-detail-card-header sknv-header-purple flex items-center gap-2 p-3 text-white">
                    <i data-feather="list" class="w-5 h-5"></i>
                    <h4 class="text-lg font-bold">Doanh thu theo Ngành hàng</h4>
                </div>
                <div class="overflow-x-auto max-h-96">
                    <table class="w-full text-sm table-bordered table-striped">
                        <thead class="bg-gray-50 font-bold text-gray-700">
                            <tr>
                                <th class="px-3 py-2 text-left">Ngành hàng</th>
                                <th class="px-3 py-2 text-right">SL</th>
                                <th class="px-3 py-2 text-right">Doanh thu</th>
                                <th class="px-3 py-2 text-right">DTQĐ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#if nganhHangData.length === 0}
                                <tr><td colspan="4" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
                            {:else}
                                {#each nganhHangData as item}
                                    <tr class="border-t hover:bg-slate-50">
                                        <td class="px-3 py-2 font-medium capitalize">{item.name}</td>
                                        <td class="px-3 py-2 text-right font-bold">{formatters.formatNumber(item.quantity)}</td>
                                        <td class="px-3 py-2 text-right font-bold text-gray-800">{formatters.formatRevenue(item.revenue, 0)}</td>
                                        <td class="px-3 py-2 text-right font-bold text-purple-600">{formatters.formatRevenue(item.revenueQuyDoi, 0)}</td>
                                    </tr>
                                {/each}
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    {:else}
        <div class="p-12 text-center bg-red-50 rounded-lg border border-red-200">
            <p class="text-red-600 font-semibold">Không tìm thấy dữ liệu cho nhân viên này.</p>
        </div>
    {/if}
</div>

<style>
    .sknv-header-blue { background-color: #2563eb; }
    .sknv-header-green { background-color: #16a34a; }
    .sknv-header-orange { background-color: #f97316; }
    .sknv-header-yellow { background-color: #ca8a04; }
    .sknv-header-indigo { background-color: #4f46e5; }
    .sknv-header-purple { background-color: #7e22ce; }
    
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>