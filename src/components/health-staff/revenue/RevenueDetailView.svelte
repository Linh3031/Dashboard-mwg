<script>
  import { createEventDispatcher } from 'svelte';
  import { 
      masterReportData, 
      ycxData, 
      ycxDataThangTruoc, 
      selectedWarehouse, 
      luykeGoalSettings, 
      modalState 
  } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { dataProcessing } from '../../../services/dataProcessing.js';
  import { formatters } from '../../../utils/formatters.js';
  
  import DetailHeader from '../detail/DetailHeader.svelte';
  import RevenueKpiBoard from './RevenueKpiBoard.svelte';
  import DailyPerfChart from './DailyPerfChart.svelte';
  import RevenueTopGroups from './RevenueTopGroups.svelte';

  export let employeeId;
  export let isGhostMode = false; // [TÍNH NĂNG MỚI]: Bật khi chạy Background Rendering

  const dispatch = createEventDispatcher();

  let detailData = null;
  let employeeData = null;
  let goals = {};
  
  // --- THIẾT LẬP THỜI GIAN ---
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

  // --- TÍNH TOÁN TARGET ---
  $: currentGoals = ($luykeGoalSettings && $selectedWarehouse) ? $luykeGoalSettings[$selectedWarehouse] || {} : {};
  $: shopTargetQD = (parseFloat(currentGoals.doanhThuQD || 0) * 1000000);
  $: employeeCount = $masterReportData.sknv ? $masterReportData.sknv.length : 1;
  $: targetCaNhan = shopTargetQD / employeeCount;

  // --- TÍNH TOÁN CÙNG KỲ ---
  $: dtqdCK = (() => {
      if (!$ycxDataThangTruoc || !employeeId) return 0;
      const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
      const today = new Date();
      const targetDate = new Date(today.getFullYear(), today.getMonth() - (today.getDate() === 1 ? 2 : 1), 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      let totalCK = 0;
      $ycxDataThangTruoc.forEach(row => {
          if (!row.ngayTao || !(row.ngayTao instanceof Date)) return;
          if (row.ngayTao.getMonth() !== targetMonth || row.ngayTao.getFullYear() !== targetYear) return;

          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          if (msnvMatch && msnvMatch[1].trim() === String(employeeId)) {
              const isDaXuat = !row.trangThaiXuat || ['Đã xuất', 'Đã giao'].includes(row.trangThaiXuat.trim());
              const isBaseValid = (row.trangThaiThuTien || '').trim() === 'Đã thu' &&
                                  (row.trangThaiHuy || '').trim() === 'Chưa hủy' &&
                                  (row.tinhTrangTra || '').trim() === 'Chưa trả';

              if (hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat) && isDaXuat && isBaseValid) {
                  totalCK += (row.revenueQuyDoi || 0);
              }
          }
      });
      return totalCK;
  })();

  // --- TÍNH TOÁN TRẢ CHẬM ---
  $: traChamStats = (() => {
      let dtThucTC = 0;
      let dtqdTC = 0;
      if (!$ycxData || !employeeId) return { dtThucTC, dtqdTC };
      const hinhThucXuatTraGop = dataProcessing.getHinhThucXuatTraGop();
      
      $ycxData.forEach(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          if (msnvMatch && msnvMatch[1].trim() === String(employeeId)) {
              const isDaXuat = !row.trangThaiXuat || ['Đã xuất', 'Đã giao'].includes(row.trangThaiXuat.trim());
              const isBaseValid = (row.trangThaiThuTien || '').trim() === 'Đã thu' &&
                                  (row.trangThaiHuy || '').trim() === 'Chưa hủy' &&
                                  (row.tinhTrangTra || '').trim() === 'Chưa trả';
                                  
              if (hinhThucXuatTraGop.has(row.hinhThucXuat) && isDaXuat && isBaseValid) {
                  dtThucTC += parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                  dtqdTC += (row.revenueQuyDoi || 0);
              }
          }
      });
      return { dtThucTC, dtqdTC };
  })();

  // --- GỘP DỮ LIỆU ĐỂ TRUYỀN XUỐNG KPI BOARD ---
  $: enrichedSummary = detailData ? {
      ...detailData.summary,
      targetCaNhan: targetCaNhan,
      dtqdCK: dtqdCK,
      duKienSoCK: ((detailData.summary.totalConvertedRevenue / currentDay) * daysInMonth) - dtqdCK,
      tyLeHoanThanh: targetCaNhan > 0 ? ((detailData.summary.totalConvertedRevenue / currentDay) * daysInMonth) / targetCaNhan : 0,
      dtThucTC: traChamStats.dtThucTC,
      dtqdTC: traChamStats.dtqdTC,
      tyLeTraCham: detailData.summary.totalRealRevenue > 0 ? traChamStats.dtThucTC / detailData.summary.totalRealRevenue : 0,
      tyLeBanKem: detailData.summary.totalOrders > 0 ? detailData.summary.bundledOrderCount / detailData.summary.totalOrders : 0
  } : null;

  $: if (employeeId && $ycxData.length > 0) {
      employeeData = $masterReportData.sknv.find(e => String(e.maNV) === String(employeeId));
      if (employeeData) {
          const settings = settingsService.getLuykeGoalSettings(employeeData.maKho);
          goals = settings.goals || {};
          detailData = reportService.generateLuyKeEmployeeDetailReport(employeeId, $ycxData);
      }
  }

  function goBack() { 
      dispatch('back');
  }

  // Đã bỏ openUnexportedModal theo yêu cầu

  function openOrdersModal() {
      if (isGhostMode) return; // Khóa modal nếu đang chụp ẩn
      if (detailData) {
          modalState.update(s => ({ 
              ...s, 
              activeModal: 'customer-detail-modal',
              payload: { 
                  customers: detailData.byCustomer || [],
                  mucTieu: employeeData ? employeeData.mucTieu : {}
              }
          }));
      }
  }
</script>

<div 
    class="animate-fade-in pb-10 max-w-7xl mx-auto {isGhostMode ? 'p-6 bg-white w-[1000px]' : ''}"
    data-capture-group="revenue-detail-mobile"
    data-capture-filename={employeeData ? `DTLK_ChiTiet_${employeeData.hoTen}_${employeeData.maNV}` : 'ChiTietNhanVien'}
>
    {#if !isGhostMode}
    <div class="mb-4 flex justify-between items-center">
        <button on:click={goBack} class="text-blue-600 hover:underline font-semibold flex items-center gap-1">
            <i data-feather="chevron-left" class="w-4 h-4"></i> Quay lại bảng tổng hợp
        </button>
    </div>
    {/if}

    {#if employeeData && enrichedSummary}
        <DetailHeader employee={employeeData} showStats={false} />
        
        <RevenueKpiBoard 
            summary={enrichedSummary} 
            {goals} 
            on:viewOrders={openOrdersModal}
        />
        
        <DailyPerfChart dailyStats={detailData.dailyStats} />
        
        <RevenueTopGroups 
            topProductGroups={detailData.topProductGroups} 
            categoryChartData={detailData.categoryChartData} 
        />

    {:else}
        <div class="p-12 text-center bg-red-50 rounded-lg border border-red-200">
            <p class="text-red-600 font-semibold">Không tìm thấy dữ liệu chi tiết cho nhân viên này.</p>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>