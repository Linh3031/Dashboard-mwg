<script>
    import { modalState, luykeNameMappings } from '../../../stores.js';
    import { formatters } from '../../../utils/formatters.js';

    export let item;

    const COLOR_MAP = {
        blue: { text: 'text-blue-600', bg: 'bg-blue-500', border: 'border-blue-500' },
        yellow: { text: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-500' },
        red: { text: 'text-red-600', bg: 'bg-red-500', border: 'border-red-500' }
    };

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

<div class="bg-slate-100 border border-gray-200 border-l-4 {colors.border} rounded-lg p-3 flex flex-col h-full 
            {linkedProgram ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:ring-2 hover:ring-blue-400' : 'hover:shadow-md'} shadow-sm transition-all shadow-card-competition"
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
        <div class="font-bold text-gray-800 text-sm leading-snug flex-grow overflow-hidden h-[48px] line-clamp-2 capture-pt-title" title={item.name}>
            {displayTitle}
        </div>
        
        <span class="text-2xl font-extrabold {colors.text} leading-none flex-shrink-0 capture-pt-value">
           {formatters.formatPercentage(item.hoanThanhValue / 100)}
        </span>
    </div>

    <div class="w-full bg-white rounded-full h-1.5 mb-3 overflow-hidden border border-gray-200">
        <div class="h-1.5 rounded-full {colors.bg} transition-all duration-500" style="width: {Math.min(item.hoanThanhValue, 100)}%"></div>
    </div>

    <div class="mt-auto pt-2 border-t border-dashed border-gray-100 flex items-end justify-between gap-1 text-xs capture-pt-content-bottom">
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
                <div class="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black border border-red-200 whitespace-nowrap">
                    Cần: {formatters.formatNumberOrDash(dailyTarget)}/ngày
                </div>
             {:else}
                <div class="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black border border-blue-200 flex items-center justify-end gap-1 whitespace-nowrap">
                    <i data-feather="check-circle" class="w-3.5 h-3.5"></i> Đã đạt
                </div>
             {/if}
        </div>
    </div>
</div>