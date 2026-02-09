<script>
    import { formatters } from '../../../utils/formatters.js';
    import { selectedWarehouse } from '../../../stores.js';

    // Props nhận từ cha
    export let totalTarget = 0;   // Mục tiêu tháng (Quy đổi)
    export let currentRevenue = 0; // Đã đạt (Quy đổi)
    export let warehouseId = '';

    // State nội bộ
    let targetRatio = 100;
    let remainingDays = 1;

    // --- HELPER FORMAT ---
    // Yêu cầu: Số nguyên (0 số lẻ) cho gọn
    const fmt = (val) => formatters.formatNumber(val / 1000000, 0);

    // --- LOGIC TÍNH NGÀY ---
    function calculateDays() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const currentDay = now.getDate();
        let remain = daysInMonth - currentDay;
        return remain > 0 ? remain : 0; 
    }

    // --- TÍNH TOÁN SỐ LIỆU ---
    function calculateMetrics(ratio, tTarget, cRevenue) {
        const adjustedTarget = tTarget * (ratio / 100);
        const missing = adjustedTarget - cRevenue;
        const finalMissing = missing > 0 ? missing : 0;
        const daily = (remainingDays > 0) ? (finalMissing / remainingDays) : 0;

        return {
            ratio: ratio,
            targetTotal: adjustedTarget,
            missing: finalMissing,
            daily: daily,
            isDone: missing <= 0
        };
    }

    // --- REACTIVE ---
    $: remainingDays = calculateDays();
    $: mainMetrics = calculateMetrics(targetRatio, totalTarget, currentRevenue);
    $: prevMetrics = calculateMetrics(targetRatio - 10, totalTarget, currentRevenue);
    $: nextMetrics = calculateMetrics(targetRatio + 10, totalTarget, currentRevenue);

    // --- PERSISTENCE ---
    $: if ($selectedWarehouse || warehouseId) {
        const key = `target_ratio_${$selectedWarehouse || warehouseId}`;
        const saved = localStorage.getItem(key);
        if (saved) targetRatio = parseFloat(saved);
        else targetRatio = 100;
    }

    function handleRatioChange() {
        const key = `target_ratio_${$selectedWarehouse || warehouseId}`;
        localStorage.setItem(key, targetRatio.toString());
    }
</script>

<div class="bg-slate-50 border border-indigo-100 rounded-lg p-4 my-4 shadow-sm">
    
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        
        <div class="flex flex-col justify-center gap-3 pr-2">
            <div class="flex items-center gap-2 text-indigo-700">
                <div class="p-1.5 bg-indigo-100 rounded-md">
                    <i data-feather="crosshair" class="w-4 h-4"></i>
                </div>
                <span class="font-bold uppercase text-sm whitespace-nowrap">Mục tiêu hoàn thành (%)</span>
            </div>

            <div class="flex items-center gap-2 w-full">
                <input 
                    type="range" 
                    min="50" max="200" step="5"
                    bind:value={targetRatio}
                    on:change={handleRatioChange}
                    class="flex-grow h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                >
                <div class="relative flex-shrink-0">
                    <input 
                        type="number" 
                        bind:value={targetRatio}
                        on:change={handleRatioChange}
                        class="w-12 py-1 px-1 text-center font-bold text-indigo-700 bg-white border border-indigo-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                    >
                    <span class="absolute right-0.5 top-0.5 text-[9px] text-gray-400 font-bold">%</span>
                </div>
            </div>
        </div>

        <div class="flex items-center justify-between px-4 py-3 rounded-lg border border-purple-200 bg-white shadow-sm h-full">
            <div class="flex flex-col justify-center gap-1">
                <span class="text-xs font-bold text-purple-600 uppercase tracking-wide">{prevMetrics.ratio}% Target</span>
                <div class="mt-1">
                    <span class="text-[10px] text-gray-400 block">Còn lại (QĐ)</span>
                    <span class="text-sm font-bold text-gray-600">{fmt(prevMetrics.missing)}</span>
                </div>
            </div>
            <div class="text-right pl-2">
                <span class="text-3xl font-black text-purple-700 leading-none block">{fmt(prevMetrics.daily)}</span>
            </div>
        </div>

        <div class="flex items-center justify-between px-4 py-3 rounded-lg border-2 border-indigo-500 bg-indigo-50 shadow-md transform md:-translate-y-1 h-full z-10 relative overflow-hidden">
            <span class="absolute top-0 right-0 text-[9px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-bl font-bold">
                {remainingDays} ngày
            </span>

            <div class="flex flex-col justify-center gap-1">
                <span class="text-sm font-black text-indigo-800 uppercase tracking-wide">{mainMetrics.ratio}% Target</span>
                <div class="mt-1">
                    <span class="text-[10px] text-indigo-500 font-medium block">Còn lại (QĐ)</span>
                    <span class="text-lg font-bold text-indigo-900">{fmt(mainMetrics.missing)}</span>
                </div>
            </div>
            <div class="text-right pl-2">
                <span class="text-4xl font-black text-indigo-700 leading-none block drop-shadow-sm">{fmt(mainMetrics.daily)}</span>
            </div>
        </div>

        <div class="flex items-center justify-between px-4 py-3 rounded-lg border border-orange-200 bg-white shadow-sm h-full">
            <div class="flex flex-col justify-center gap-1">
                <span class="text-xs font-bold text-orange-600 uppercase tracking-wide">{nextMetrics.ratio}% Target</span>
                <div class="mt-1">
                    <span class="text-[10px] text-gray-400 block">Còn lại (QĐ)</span>
                    <span class="text-sm font-bold text-gray-600">{fmt(nextMetrics.missing)}</span>
                </div>
            </div>
            <div class="text-right pl-2">
                <span class="text-3xl font-black text-orange-700 leading-none block">{fmt(nextMetrics.daily)}</span>
            </div>
        </div>

    </div>
</div>