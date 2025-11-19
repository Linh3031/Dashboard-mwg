<script>
  import { realtimeYCXData } from '../../stores.js';
  import { reportService } from '../../services/reportService.js';
  import { settingsService } from '../../modules/settings.service.js';
  
  // Import Components con
  import RealtimeEmployeeTable from './RealtimeEmployeeTable.svelte';
  import RealtimeEmployeeDetail from './RealtimeEmployeeDetail.svelte';

  export let selectedWarehouse = '';

  // State quản lý view
  let selectedEmployeeId = null;

  // Reactive Variables cho dữ liệu báo cáo
  let masterReport = [];
  let filteredReport = [];

  // Tính toán dữ liệu báo cáo tổng hợp (Master Report)
  $: {
    // 1. Lấy mục tiêu
    const settings = settingsService.getRealtimeGoalSettings(selectedWarehouse);
    const goals = settings.goals || {};

    // 2. Tính Master Report
    masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);

    // 3. Lọc theo Kho (nếu có)
    if (selectedWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == selectedWarehouse);
    } else {
      filteredReport = masterReport;
    }
  }

  // Hàm xử lý sự kiện
  function handleViewDetail(event) {
    selectedEmployeeId = event.detail.employeeId;
  }

  function handleBack() {
    selectedEmployeeId = null;
  }
</script>

<div class="animate-fade-in">
  {#if selectedEmployeeId}
    <RealtimeEmployeeDetail 
      employeeId={selectedEmployeeId} 
      on:back={handleBack}
    />
  {:else}
    {#if filteredReport.length > 0}
      <RealtimeEmployeeTable 
        reportData={filteredReport} 
        on:viewDetail={handleViewDetail}
      />
    {:else}
      <div class="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
        <p class="text-gray-500">Không có dữ liệu nhân viên nào phù hợp với bộ lọc.</p>
      </div>
    {/if}
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