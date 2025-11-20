<script>
  // SỬA PATH: ../../ -> ../../../
  import { realtimeYCXData } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../modules/settings.service.js';
  
  // SỬA TÊN IMPORT: Đã đổi tên file bảng thành EfficiencyTable.svelte
  import EfficiencyTable from './EfficiencyTable.svelte';

  export let selectedWarehouse = '';

  let filteredReport = [];

  $: {
    // 1. Lấy mục tiêu
    const settings = settingsService.getRealtimeGoalSettings(selectedWarehouse);
    const goals = settings.goals || {};

    // 2. Tính Master Report
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    // 3. Lọc theo Kho
    if (selectedWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == selectedWarehouse);
    } else {
      filteredReport = masterReport;
    }
  }
</script>

<div class="animate-fade-in pb-10">
  {#if filteredReport.length > 0}
    <EfficiencyTable reportData={filteredReport} />
  {:else}
    <div class="p-12 text-center bg-gray-50 rounded-lg border border-gray-200">
      <p class="text-gray-500 text-lg">Không có dữ liệu hiệu quả nào phù hợp với bộ lọc.</p>
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
</style>