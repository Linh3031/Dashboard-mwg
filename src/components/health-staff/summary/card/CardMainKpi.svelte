<script>
  export let aboveCount = 0;
  export let totalCount = 0;

  $: percentage = totalCount > 0 ? aboveCount / totalCount : 0;
  
  // Đồng bộ màu chữ và màu viền theo màu nền của EmployeeCard
  $: colorClass = percentage >= 0.7 ? 'text-emerald-700' : percentage >= 0.4 ? 'text-blue-700' : percentage >= 0.2 ? 'text-yellow-700' : 'text-red-700';
  $: borderColorClass = percentage >= 0.7 ? 'border-emerald-200' : percentage >= 0.4 ? 'border-blue-200' : percentage >= 0.2 ? 'border-yellow-200' : 'border-red-200';
</script>

<div class="flex items-center justify-between px-3 py-2 border-t border-dashed {borderColorClass} bg-white/40 backdrop-blur-sm">
  <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Chỉ số đạt</span>
  
  <div class="flex items-baseline gap-1">
    <span class="text-2xl font-extrabold {colorClass} leading-none">{aboveCount}</span>
    <span class="text-sm font-bold text-slate-400">/ {totalCount}</span>
  </div>
</div>