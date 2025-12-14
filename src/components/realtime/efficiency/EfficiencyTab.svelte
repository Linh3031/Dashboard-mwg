<script>
  import { realtimeYCXData, selectedWarehouse } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  
  // [NEW] Sử dụng View mới thay vì EfficiencyTable cũ
  import PerformanceView from '../../health-staff/performance/PerformanceView.svelte';

  let filteredReport = [];

  $: {
    const currentWarehouse = $selectedWarehouse;
    // Lấy mục tiêu Realtime
    const settings = settingsService.getRealtimeGoalSettings(currentWarehouse);
    const goals = settings.goals || {};

    // Tính toán Master Report (isRealtime = true để xử lý đúng logic realtime)
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    // Lọc theo kho
    if (currentWarehouse) {
       filteredReport = masterReport.filter(nv => nv.maKho == currentWarehouse);
    } else {
       filteredReport = masterReport;
    }
  }
</script>

<div class="animate-fade-in pb-10">
    <PerformanceView reportData={filteredReport} />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>