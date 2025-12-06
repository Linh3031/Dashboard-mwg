<script>
  import DepartmentGroup from './DepartmentGroup.svelte';
  
  // [FIX LỖI QUAN TRỌNG]
  // Sai: import { utils } from '../../../utils.js';
  // Đúng: Import tất cả hàm (*) và đặt tên là 'utils'
  import * as utils from '../../../utils.js'; 
  
  export let reportData = [];

  // Gom nhóm nhân viên theo bộ phận
  $: groupedData = reportData.reduce((acc, item) => {
      const dept = item.boPhan || 'Khác';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(item);
      return acc;
  }, {});

  // Sắp xếp thứ tự bộ phận (Ưu tiên Tư Vấn)
  // Hàm này nằm trong utils.js, giờ gọi qua namespace 'utils' sẽ hoạt động
  $: departmentOrder = utils.getSortedDepartmentList(reportData);
</script>

<div class="animate-fade-in pb-10">
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
    {/each}
  {/if}
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.5s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>