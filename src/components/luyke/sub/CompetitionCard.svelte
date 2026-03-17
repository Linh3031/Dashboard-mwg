<script>
    import { modalState, luykeNameMappings } from '../../../stores.js';
    import { formatters } from '../../../utils/formatters.js';

    export let item;

    const COLOR_MAP = {
        blue: { text: 'text-blue-600', bg: 'bg-blue-500', border: 'border-blue-500' },
        yellow: { text: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-500' },
        red: { text: 'text-red-600', bg: 'bg-red-500', border: 'border-red-500' }
    };

    function truncateTextSimple(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    $: isProjectedCompleted = item.hoanThanhValue >= 100;
    $: isActualCompleted = item.luyKe >= item.target;
    $: colorKey = isProjectedCompleted ? 'blue' : (item.hoanThanhValue >= 80 ? 'yellow' : 'red');
    $: colors = COLOR_MAP[colorKey];
    $: targetRemaining = (item.target || 0) - (item.luyKe || 0);
    $: daysLeft = Math.max(30 - (new Date().getDate()), 1);
    $: dailyTarget = (item.target > 0 && targetRemaining > 0) ? (targetRemaining / daysLeft) : 0;

    $: mappingData = $luykeNameMappings && $luykeNameMappings[item.name];
    $: displayTitle = (typeof mappingData === 'object' && mappingData !== null) ? (mappingData.shortName || item.name) : (mappingData || item.name);
    $: linkedProgram = (typeof mappingData === 'object' && mappingData !== null) ? mappingData.linkedEmpProgram : null;
</script>

<div class="bg-white border border-t-4 {colors.border} rounded-lg p-3 shadow-sm transition-all flex flex-col h-full 
            {linkedProgram ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-blue-400' : 'hover:shadow-sm'}"
     on:click={() => {
         if (linkedProgram) {
             modalState.update(s => ({ 
                 ...s, 
                 activeModal: 'st-emp-competition-modal', 
                 payload: { 
                     targetProgram: linkedProgram, 
                     title: displayTitle,
                     totalTarget: item.target || 0 
                 } 
             }));
         }
     }}
>
    <div class="flex justify-between items-start gap-3 mb-4 relative">
        <div class="font-bold text-gray-800 text-sm leading-snug flex-grow overflow-hidden" 
            title={item.name}
            style="height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            {truncateTextSimple(displayTitle)}
        </div>
        
        <span class="text-2xl font-extrabold {colors.text} leading-none flex-shrink-0">
           {formatters.formatPercentage(item.hoanThanhValue / 100)}
        </span>
    </div>

    <div class="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
        <div class="h-1.5 rounded-full {colors.bg} transition-all duration-500" style="width: {Math.min(item.hoanThanhValue, 100)}%"></div>
    </div>

    <div class="mt-auto pt-2 border-t border-dashed border-gray-100 flex items-end justify-between gap-1 text-xs">
        <div class="flex-shrink-0">
            <span class="block text-[10px] text-gray-400 uppercase font-semibold">TH / MT</span>
            <div class="text-gray-700 font-bold whitespace-nowrap">
                <span>{formatters.formatNumberOrDash(item.luyKe)}</span>
                <span class="text-gray-300 font-normal mx-0.5">/</span>
                <span>{formatters.formatNumberOrDash(item.target)}</span>
            </div>
        </div>
        
        <div class="text-right flex-shrink-0">
             {#if !isActualCompleted}
                <div class="inline-block bg-red-50 text-red-600 px-1.5 py-1 rounded text-[10px] font-bold border border-red-200 whitespace-nowrap">
                    Cần: {formatters.formatNumberOrDash(dailyTarget)}/ngày
                </div>
             {:else}
                <div class="inline-block bg-blue-50 text-blue-600 px-1.5 py-1 rounded text-[10px] font-bold border border-blue-200 flex items-center justify-end gap-1 whitespace-nowrap">
                    <i data-feather="check-circle" class="w-3 h-3"></i> Đã đạt
                </div>
             {/if}
        </div>
    </div>
</div>