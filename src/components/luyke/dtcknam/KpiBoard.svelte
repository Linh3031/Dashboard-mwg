<script>
    import { formatters } from '../../../utils/formatters.js';
    export let metrics = { actualRev: 0, convertedRev: 0, traChamRev: 0 };
    
    const fmtRev = (n) => formatters.formatRevenue(n || 0, 0);
    const fmtPct = (n) => (n || 0).toFixed(1) + '%';
</script>

<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-sm border border-blue-200">
        <p class="text-xs font-bold text-blue-800 uppercase mb-1">Doanh thu thực</p>
        <h3 class="text-xl font-black text-blue-900">{fmtRev(metrics.actualRev)}</h3>
    </div>
    <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl shadow-sm border border-emerald-200">
        <p class="text-xs font-bold text-emerald-800 uppercase mb-1">Doanh thu Quy đổi</p>
        <h3 class="text-xl font-black text-emerald-900">{fmtRev(metrics.convertedRev)}</h3>
    </div>
    <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm border border-purple-200">
        <p class="text-xs font-bold text-purple-800 uppercase mb-1">Tỷ lệ Quy đổi</p>
        <h3 class="text-xl font-black text-purple-900">
            {metrics.actualRev > 0 ? fmtPct(((metrics.convertedRev / metrics.actualRev) * 100) - 100) : '0%'}
        </h3>
    </div>
    <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl shadow-sm border border-orange-200">
        <p class="text-xs font-bold text-orange-800 uppercase mb-1">DT & TL Trả chậm</p>
        <div class="flex items-end justify-between">
            <h3 class="text-xl font-black text-orange-900">{fmtRev(metrics.traChamRev)}</h3>
            <span class="text-sm font-bold text-orange-700 mb-1">
                {metrics.actualRev > 0 ? fmtPct((metrics.traChamRev / metrics.actualRev) * 100) : '0%'}
            </span>
        </div>
    </div>
</div>