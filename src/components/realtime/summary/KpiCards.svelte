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

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#38bdf8]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Doanh thu thực</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl">
      {formatters.formatNumber(doanhThu / 1000000, 1)}
    </p>
    <div class="text-sm text-white opacity-90">
      <p>% HT: <span class="font-bold">{formatters.formatPercentage(percentDTT)}</span> / Target: {formatters.formatNumber(targetDTT)}</p>
      <p class="mt-1 text-xs border-t border-white/30 pt-1">DT Chưa xuất: <strong>{formatters.formatNumber(doanhThuChuaXuat / 1000000, 1)}</strong></p>
    </div>
  </div>

  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#34d399]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Doanh thu Quy đổi</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl">
      {formatters.formatNumber(doanhThuQD / 1000000, 1)}
    </p>
    <div class="text-sm text-white opacity-90">
      <p>% HT: <span class="font-bold">{formatters.formatPercentage(percentDTQD)}</span> / Target: {formatters.formatNumber(targetDTQD)}</p>
      <p class="mt-1 text-xs border-t border-white/30 pt-1">DTQĐ Chưa xuất: <strong>{formatters.formatNumber(doanhThuQDChuaXuat / 1000000, 1)}</strong></p>
    </div>
  </div>

  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#fbbf24]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Tỷ lệ quy đổi</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl">
      {formatters.formatPercentage(hieuQuaQuyDoi)}
    </p>
    <div class="text-sm text-white opacity-90">
      <p>Mục tiêu: <span class="font-bold">{formatters.formatNumber(targetTLQD)}%</span></p>
      <p class="mt-1 text-xs italic">So với doanh thu thực</p>
    </div>
  </div>

  <div class="kpi-card p-6 rounded-2xl shadow-lg bg-[#2dd4bf]">
    <h4 class="kpi-card-title font-semibold uppercase tracking-wider text-white opacity-90">Doanh thu trả chậm</h4>
    <p class="font-bold mt-2 mb-3 text-white text-4xl">
      {formatters.formatNumber(doanhThuTraGop / 1000000, 1)}
    </p>
    <div class="text-sm text-white opacity-90">
      <p>% thực trả chậm: <span class="font-bold">{formatters.formatPercentage(tyLeTraCham)}</span></p>
      <p class="mt-1 text-xs italic">Trên tổng doanh thu</p>
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
</style>