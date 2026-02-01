<script>
  import DepartmentGroup from './DepartmentGroup.svelte';
  import * as utils from '../../../utils.js';
  
  export let reportData = [];
  $: groupedData = reportData.reduce((acc, item) => {
      const dept = item.boPhan || 'Khác';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(item);
      return acc;
  }, {});
  $: departmentOrder = utils.getSortedDepartmentList(reportData);
</script>

<div class="animate-fade-in pb-10 sknv-summary-container" data-capture-group="health-staff-summary">
  {#if reportData.length === 0}
    <div class="p-12 text-center bg-gray-50 rounded-lg border border-gray-200">
      <p class="text-gray-500">Không có dữ liệu hiệu suất để hiển thị.</p>
    </div>
  {:else}
    {#each departmentOrder as deptName}
      {#if groupedData[deptName]}
        {@const sortedEmployees = [...groupedData[deptName]].sort((a, b) => b.totalAbove - a.totalAbove)}
        <DepartmentGroup 
          departmentName={deptName} 
          employees={sortedEmployees} 
          on:click 
        />
      {/if}
    {/each} {/if}
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.5s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* [FIX GENESIS Issue 2]: CSS CỨNG CHO CHẾ ĐỘ CHỤP ẢNH */
  :global(.capture-container .sknv-summary-container) {
      /* Tăng chiều rộng lên 1050px để chứa đủ 3 cột mà không quá chật */
      width: 1050px !important;
      min-width: 1050px !important;
      max-width: 1050px !important;
      padding: 20px !important;
      background-color: white;
  }

  /* [MODIFIED]: Chỉ ép Grid 3 cột cho danh sách nhân viên (có class sknv-employee-grid)
     Thay vì ép tất cả .grid (gây vỡ layout con) */
  :global(.capture-container .sknv-summary-container .sknv-employee-grid) {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important; 
      gap: 16px !important;
  }
</style>