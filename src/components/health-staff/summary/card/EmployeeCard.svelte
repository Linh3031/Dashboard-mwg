<script>
  import MedalIcon from '../../shared/MedalIcon.svelte';
  import CardHeader from './CardHeader.svelte';
  import CardMainKpi from './CardMainKpi.svelte';
  import CardSubKpiGrid from './CardSubKpiGrid.svelte';
  import { createEventDispatcher } from 'svelte';

  export let employee;
  export let rank;
  const dispatch = createEventDispatcher();
  
  $: summary = employee.summary;
  $: totalAbove = employee.totalAbove;
  $: totalCriteria = employee.totalCriteria;

  function handleClick() {
    dispatch('click', { employeeId: employee.maNV });
  }
</script>

<style>
    /* 1. Ép wrapper thành Flexbox để căn giữa theo trục dọc/ngang */
    :global(.capture-container) .rank-wrapper {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important; /* Chiếm hết chiều cao cha để căn giữa */
        padding: 0 !important;
        margin: 0 !important;
    }

    /* 2. Xuyên thủng vào mọi thứ bên trong MedalIcon (kể cả thẻ span/div/svg) */
    :global(.capture-container) .rank-wrapper :global(*) {
        line-height: 1 !important;   /* Reset chiều cao dòng */
        padding-top: 0 !important;   /* Xóa padding rác */
        padding-bottom: 0 !important;
        margin: 0 !important;
        
        /* [QUAN TRỌNG]: Kỹ thuật "Nâng visual". 
           Kéo ngược nội dung lên 2px để bù lại độ lệch do font hệ thống */
        transform: translateY(-2px) !important; 
    }
</style>

<div 
  class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative group h-full flex flex-col"
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <div class="p-3 flex items-start relative z-10">
    <div class="flex-shrink-0 rank-wrapper">
        <MedalIcon {rank} />
    </div>

    <CardHeader 
        hoTen={employee.hoTen} 
        maNV={employee.maNV} 
        rank={rank} 
    />
  </div>

  <div class="flex-grow flex flex-col justify-end">
    <CardMainKpi 
        aboveCount={totalAbove} 
        totalCount={totalCriteria} 
    />
  </div>
  
  <CardSubKpiGrid summary={summary} />
</div>