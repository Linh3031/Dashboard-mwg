<script>
  import MedalIcon from '../../shared/MedalIcon.svelte';
  import CardHeader from './CardHeader.svelte';
  import CardMainKpi from './CardMainKpi.svelte';
  import CardSubKpiGrid from './CardSubKpiGrid.svelte';
  import { createEventDispatcher } from 'svelte';

  export let employee;
  export let rank; // 1, 2, 3...

  const dispatch = createEventDispatcher();
  
  // Tính tổng điểm để hiển thị Main KPI (Trừ QĐC)
  $: summary = employee.summary;
  $: totalAbove = employee.totalAbove;
  $: totalCriteria = employee.totalCriteria;

  function handleClick() {
    dispatch('click', { employeeId: employee.maNV });
  }
</script>

<div 
  class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative group"
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <div class="p-3 flex items-start relative z-10">
    <MedalIcon {rank} />
    <CardHeader hoTen={employee.hoTen} maNV={employee.maNV} boPhan={employee.boPhan} />
  </div>

  <CardMainKpi aboveCount={totalAbove} totalCount={totalCriteria} />
  <CardSubKpiGrid {summary} />
</div>