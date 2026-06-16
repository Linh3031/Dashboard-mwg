<script>
    import { formatters } from '../../../utils/formatters.js';
    export let targetGrowthPct; 
    export let kpiTotals;
    
    $: uiRatio = Math.round(targetGrowthPct * 100); 

    function handleRatioChange(e) {
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 0;
        uiRatio = val;
        targetGrowthPct = uiRatio / 100; 
    }

    const fmt = (val) => formatters.formatNumber(val / 1000000, 0);

    $: remainingDays = Math.max(0, (kpiTotals?.daysInMonth || 30) - (kpiTotals?.currentDay || 1));
    
    // TÍNH MỤC TIÊU: DT THỰC
    $: dtTarget = (kpiTotals?.dt25 || 0) * (1 + (uiRatio / 100));
    $: dtMissing = Math.max(0, dtTarget - (kpiTotals?.dt26 || 0));
    $: dtDaily = remainingDays > 0 ? dtMissing / remainingDays : 0; // Công thức chuẩn: RunRate = Còn thiếu / Ngày còn lại

    // TÍNH MỤC TIÊU: DT QUY ĐỔI
    $: qdTarget = (kpiTotals?.qd25 || 0) * (1 + (uiRatio / 100));
    $: qdMissing = Math.max(0, qdTarget - (kpiTotals?.qd26 || 0));
    $: qdDaily = remainingDays > 0 ? qdMissing / remainingDays : 0;
</script>

<div class="flex flex-col lg:flex-row gap-4 mb-4 bg-slate-50 p-4 rounded-xl border border-gray-200 shadow-sm items-center">
    
    <div class="w-full lg:w-1/3 flex flex-col pr-4 lg:border-r border-gray-200">
        <div class="flex justify-between items-center mb-3">
            <span class="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Tăng trưởng so CK
            </span>
            <div class="relative flex items-center">
                <input type="number" bind:value={uiRatio} on:change={handleRatioChange} class="w-16 py-1 px-2 text-center font-black text-indigo-800 bg-white border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm" />
                <span class="absolute right-2 top-1.5 text-[10px] text-gray-400 font-bold pointer-events-none">%</span>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-[10px] text-gray-400 font-bold">0%</span>
            <input type="range" min="0" max="100" step="1" value={uiRatio} on:input={handleRatioChange} class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600">
            <span class="text-[10px] text-gray-400 font-bold">100%</span>
        </div>
    </div>

    <div class="w-full lg:w-1/3 flex justify-between items-center px-4 lg:border-r border-gray-200">
        <div>
            <p class="text-[10px] text-blue-500 font-bold mb-1 uppercase">Mục tiêu: DT Thực</p>
            <h3 class="text-2xl font-black text-blue-800">{fmt(dtTarget)} <span class="text-[10px] font-medium text-gray-400">Tr</span></h3>
        </div>
        <div class="text-right">
            <p class="text-[10px] text-orange-500 font-bold mb-1">CÒN THIẾU ({remainingDays} NGÀY)</p>
            <h3 class="text-xl font-black text-orange-600">{fmt(dtMissing)}</h3>
            <p class="text-[10px] text-gray-500 mt-1 font-bold">Cần: <span class="text-orange-700">{fmt(dtDaily)} Tr/Ngày</span></p>
        </div>
    </div>

    <div class="w-full lg:w-1/3 flex justify-between items-center px-4">
        <div>
            <p class="text-[10px] text-emerald-500 font-bold mb-1 uppercase">Mục tiêu: DT Quy Đổi</p>
            <h3 class="text-2xl font-black text-emerald-800">{fmt(qdTarget)} <span class="text-[10px] font-medium text-gray-400">Tr</span></h3>
        </div>
        <div class="text-right">
            <p class="text-[10px] text-orange-500 font-bold mb-1">CÒN THIẾU ({remainingDays} NGÀY)</p>
            <h3 class="text-xl font-black text-orange-600">{fmt(qdMissing)}</h3>
            <p class="text-[10px] text-gray-500 mt-1 font-bold">Cần: <span class="text-orange-700">{fmt(qdDaily)} Tr/Ngày</span></p>
        </div>
    </div>

</div>