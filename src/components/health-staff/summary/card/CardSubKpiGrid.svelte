<script>
  export let summary; 

  const groups = [
    { key: 'doanhthu', label: 'Doanh Thu', icon: 'trending-up', bgClass: 'bg-blue-50 border-blue-100 text-blue-800' },
    { key: 'nangsuat', label: 'Năng Suất', icon: 'dollar-sign', bgClass: 'bg-green-50 border-green-100 text-green-800' },
    { key: 'hieuqua', label: 'Hiệu Quả', icon: 'award', bgClass: 'bg-orange-50 border-orange-100 text-orange-800' },
    { key: 'dongia', label: 'Đơn Giá', icon: 'tag', bgClass: 'bg-purple-50 border-purple-100 text-purple-800' }
  ];
</script>

<div class="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 border-t border-gray-100" 
     style="display: grid; grid-template-columns: repeat(2, 1fr) !important;">
  {#each groups as g}
    {@const data = summary[g.key]}
    {@const ratio = data.total > 0 ? data.above / data.total : 0}
    
    {@const valueColor = ratio > 0.5 ? 'text-blue-600' : 'text-red-600'}
    
    <div class="flex items-center justify-between p-1.5 rounded border {g.bgClass}">
      <div class="flex items-center gap-1 min-w-0">
        <i data-feather={g.icon} class="w-3 h-3 opacity-70 flex-shrink-0"></i>
        
        <span class="text-[9px] font-bold uppercase opacity-90" 
              style="line-height: 1.1 !important; white-space: nowrap !important; display: block !important; padding-top: 1px;">
            {g.label}
        </span>
      </div>
      <span class="text-xs font-extrabold {valueColor} flex-shrink-0">{data.above}/{data.total}</span>
    </div>
  {/each}
</div>