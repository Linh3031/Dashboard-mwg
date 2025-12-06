<script>
  // Version 1.1 - Fix import paths (modules -> services)
  import { realtimeYCXData } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  // [FIX] Cập nhật đường dẫn đúng: modules -> services
  import { settingsService } from '../../../services/settings.service.js';
  
  import EmployeeList from './EmployeeList.svelte';
  import EmployeeDetail from './EmployeeDetail.svelte';

  export let selectedWarehouse = '';
  
  let selectedEmployeeId = null;
  let masterReport = [];
  let filteredReport = [];

  $: {
    const settings = settingsService.getRealtimeGoalSettings(selectedWarehouse);
    const goals = settings.goals || {};
    masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    if (selectedWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == selectedWarehouse);
    } else {
      filteredReport = masterReport;
    }
  }

  function handleViewDetail(event) {
    selectedEmployeeId = event.detail.employeeId;
  }

  function handleBack() {
    selectedEmployeeId = null;
  }
</script>

<div class="animate-fade-in">
  {#if selectedEmployeeId}
    <EmployeeDetail 
      employeeId={selectedEmployeeId} 
      on:back={handleBack}
    />
  {:else}
    {#if filteredReport.length > 0}
      <EmployeeList 
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