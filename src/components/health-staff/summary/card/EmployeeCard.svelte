<script>
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

  // [MODIFIED] Hàm lấy style nền và icon theo thứ hạng (Gamification)
  function getRankStyle(r) {
      if (r === 1) return { bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-300', icon: '🏆', rankText: 'text-yellow-600' };
      if (r === 2) return { bg: 'bg-gradient-to-br from-slate-200 to-slate-100 border-slate-300', icon: '🥈', rankText: 'text-slate-500' };
      if (r === 3) return { bg: 'bg-gradient-to-br from-orange-100 to-orange-50 border-orange-300', icon: '🥉', rankText: 'text-orange-600' };
      return { bg: 'bg-white border-gray-200', icon: `#${r}`, rankText: 'text-slate-300' };
  }

  $: rankConfig = getRankStyle(rank);
</script>

<div 
  class="rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative group h-full flex flex-col {rankConfig.bg}"
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <div class="absolute -right-2 -bottom-4 text-7xl font-black opacity-[0.08] {rankConfig.rankText} select-none pointer-events-none z-0 transition-transform group-hover:scale-110">
    #{rank}
  </div>

  <div class="p-3 flex items-start relative z-10">
    <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 font-black {rank <= 3 ? 'text-2xl -mt-1' : 'text-sm text-gray-500 bg-gray-100/70 rounded-lg'}">
        {rankConfig.icon}
    </div>

    <CardHeader 
        hoTen={employee.hoTen} 
        maNV={employee.maNV} 
        rank={rank} 
    />
  </div>

  <div class="flex-grow flex flex-col justify-end relative z-10">
    <CardMainKpi 
        aboveCount={totalAbove} 
        totalCount={totalCriteria} 
    />
  </div>
  
  <div class="relative z-10">
    <CardSubKpiGrid summary={summary} />
  </div>
</div>