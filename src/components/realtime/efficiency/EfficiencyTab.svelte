<script>
  import { realtimeYCXData, selectedWarehouse } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  
  // [THAY ĐỔI QUAN TRỌNG] Import bảng từ Health Staff để đồng bộ giao diện
  import EfficiencyTable from '../../health-staff/EfficiencyTable.svelte';

  // Biến dữ liệu
  let filteredReport = [];

  $: {
    // 1. Lấy dữ liệu & Mục tiêu
    const currentWarehouse = $selectedWarehouse;
    const settings = settingsService.getRealtimeGoalSettings(currentWarehouse);
    const goals = settings.goals || {};

    // 2. Tính toán Master Report (Array danh sách nhân viên)
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    // 3. Lọc theo kho
    if (currentWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == currentWarehouse);
    } else {
      filteredReport = masterReport;
    }
  }
</script>

<div class="animate-fade-in pb-10">
    <EfficiencyTable reportData={filteredReport} />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>