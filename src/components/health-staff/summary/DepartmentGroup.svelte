<script>
  import EmployeeCard from './card/EmployeeCard.svelte';
  
  export let departmentName;
  export let employees = [];
  
  // Priority styling cho "Tư Vấn - ĐM"
  $: isPriority = departmentName.includes('Tư Vấn');
  $: headerClass = isPriority 
    ? 'bg-blue-50 text-blue-800 border-blue-200' 
    : 'bg-gray-50 text-gray-700 border-gray-200';
</script>

<div class="mb-8 last:mb-0">
  <div class="flex items-center gap-3 px-4 py-3 rounded-t-lg border-b-2 {headerClass}">
    <h3 class="text-lg font-bold uppercase tracking-wide">{departmentName}</h3>
    <span class="bg-white/50 px-2 py-0.5 rounded text-xs font-bold">{employees.length} NV</span>
  </div>
  
  <div class="p-4 bg-slate-50/30 border-x border-b border-gray-200 rounded-b-lg">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each employees as emp, index (emp.maNV)}
        <EmployeeCard employee={emp} rank={index + 1} on:click />
      {/each}
    </div>
  </div>
</div>