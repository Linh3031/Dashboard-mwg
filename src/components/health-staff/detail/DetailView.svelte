<script>
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import { masterReportData } from '../../../stores.js';
  import { sknvService } from '../../../services/sknv.service.js';
  
  // Import Components con
  import DetailHeader from './DetailHeader.svelte';
  import MetricGrid from './MetricGrid.svelte';
  import DetailTableQDC from './DetailTableQDC.svelte';
  import DetailTableCategory from './DetailTableCategory.svelte';

  export let employeeId;

  const dispatch = createEventDispatcher();

  let employeeData = null;
  let detailStats = {};
  let qdcData = [];
  let nganhHangData = [];
  let totalAbove = 0;
  let totalCriteria = 0;

  // Reactive: Tính toán lại khi employeeId hoặc data thay đổi
  $: if (employeeId && $masterReportData.sknv.length > 0) {
      const rawEmployee = $masterReportData.sknv.find(e => String(e.maNV) === String(employeeId));
      
      if (rawEmployee) {
          // Tính trung bình bộ phận & Đánh giá
          const deptAvg = sknvService.calculateDepartmentAverages(rawEmployee.boPhan, $masterReportData.sknv);
          const evaluated = sknvService.evaluateEmployee(rawEmployee, deptAvg);
          
          totalAbove = evaluated.totalAbove;
          totalCriteria = evaluated.totalCriteria;
          employeeData = rawEmployee;

          // Lấy dữ liệu chi tiết cho Grid
          detailStats = sknvService.getDetailStats(rawEmployee, deptAvg);

          // Chuẩn bị dữ liệu cho Bảng QĐC
          if (rawEmployee.qdc) {
              qdcData = Object.entries(rawEmployee.qdc)
                  .map(([id, val]) => ({ id, ...val }))
                  .filter(item => (item.sl || 0) > 0)
                  .sort((a, b) => b.dtqd - a.dtqd);
          } else { qdcData = []; }

          // Chuẩn bị dữ liệu cho Bảng Ngành Hàng
          if (rawEmployee.doanhThuTheoNganhHang) {
              nganhHangData = Object.entries(rawEmployee.doanhThuTheoNganhHang)
                  .map(([name, val]) => ({ name, ...val }))
                  .filter(item => (item.revenue || 0) > 0)
                  .sort((a, b) => b.revenue - a.revenue);
          } else { nganhHangData = []; }
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
            <div class="space-y-6">
                <MetricGrid title="Doanh thu" icon="trending-up" colorClass="sknv-header-blue" data={detailStats.doanhThu || []} />
                <MetricGrid title="Hiệu quả khai thác" icon="award" colorClass="sknv-header-orange" data={detailStats.hieuQua || []} />
            </div>
            <div class="space-y-6">
                <MetricGrid title="Năng suất" icon="dollar-sign" colorClass="sknv-header-green" data={detailStats.nangSuat || []} />
                <MetricGrid title="Đơn giá" icon="tag" colorClass="sknv-header-yellow" data={detailStats.donGia || []} />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
            <DetailTableQDC data={qdcData} />
            <DetailTableCategory data={nganhHangData} />
        </div>

    {:else}
        <div class="p-12 text-center bg-red-50 rounded-lg border border-red-200">
            <p class="text-red-600 font-semibold">Không tìm thấy dữ liệu cho nhân viên này (ID: {employeeId}).</p>
        </div>
    {/if}
</div>

<style>
    /* Định nghĩa lại các class màu header dùng trong MetricGrid nếu chưa có trong global css */
    :global(.sknv-header-blue) { background-color: #2563eb; }
    :global(.sknv-header-green) { background-color: #16a34a; }
    :global(.sknv-header-orange) { background-color: #f97316; }
    :global(.sknv-header-yellow) { background-color: #ca8a04; }

    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>