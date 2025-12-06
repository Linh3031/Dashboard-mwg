<script>
  export let summary; // Object chứa counts { doanhthu, nangsuat, ... }

  const groups = [
    { key: 'doanhthu', label: 'Doanh Thu', icon: 'trending-up' },
    { key: 'nangsuat', label: 'Năng Suất', icon: 'dollar-sign' },
    { key: 'hieuqua', label: 'Hiệu Quả', icon: 'award' },
    { key: 'dongia', label: 'Đơn Giá', icon: 'tag' }
  ];
</script>

<div class="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 border-t border-gray-100">
  {#each groups as g}
    {@const data = summary[g.key]}
    {@const ratio = data.total > 0 ? data.above / data.total : 0}
    {@const color = ratio >= 0.7 ? 'bg-green-50 text-green-700 border-green-200' : ratio >= 0.4 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}
    
    <div class="flex items-center justify-between p-1.5 rounded border {color}">
      <div class="flex items-center gap-1">
        <i data-feather={g.icon} class="w-3 h-3 opacity-75"></i>
        <span class="text-[10px] font-bold uppercase opacity-90">{g.label}</span>
      </div>
      <span class="text-xs font-extrabold">{data.above}/{data.total}</span>
    </div>
  {/each}
</div>