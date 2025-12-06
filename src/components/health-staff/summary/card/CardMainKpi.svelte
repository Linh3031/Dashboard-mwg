<script>
  export let aboveCount = 0;
  export let totalCount = 0;

  $: percentage = totalCount > 0 ? aboveCount / totalCount : 0;
  $: colorClass = percentage >= 0.7 ? 'text-green-600' : percentage >= 0.4 ? 'text-yellow-500' : 'text-red-500';
  $: borderColorClass = percentage >= 0.7 ? 'border-t-green-500' : percentage >= 0.4 ? 'border-t-yellow-500' : 'border-t-red-500';
</script>

<div class="text-center py-2 border-t-4 {borderColorClass} bg-slate-50/50 mt-2">
  <div class="flex items-baseline justify-center gap-1">
    <span class="text-3xl font-extrabold {colorClass} leading-none">{aboveCount}</span>
    <span class="text-sm font-bold text-gray-400">/ {totalCount}</span>
  </div>
  <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Chỉ số đạt</span>
</div>