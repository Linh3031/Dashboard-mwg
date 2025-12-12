<script>
  import { realtimeYCXData, selectedWarehouse } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  
  import QdcTable from './QdcTable.svelte';
  import CategoryTable from './CategoryTable.svelte';
  import EfficiencyTable from '../efficiency/EfficiencyTable.svelte';
  
  import KpiCards from './KpiCards.svelte'; // Giả sử đã tách KPI cards (nếu chưa thì giữ code cũ, ở đây tôi giữ nguyên cấu trúc)

  // Biến local
  let supermarketReport = {};
  let goals = {};
  
  // Data cho các bảng con
  let qdcItems = [];
  let categoryItems = [];
  let unexportedItems = []; 
  
  // Biến chứa raw data đã lọc để truyền cho CategoryTable vẽ biểu đồ Hãng
  let rawSourceData = [];

  // Reactive Calculation
  $: {
    const currentWarehouse = $selectedWarehouse;
    const settings = settingsService.getRealtimeGoalSettings(currentWarehouse);
    goals = settings.goals || {};

    // 1. Master Report
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    // 2. Filter theo kho
    let filteredReport = masterReport;
    let filteredRawData = $realtimeYCXData;

    if (currentWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == currentWarehouse);
      const visibleEmployees = new Set(filteredReport.map(nv => String(nv.maNV)));
      filteredRawData = $realtimeYCXData.filter(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          return msnvMatch && visibleEmployees.has(msnvMatch[1].trim());
      });
    }
    
    // Gán vào biến để truyền xuống dưới
    rawSourceData = filteredRawData;

    // 3. Aggregate
    supermarketReport = reportService.aggregateReport(filteredReport, currentWarehouse);

    // 4. Prepare Sub-tables
    
    // [FIX] SỬA LỖI: Lấy dữ liệu từ nhomHangChiTiet thay vì qdc để hiển thị TOÀN BỘ nhóm hàng
    qdcItems = supermarketReport.nhomHangChiTiet 
        ? Object.entries(supermarketReport.nhomHangChiTiet)
            .map(([name, values]) => ({
                id: name,
                name,
                dtqd: values.revenueQuyDoi,
                sl: values.quantity,
                dt: values.revenue,
                ...values
            }))
            // Lọc bỏ những nhóm không có số liệu để danh sách gọn hơn (tùy chọn)
            .filter(i => i.sl > 0 || i.dt > 0) 
        : [];

    categoryItems = supermarketReport.nganhHangChiTiet 
        ? Object.values(supermarketReport.nganhHangChiTiet).filter(i => i.revenue > 0 || i.quantity > 0)
        : [];

    unexportedItems = reportService.generateRealtimeChuaXuatReport(filteredRawData);
  }

  // Helper tính % KPI
  $: pctDTT = (parseFloat(goals?.doanhThuThuc) || 0) > 0 ? (supermarketReport.doanhThu / 1000000) / parseFloat(goals.doanhThuThuc) : 0;
  $: pctDTQD = (parseFloat(goals?.doanhThuQD) || 0) > 0 ? (supermarketReport.doanhThuQuyDoi / 1000000) / parseFloat(goals.doanhThuQD) : 0;
</script>

<div class="luyke-dashboard-container pb-10">
  
  <h2 id="realtime-supermarket-title" class="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
    <i data-feather="zap" class="text-yellow-500 fill-current"></i>
    Báo cáo Realtime {$selectedWarehouse ? `- Kho ${$selectedWarehouse}` : '(Toàn bộ)'}
    <span class="text-sm font-normal text-gray-500 ml-2 pt-1">
      (Cập nhật: {new Date().toLocaleTimeString('vi-VN')})
    </span>
  </h2>

  <div id="realtime-kpi-cards-container" class="kpi-grid-fixed">
      <div class="kpi-card-solid bg-[#38bdf8]">
          <div class="kpi-solid-header">Doanh Thu Thực <i data-feather="dollar-sign"></i></div>
          <div class="kpi-solid-value">{formatters.formatNumber((supermarketReport.doanhThu || 0) / 1000000, 1)}</div>
          <div class="kpi-solid-sub">
              <span>% HT: {formatters.formatPercentage(pctDTT)}</span>
              <span>MT: {formatters.formatNumber(goals?.doanhThuThuc || 0)}</span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="dollar-sign"></i></div>
      </div>

      <div class="kpi-card-solid bg-[#34d399]">
          <div class="kpi-solid-header">DT Quy Đổi <i data-feather="refresh-cw"></i></div>
          <div class="kpi-solid-value">{formatters.formatNumber((supermarketReport.doanhThuQuyDoi || 0) / 1000000, 1)}</div>
          <div class="kpi-solid-sub">
              <span>% HT: {formatters.formatPercentage(pctDTQD)}</span>
              <span>MT: {formatters.formatNumber(goals?.doanhThuQD || 0)}</span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="refresh-cw"></i></div>
      </div>

      <div class="kpi-card-solid bg-[#fbbf24]">
          <div class="kpi-solid-header">Tỷ lệ Quy Đổi <i data-feather="trending-up"></i></div>
          <div class="kpi-solid-value">{formatters.formatPercentage(supermarketReport.hieuQuaQuyDoi || 0)}</div>
          <div class="kpi-solid-sub">
              <span>Mục tiêu: {formatters.formatNumber(goals?.phanTramQD || 0)}%</span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="trending-up"></i></div>
      </div>

      <div class="kpi-card-solid bg-[#2dd4bf]">
          <div class="kpi-solid-header">Trả Chậm <i data-feather="credit-card"></i></div>
          <div class="kpi-solid-value">{formatters.formatPercentage(supermarketReport.tyLeTraCham || 0)}</div>
          <div class="kpi-solid-sub">
              <span>Doanh số: {formatters.formatNumber((supermarketReport.doanhThuTraGop || 0) / 1000000, 1)}</span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="credit-card"></i></div>
      </div>
  </div>

  <div class="luyke-tier-1-grid">
      <EfficiencyTable 
          supermarketData={supermarketReport} 
          dynamicItems={[]} 
          goals={goals}
      />
      <QdcTable items={qdcItems} />
  </div>

  <div>
      <CategoryTable 
          items={categoryItems} 
          unexportedItems={unexportedItems}
          rawSource={rawSourceData}
      />
  </div>

</div>