<script>
  import { realtimeYCXData, selectedWarehouse } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  
  // [THAY ĐỔI QUAN TRỌNG] Import bảng Doanh thu động từ Health Staff
  // Component này tự động đọc store `customRevenueTables` nên sẽ đồng bộ cấu hình bảng
  import CategoryRevenueView from '../../health-staff/CategoryRevenueView.svelte';

  export let selectedWarehouseProp = ''; // Nhận prop từ cha nếu có, hoặc dùng store

  let filteredReport = [];

  $: {
    // 1. Ưu tiên dùng prop, nếu không thì dùng store global
    const currentWarehouse = selectedWarehouseProp || $selectedWarehouse;
    
    // 2. Lấy mục tiêu (để tính % đạt nếu cần)
    const settings = settingsService.getRealtimeGoalSettings(currentWarehouse);
    const goals = settings.goals || {};

    // 3. Tính toán Master Report từ dữ liệu Realtime
    // isRealtime = true để logic tính toán xử lý đúng các trường đặc thù
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    // 4. Lọc theo kho
    if (currentWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == currentWarehouse);
    } else {
      filteredReport = masterReport;
    }
  }
</script>

<div class="animate-fade-in pb-10">
    <CategoryRevenueView reportData={filteredReport} />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>