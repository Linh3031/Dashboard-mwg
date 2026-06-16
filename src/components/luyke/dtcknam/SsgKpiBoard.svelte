<script>
    import { formatters } from '../../../utils/formatters.js';
    export let kpiTotals = { dt25:0, qd25:0, tc25:0, dt26:0, qd26:0, tc26:0, currentDay: 1, daysInMonth: 30, isCurrentMonth: false };

    const fmtRev = (n) => formatters.formatNumber(Math.round((n || 0) / 1000000), 0); 
    const fmtPct = (n) => (n * 100).toFixed(1) + '%';
    const fmtAbs = (n) => formatters.formatNumber(Math.abs(Math.round(n / 1000000)), 0);
    
    // Tính toán hệ số Dự kiến
    $: factor = (kpiTotals.isCurrentMonth && kpiTotals.currentDay > 0) ? (kpiTotals.daysInMonth / kpiTotals.currentDay) : 1;
    $: dt26_final = kpiTotals.dt26 * factor;
    $: qd26_final = kpiTotals.qd26 * factor;
    $: tc26_final = kpiTotals.tc26 * factor;

    // Tăng trưởng Số tuyệt đối & Phần trăm
    $: growthDtVal = dt26_final - kpiTotals.dt25;
    $: growthDtPct = kpiTotals.dt25 > 0 ? (dt26_final / kpiTotals.dt25) - 1 : 0;

    $: growthQdVal = qd26_final - kpiTotals.qd25;
    $: growthQdPct = kpiTotals.qd25 > 0 ? (qd26_final / kpiTotals.qd25) - 1 : 0;
    
    // Tỷ lệ cấu trúc (Không nhân factor vì tử/mẫu tự triệt tiêu)
    $: ratio25 = kpiTotals.dt25 > 0 ? (kpiTotals.qd25 / kpiTotals.dt25) - 1 : 0;
    $: ratio26 = kpiTotals.dt26 > 0 ? (kpiTotals.qd26 / kpiTotals.dt26) - 1 : 0;
    
    $: tcRatio25 = kpiTotals.dt25 > 0 ? (kpiTotals.tc25 / kpiTotals.dt25) : 0;
    $: tcRatio26 = kpiTotals.dt26 > 0 ? (kpiTotals.tc26 / kpiTotals.dt26) : 0;
</script>

<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
    <div class="bg-[#eff6ff] p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col relative overflow-hidden">
        {#if kpiTotals.isCurrentMonth}<span class="absolute top-0 right-0 bg-blue-200 text-blue-800 text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg">DỰ KIẾN</span>{/if}
        <p class="text-[11px] font-bold text-blue-800 uppercase mb-2 pb-2 border-b border-blue-200/50 flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Doanh thu Thực (Tr)
        </p>
        <div class="flex justify-between items-center px-2 flex-1">
            <div class="text-center"><p class="text-[10px] text-blue-400 font-bold mb-1">2025</p><h3 class="text-xl font-bold text-blue-900/60">{fmtRev(kpiTotals.dt25)}</h3></div>
            <div class="w-px h-8 bg-blue-200"></div>
            <div class="text-center"><p class="text-[10px] text-blue-500 font-bold mb-1">2026</p><h3 class="text-2xl font-black text-blue-700">{fmtRev(dt26_final)}</h3></div>
        </div>
        <div class="mt-2 pt-2 border-t border-blue-200/50 text-center text-[11px] font-bold {growthDtPct >= 0 ? 'text-emerald-600' : 'text-red-500'}">
            Tăng trưởng: {growthDtVal > 0 ? '+' : (growthDtVal < 0 ? '-' : '')}{fmtAbs(growthDtVal)} ({fmtPct(growthDtPct)})
        </div>
    </div>

    <div class="bg-[#f0fdf4] p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col relative overflow-hidden">
        {#if kpiTotals.isCurrentMonth}<span class="absolute top-0 right-0 bg-emerald-200 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg">DỰ KIẾN</span>{/if}
        <p class="text-[11px] font-bold text-emerald-800 uppercase mb-2 pb-2 border-b border-emerald-200/50 flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Doanh thu Quy đổi (Tr)
        </p>
        <div class="flex justify-between items-center px-2 flex-1">
            <div class="text-center"><p class="text-[10px] text-emerald-400 font-bold mb-1">2025</p><h3 class="text-xl font-bold text-emerald-900/60">{fmtRev(kpiTotals.qd25)}</h3></div>
            <div class="w-px h-8 bg-emerald-200"></div>
            <div class="text-center"><p class="text-[10px] text-emerald-500 font-bold mb-1">2026</p><h3 class="text-2xl font-black text-emerald-600">{fmtRev(qd26_final)}</h3></div>
        </div>
        <div class="mt-2 pt-2 border-t border-emerald-200/50 text-center text-[11px] font-bold {growthQdPct >= 0 ? 'text-emerald-600' : 'text-red-500'}">
            Tăng trưởng: {growthQdVal > 0 ? '+' : (growthQdVal < 0 ? '-' : '')}{fmtAbs(growthQdVal)} ({fmtPct(growthQdPct)})
        </div>
    </div>

    <div class="bg-[#faf5ff] p-3 rounded-xl border border-purple-100 shadow-sm flex flex-col">
        <p class="text-[11px] font-bold text-purple-800 uppercase mb-2 pb-2 border-b border-purple-200/50 flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> Tỷ lệ Quy đổi
        </p>
        <div class="flex justify-between items-center px-2 flex-1">
            <div class="text-center"><p class="text-[10px] text-purple-400 font-bold mb-1">2025</p><h3 class="text-xl font-bold text-purple-900/60">{fmtPct(ratio25)}</h3></div>
            <div class="w-px h-8 bg-purple-200"></div>
            <div class="text-center"><p class="text-[10px] text-purple-500 font-bold mb-1">2026</p><h3 class="text-2xl font-black text-purple-700">{fmtPct(ratio26)}</h3></div>
        </div>
        <div class="mt-2 pt-2 border-t border-purple-200/50 text-center text-[11px] font-bold {ratio26 - ratio25 >= 0 ? 'text-emerald-600' : 'text-red-500'}">
            Tăng trưởng: {(ratio26 - ratio25 > 0 ? '+' : '') + fmtPct(ratio26 - ratio25)}
        </div>
    </div>

    <div class="bg-[#fff7ed] p-3 rounded-xl border border-orange-100 shadow-sm flex flex-col">
        <p class="text-[11px] font-bold text-orange-800 uppercase mb-2 pb-2 border-b border-orange-200/50 flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Tỷ lệ Trả chậm
        </p>
        <div class="flex justify-between items-center px-2 flex-1">
            <div class="text-center"><p class="text-[10px] text-orange-400 font-bold mb-1">2025</p><h3 class="text-xl font-bold text-orange-900/60">{fmtPct(tcRatio25)}</h3></div>
            <div class="w-px h-8 bg-orange-200"></div>
            <div class="text-center"><p class="text-[10px] text-orange-500 font-bold mb-1">2026</p><h3 class="text-2xl font-black text-orange-600">{fmtPct(tcRatio26)}</h3></div>
        </div>
        <div class="mt-2 pt-2 border-t border-orange-200/50 text-center text-[11px] font-bold {tcRatio26 - tcRatio25 >= 0 ? 'text-emerald-600' : 'text-red-500'}">
            Tăng trưởng: {(tcRatio26 - tcRatio25 > 0 ? '+' : '') + fmtPct(tcRatio26 - tcRatio25)}
        </div>
    </div>
</div>