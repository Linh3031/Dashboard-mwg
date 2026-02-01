<script>
  import { realtimeYCXData, selectedWarehouse } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  
  import EmployeeList from './EmployeeList.svelte';
  import EmployeeDetail from './EmployeeDetail.svelte';
  
  // [GENESIS UPDATE] Lưu trữ object nhân viên thay vì chỉ ID
  let selectedEmployee = null;
  let filteredReport = [];

  $: {
    const currentWarehouse = $selectedWarehouse;
    const settings = settingsService.getRealtimeGoalSettings(currentWarehouse);
    const goals = settings.goals || {};
    
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    if (currentWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == currentWarehouse);
    } else {
      filteredReport = masterReport;
    }
    
    console.log(`[EmployeeTab] Report generated for ${filteredReport.length} employees (Warehouse: ${currentWarehouse}).`);
  }

  function handleViewDetail(event) {
    const empId = event.detail.employeeId;
    // [GENESIS UPDATE] Tìm object nhân viên từ list đã lọc để đảm bảo có tên đúng
    const foundEmployee = filteredReport.find(e => String(e.maNV) === String(empId));
    if (foundEmployee) {
        selectedEmployee = foundEmployee;
    } else {
        console.warn('Không tìm thấy thông tin nhân viên:', empId);
    }
  }

  function handleBack() {
    selectedEmployee = null;
  }
</script>

<div class="animate-fade-in">
  {#if selectedEmployee}
    <EmployeeDetail 
      employee={selectedEmployee} 
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