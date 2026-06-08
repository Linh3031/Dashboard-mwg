<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';

  export let summary = {};
  export let goals = {};

  const dispatch = createEventDispatcher();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
    
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm flex items-stretch justify-between min-h-[110px] hover:shadow-md transition-all hover:-translate-y-0.5">
        <div class="flex flex-col justify-between items-start gap-3 w-2/3">
            <div class="flex items-center gap-2">
                <div style="width: 32px; height: 32px; min-width: 32px;" class="rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <span class="text-xs font-bold uppercase tracking-wider text-blue-800">Doanh Thu QĐ</span>
            </div>
            <div class="text-[11px] font-semibold text-blue-700 bg-white/50 px-2 py-1 rounded flex items-center gap-3 whitespace-nowrap">
                <span>DT Thực: <strong class="text-blue-900">{formatters.formatRevenue(summary.totalRealRevenue)}</strong></span>
            </div>
        </div>
        <div class="w-1/3 flex items-center justify-end">
            <span class="text-3xl xl:text-4xl font-black text-blue-700 drop-shadow-sm leading-none whitespace-nowrap">
                {formatters.formatRevenue(summary.totalConvertedRevenue)}
            </span>
        </div>
    </div>

    <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm flex items-stretch justify-between min-h-[110px] hover:shadow-md transition-all hover:-translate-y-0.5">
        <div class="flex flex-col justify-between items-start gap-3 w-1/2">
            <div class="flex items-center gap-2">
                <div style="width: 32px; height: 32px; min-width: 32px;" class="rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </div>
                <span class="text-xs font-bold uppercase tracking-wider text-purple-800">Tỷ Lệ Quy Đổi</span>
            </div>
        </div>
        <div class="w-1/2 flex items-center justify-end">
            <span class="text-3xl xl:text-4xl font-black text-purple-700 drop-shadow-sm leading-none whitespace-nowrap">
                {formatters.formatPercentage(summary.conversionRate)}
            </span>
        </div>
    </div>

    <div class="{summary.tyLeHoanThanh >= 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} border rounded-xl p-4 shadow-sm flex items-stretch justify-between min-h-[110px] hover:shadow-md transition-all hover:-translate-y-0.5">
        <div class="flex flex-col justify-between items-start gap-3 w-1/2">
            <div class="flex items-center gap-2">
                <div style="width: 32px; height: 32px; min-width: 32px;" class="rounded-lg {summary.tyLeHoanThanh >= 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'} flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                </div>
                <span class="text-xs font-bold uppercase tracking-wider {summary.tyLeHoanThanh >= 1 ? 'text-emerald-800' : 'text-rose-800'}">% Target Dự Kiến</span>
            </div>
            <div class="text-[11px] font-semibold bg-white/50 px-2 py-1 rounded flex items-center gap-3 whitespace-nowrap {summary.tyLeHoanThanh >= 1 ? 'text-emerald-700' : 'text-rose-700'}">
                <span>Mục tiêu NV: <strong class="{summary.tyLeHoanThanh >= 1 ? 'text-emerald-900' : 'text-rose-900'}">{formatters.formatRevenue(Math.round(summary.targetCaNhan))}</strong></span>
            </div>
        </div>
        <div class="w-1/2 flex items-center justify-end">
            <span class="text-4xl font-black drop-shadow-sm leading-none whitespace-nowrap {summary.tyLeHoanThanh >= 1 ? 'text-emerald-600' : 'text-rose-600'}">
                {Math.round(summary.tyLeHoanThanh * 100)}%
            </span>
        </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm flex items-stretch justify-between min-h-[110px] hover:shadow-md transition-all hover:-translate-y-0.5">
        <div class="flex flex-col justify-between items-start gap-3 w-2/3">
            <div class="flex items-center gap-2">
                <div style="width: 32px; height: 32px; min-width: 32px;" class="rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                </div>
                <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Tỷ Lệ Trả Chậm</span>
            </div>
            <div class="text-[11px] font-semibold text-amber-700 bg-white/50 px-2 py-1 rounded flex flex-wrap items-center gap-3">
                <span>DTQĐ: <strong class="text-amber-900">{formatters.formatRevenue(summary.dtqdTC)}</strong></span>
                <span>Thực: <strong class="text-amber-900">{formatters.formatRevenue(summary.dtThucTC)}</strong></span>
            </div>
        </div>
        <div class="w-1/3 flex items-center justify-end">
            <span class="text-3xl xl:text-4xl font-black text-amber-600 drop-shadow-sm leading-none whitespace-nowrap">
                {formatters.formatPercentage(summary.tyLeTraCham)}
            </span>
        </div>
    </div>

    <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm flex items-stretch justify-between min-h-[110px] hover:shadow-md transition-all hover:-translate-y-0.5">
        <div class="flex flex-col justify-between items-start gap-3 w-1/2">
            <div class="flex items-center gap-2">
                <div style="width: 32px; height: 32px; min-width: 32px;" class="rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                </div>
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-800">Dự Kiến So CK</span>
            </div>
            <div class="text-[11px] font-semibold text-indigo-700 bg-white/50 px-2 py-1 rounded flex items-center gap-3 whitespace-nowrap">
                <span>DTQĐ Cùng Kỳ: <strong class="text-indigo-900">{formatters.formatRevenue(summary.dtqdCK)}</strong></span>
            </div>
        </div>
        <div class="w-1/2 flex items-center justify-end">
            <span class="text-3xl xl:text-4xl font-black drop-shadow-sm leading-none whitespace-nowrap {summary.duKienSoCK >= 0 ? 'text-blue-600' : 'text-rose-500'}">
                {summary.duKienSoCK > 0 ? '+' : ''}{formatters.formatRevenue(summary.duKienSoCK)}
            </span>
        </div>
    </div>

    <div 
        class="bg-cyan-50 border border-cyan-200 rounded-xl p-4 shadow-sm flex items-stretch justify-between min-h-[110px] hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer hover:bg-cyan-100/70"
        on:click={() => dispatch('viewOrders')}
    >
        <div class="flex flex-col justify-between items-start gap-3 w-2/3">
            <div class="flex items-center gap-2">
                <div style="width: 32px; height: 32px; min-width: 32px;" class="rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
                </div>
                <span class="text-xs font-bold uppercase tracking-wider text-cyan-800">Tỷ Lệ Bán Kèm</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-600 opacity-60" style="width: 12px; height: 12px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </div>
            <div class="text-[11px] font-semibold text-cyan-700 bg-white/50 px-2 py-1 rounded flex flex-wrap items-center gap-3">
                <span>Tổng đơn: <strong class="text-cyan-900">{summary.totalOrders}</strong></span>
                <span>>1 sp: <strong class="text-cyan-900">{summary.bundledOrderCount}</strong></span>
            </div>
        </div>
        <div class="w-1/3 flex items-center justify-end">
            <span class="text-3xl xl:text-4xl font-black text-cyan-600 drop-shadow-sm leading-none whitespace-nowrap">
                {formatters.formatPercentage(summary.tyLeBanKem)}
            </span>
        </div>
    </div>
</div>

<style>
    /* ==========================================================================
       OVERRIDE CAPTURE LOGIC
       ========================================================================== */
    :global(.capture-container *) { 
        transition: none !important;
        animation: none !important; 
    }
</style>