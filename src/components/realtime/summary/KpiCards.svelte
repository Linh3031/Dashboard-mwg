<script>
  import { formatters } from '../../../utils/formatters.js';

  export let supermarketReport = {};
  export let goals = {};
  // Reactive variables để hiển thị
  $: doanhThu = supermarketReport.doanhThu || 0;
  $: doanhThuQD = supermarketReport.doanhThuQuyDoi || 0;
  $: doanhThuTraGop = supermarketReport.doanhThuTraGop || 0;
  $: doanhThuChuaXuat = supermarketReport.doanhThuChuaXuat || 0;
  $: doanhThuQDChuaXuat = supermarketReport.doanhThuQuyDoiChuaXuat || 0;
  $: hieuQuaQuyDoi = supermarketReport.hieuQuaQuyDoi || 0;
  $: tyLeTraCham = supermarketReport.tyLeTraCham || 0;
  // Mục tiêu
  $: targetDTT = parseFloat(goals?.doanhThuThuc) || 0;
  $: targetDTQD = parseFloat(goals?.doanhThuQD) || 0;
  $: targetTLQD = parseFloat(goals?.phanTramQD) || 0;

  // Tính % Hoàn thành
  $: percentDTT = targetDTT > 0 ? ((doanhThu / 1000000) / targetDTT) : 0;
  $: percentDTQD = targetDTQD > 0 ? ((doanhThuQD / 1000000) / targetDTQD) : 0;
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 capture-kpi-grid">
  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#38bdf8]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Doanh thu thực</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl kpi-value">
      {formatters.formatNumber(doanhThu / 1000000, 1)}
    </p>
    <div class="text-sm text-white opacity-90 kpi-sub">
      <p>% HT: <span class="font-bold">{formatters.formatPercentage(percentDTT)}</span> / Target: {formatters.formatNumber(targetDTT)}</p>
      <p class="mt-1 text-xs border-t border-white/30 pt-1 kpi-sub-row">DT Chưa xuất: <strong>{formatters.formatNumber(doanhThuChuaXuat / 1000000, 1)}</strong></p>
    </div>
  </div>

  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#34d399]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Doanh thu Quy đổi</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl kpi-value">
      {formatters.formatNumber(doanhThuQD / 1000000, 1)}
    </p>
    <div class="text-sm text-white opacity-90 kpi-sub">
      <p>% HT: <span class="font-bold">{formatters.formatPercentage(percentDTQD)}</span> / Target: {formatters.formatNumber(targetDTQD)}</p>
      <p class="mt-1 text-xs border-t border-white/30 pt-1 kpi-sub-row">DTQĐ Chưa xuất: <strong>{formatters.formatNumber(doanhThuQDChuaXuat / 1000000, 1)}</strong></p>
    </div>
  </div>

  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#fbbf24]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Tỷ lệ quy đổi</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl kpi-value">
      {formatters.formatPercentage(hieuQuaQuyDoi)}
    </p>
    <div class="text-sm text-white opacity-90 kpi-sub">
      <p>Mục tiêu: <span class="font-bold">{formatters.formatNumber(targetTLQD)}%</span></p>
      <p class="mt-1 text-xs italic kpi-sub-row">So với doanh thu thực</p>
    </div>
  </div>

  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#2dd4bf]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Doanh thu trả chậm</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl kpi-value">
      {formatters.formatNumber(doanhThuTraGop / 1000000, 1)}
    </p>
    <div class="text-sm text-white opacity-90 kpi-sub">
      <p>% thực trả chậm: <span class="font-bold">{formatters.formatPercentage(tyLeTraCham)}</span></p>
      <p class="mt-1 text-xs italic kpi-sub-row">Trên tổng doanh thu</p>
    </div>
  </div>
</div>

<style>
  .kpi-card {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .kpi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* [FIX GENESIS]: Tối ưu mật độ cho chế độ Capture (Ảnh 800px) */
  :global(.capture-container .capture-kpi-grid) {
      gap: 12px !important; /* Giảm khoảng cách giữa các thẻ */
  }

  :global(.capture-container .kpi-card) {
      padding: 12px 14px !important; /* Giảm padding để tăng diện tích nội dung */
      min-height: 140px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
  }

  :global(.capture-container .kpi-card-title) {
      font-size: 14px !important; /* Tiêu đề rõ ràng hơn */
      font-weight: 700 !important;
      opacity: 1 !important;
      margin-bottom: 4px !important;
  }

  :global(.capture-container .kpi-value) {
      font-size: 42px !important; /* Số liệu cực lớn */
      font-weight: 800 !important;
      line-height: 1 !important; /* Ép dòng sát lại */
      margin: 8px 0 !important;
  }

  :global(.capture-container .kpi-sub) {
      font-size: 14px !important;
      line-height: 1.3 !important;
  }
  
  :global(.capture-container .kpi-sub-row) {
      font-size: 13px !important;
      margin-top: 6px !important;
      padding-top: 6px !important;
  }
</style>