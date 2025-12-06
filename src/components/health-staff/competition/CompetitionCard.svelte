<script>
  import { formatters } from '../../../utils/formatters.js';
  
  export let item; // Dữ liệu của 1 chương trình
  
  // Tính toán logic hiển thị
  $: hoanThanhValue = item.hoanThanhValue || 0;
  $: isCompleted = hoanThanhValue >= 100;
  $: progressColor = isCompleted ? 'bg-blue-600' : 'bg-yellow-400';
  
  // Tính mục tiêu ngày (nếu chưa đạt)
  $: targetRemaining = (item.target || 0) - (item.luyKe || 0);
  $: daysLeft = Math.max(30 - (new Date().getDate()), 1);
  $: dailyTarget = (item.target > 0 && targetRemaining > 0) ? (targetRemaining / daysLeft) : 0;
</script>

<div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
    <p class="font-semibold text-gray-800 mb-2 text-sm line-clamp-2 h-10" title={item.name}>
        {item.name}
    </p>
    
    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2 relative">
        <div 
            class="h-full rounded-full transition-all duration-500 {progressColor}" 
            style="width: {Math.min(hoanThanhValue, 100)}%;"
        ></div>
        <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 drop-shadow-md">
            {formatters.formatPercentage(hoanThanhValue / 100)}
        </span>
    </div>

    <div class="flex justify-between items-end text-xs text-gray-600">
        <div>
            <div class="flex flex-col">
                <span>Lũy kế: <strong>{formatters.formatNumberOrDash(item.luyKe)}</strong></span>
                <span>Target: <strong>{formatters.formatNumberOrDash(item.target)}</strong></span>
            </div>
        </div>
        
        {#if isCompleted}
            <span class="font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Đạt</span>
        {:else}
            <div class="text-right">
                <span class="block text-gray-400">Cần/ngày:</span>
                <strong class="text-red-600">{formatters.formatNumberOrDash(dailyTarget)}</strong>
            </div>
        {/if}
    </div>
</div>