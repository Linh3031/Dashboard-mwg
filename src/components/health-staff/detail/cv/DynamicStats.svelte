<script>
    import { formatters } from '../../../../utils/formatters.js';
    import { afterUpdate, onMount } from 'svelte';

    export let detailStats = {};
    export let rawEmployeeData = null;
    export let totalAbove = 0;
    export let totalCriteria = 0;
    export let targetCaNhan = 0;
    export let percentTargetValue = 0;
    export let thiDuaSummary = { dat: 0, ganDat: 0, canCoGang: 0, listDat: [] };

    // --- KHỐI DOANH THU ---
    // [PHẪU THUẬT LOGIC]: Tách thẻ DT Thực làm Data phụ, ghép chung vào DT Quy Đổi
    $: doanhThuQD = detailStats.doanhThu?.find(m => m.id === 'dtQD');
    $: doanhThuThuc = detailStats.doanhThu?.find(m => m.id === 'dtThuc');
    
    $: tyLeQD = detailStats.doanhThu?.find(m => m.id === 'pctQD');
    $: tyLeTC = detailStats.doanhThu?.find(m => m.id === 'pctTraCham');
    $: dtTrenGioCong = detailStats.nangSuat?.find(m => m.id === 'dtqdTrenGc');
    
    // Logic tính Tỷ lệ Bán kèm chuẩn từ RevenueDetailView
    $: tyLeBanKem = (() => {
        if (!rawEmployeeData) return 0;
        const bundled = rawEmployeeData.donHangBanKem || 0;
        const total = rawEmployeeData.tongDonHang || 0; // Thay thế biến này bằng biến count thực tế nếu có
        return total > 0 ? (bundled / total) : 0;
    })();

    // --- KHỐI HIỆU QUẢ & ĐƠN GIÁ ---
    $: hieuQuaMetrics = (detailStats.hieuQua || []).filter(m => m.rawValue > 0 || m.rawAverage > 0);
    $: donGiaMetrics = (detailStats.donGia || []).filter(m => m.rawValue > 0 || m.rawAverage > 0);
    
    const colorClasses = [
        { text: 'text-blue-700', border: 'border-blue-500', bgBorder: 'border-blue-200' },
        { text: 'text-purple-700', border: 'border-purple-500', bgBorder: 'border-purple-200' },
        { text: 'text-emerald-700', border: 'border-emerald-500', bgBorder: 'border-emerald-200' },
        { text: 'text-amber-700', border: 'border-amber-500', bgBorder: 'border-amber-200' },
        { text: 'text-rose-700', border: 'border-rose-500', bgBorder: 'border-rose-200' },
        { text: 'text-cyan-700', border: 'border-cyan-500', bgBorder: 'border-cyan-200' }
    ];

    // --- BIỂU ĐỒ TRÒN ---
    $: nganhHangData = (() => {
        if (!rawEmployeeData?.doanhThuTheoNganhHang) return [];
        return Object.entries(rawEmployeeData.doanhThuTheoNganhHang)
            .map(([name, val]) => ({ name, ...val }))
            .filter(item => (item.revenue || 0) > 0)
            .sort((a, b) => b.revenue - a.revenue);
    })();

    $: pieChartData = (() => {
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];
        let totalRev = nganhHangData.reduce((sum, item) => sum + (item.revenue || 0), 0);
        if (totalRev === 0) return [];
        
        let cumulativePercent = 0;
        return nganhHangData.slice(0, 7).map((item, index) => {
            const percent = (item.revenue / totalRev) * 100;
            const start = cumulativePercent;
            cumulativePercent += percent;
            return {
                name: item.name, percent: percent, color: colors[index % colors.length],
                strokeDasharray: `${percent} 100`, strokeDashoffset: -start
            };
        });
    })();

    onMount(() => { if (window.feather) window.feather.replace(); });
    afterUpdate(() => { if (window.feather) window.feather.replace(); });
</script>

<div class="w-full h-full bg-white p-4 sm:p-6 md:p-8 flex flex-col rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl">
    
    <div class="mb-6 border-b border-slate-200 pb-4">
        <h2 class="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
            BẢNG ĐIỂM CHI TIẾT - ĐẠT {totalAbove}/{totalCriteria} CHỈ SỐ
        </h2>
        <p class="text-sm text-slate-500 font-medium mt-1">Dữ liệu được cập nhật dựa trên chỉ tiêu chung của toàn siêu thị</p>
    </div>

    <!-- ==================== KHỐI 1: DOANH THU (Gộp) ==================== -->
    <div class="bg-blue-50/40 p-5 rounded-2xl mb-8 border border-blue-100">
        <div class="flex items-center gap-2 mb-4">
            <div class="p-1.5 bg-blue-100 rounded-lg"><i data-feather="dollar-sign" class="w-5 h-5 text-blue-700"></i></div>
            <h3 class="text-lg font-bold text-slate-800 uppercase tracking-wide">Doanh Thu</h3>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
            
            <!-- Thẻ 1: DTQĐ Gộp DT Thực -->
            {#if doanhThuQD}
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <p class="text-xs font-bold text-slate-400 uppercase mb-1">{doanhThuQD.label}</p>
                <p class="text-2xl font-black text-blue-700 leading-tight">{doanhThuQD.value}</p>
                <p class="text-[11px] font-semibold text-slate-400 mb-2">Thực tế: {doanhThuThuc?.value || '0'}</p>
                <div class="text-[10px] font-semibold {doanhThuQD.rawValue >= doanhThuQD.rawAverage ? 'text-emerald-600' : 'text-rose-500'}">
                    {doanhThuQD.rawValue >= doanhThuQD.rawAverage ? '↑ Vượt TB' : '↓ Dưới TB'} ({doanhThuQD.average})
                </div>
            </div>
            {/if}

            {#if tyLeQD}
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                <p class="text-xs font-bold text-slate-400 uppercase mb-1">{tyLeQD.label}</p>
                <p class="text-2xl font-black text-purple-600 leading-tight">{tyLeQD.value}</p>
                <div class="mt-6 text-[10px] font-semibold {tyLeQD.rawValue >= tyLeQD.rawAverage ? 'text-emerald-600' : 'text-rose-500'}">
                    {tyLeQD.rawValue >= tyLeQD.rawAverage ? '↑ Vượt TB' : '↓ Dưới TB'} ({tyLeQD.average})
                </div>
            </div>
            {/if}

            {#if tyLeTC}
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <p class="text-xs font-bold text-slate-400 uppercase mb-1">{tyLeTC.label}</p>
                <p class="text-2xl font-black text-amber-600 leading-tight">{tyLeTC.value}</p>
                <div class="mt-6 text-[10px] font-semibold {tyLeTC.rawValue >= tyLeTC.rawAverage ? 'text-emerald-600' : 'text-rose-500'}">
                    {tyLeTC.rawValue >= tyLeTC.rawAverage ? '↑ Vượt TB' : '↓ Dưới TB'} ({tyLeTC.average})
                </div>
            </div>
            {/if}
            
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                <p class="text-xs font-bold text-slate-400 uppercase mb-1">Tỷ lệ bán kèm</p>
                <p class="text-2xl font-black text-cyan-600 leading-tight">{formatters.formatPercentage(tyLeBanKem)}</p>
                <div class="mt-6 text-[10px] font-semibold text-slate-400">Ghi nhận từ hệ thống ERP</div>
            </div>

            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <p class="text-xs font-bold text-slate-400 uppercase mb-1">% Target Dự Kiến</p>
                <p class="text-2xl font-black leading-tight {percentTargetValue >= 100 ? 'text-emerald-600' : 'text-rose-600'}">
                    {targetCaNhan > 0 ? formatters.formatPercentage(percentTargetValue/100, 0) : 'N/A'}
                </p>
                <div class="mt-6 text-[10px] font-semibold text-slate-500">
                    Mục tiêu: {targetCaNhan > 0 ? formatters.formatRevenue(targetCaNhan) : '-'}
                </div>
            </div>

            {#if dtTrenGioCong}
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                <p class="text-xs font-bold text-slate-400 uppercase mb-1">DTQĐ / Giờ công</p>
                <p class="text-2xl font-black text-pink-600 leading-tight">{dtTrenGioCong.value}</p>
                <div class="mt-6 text-[10px] font-semibold {dtTrenGioCong.rawValue >= dtTrenGioCong.rawAverage ? 'text-emerald-600' : 'text-rose-500'}">
                    {dtTrenGioCong.rawValue >= dtTrenGioCong.rawAverage ? '↑ Vượt TB' : '↓ Dưới TB'} ({dtTrenGioCong.average})
                </div>
            </div>
            {/if}
        </div>
    </div>

    <!-- ==================== KHỐI 2: HIỆU QUẢ & BIỂU ĐỒ ==================== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <!-- Cột Hiệu quả dạng Thanh ngang -->
        <div class="bg-orange-50/40 p-5 rounded-2xl border border-orange-100 flex flex-col h-full">
            <div class="flex items-center gap-2 mb-5">
                <div class="p-1.5 bg-orange-100 rounded-lg"><i data-feather="activity" class="w-5 h-5 text-orange-600"></i></div>
                <h3 class="text-lg font-bold text-slate-800 uppercase tracking-wide">Hiệu Quả Khai Thác</h3>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6 flex-grow">
                {#each hieuQuaMetrics as metric}
                <div>
                    <div class="flex justify-between items-end mb-1.5">
                        <span class="text-sm font-bold text-slate-700">{metric.label}</span>
                        <div class="text-right">
                            <span class="text-[10px] text-slate-400 font-semibold mr-2">Mục tiêu: {metric.average}</span>
                            <span class="text-lg font-black {metric.rawValue >= metric.rawAverage ? 'text-emerald-600' : 'text-rose-600'}">{metric.value}</span>
                        </div>
                    </div>
                    <div class="h-2 w-full bg-slate-100 rounded-full relative overflow-hidden">
                        <div class="absolute top-0 left-0 h-full {metric.rawValue >= metric.rawAverage ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full transition-all" style="width: {Math.min((metric.rawValue * 100), 100)}%"></div>
                        <div class="absolute top-0 h-full w-[3px] bg-slate-800/30" style="left: {Math.min((metric.rawAverage * 100), 100)}%"></div>
                    </div>
                </div>
                {/each}
                {#if hieuQuaMetrics.length === 0}
                    <p class="text-sm text-slate-400 italic text-center mt-4">Chưa có số liệu hiệu quả.</p>
                {/if}
            </div>
        </div>

        <!-- Cột Biểu đồ Tỷ trọng (Flex-col để không bị ép chữ) -->
        <div class="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100 flex flex-col h-full">
            <div class="flex items-center gap-2 mb-5">
                <div class="p-1.5 bg-indigo-100 rounded-lg"><i data-feather="pie-chart" class="w-5 h-5 text-indigo-600"></i></div>
                <h3 class="text-lg font-bold text-slate-800 uppercase tracking-wide">Tỷ Trọng Ngành Hàng</h3>
            </div>

            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center flex-grow w-full">
                {#if pieChartData.length > 0}
                    <div class="w-full flex justify-center mb-6">
                        <svg viewBox="0 0 42 42" class="w-40 h-40 transform -rotate-90">
                            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" stroke-width="6"></circle>
                            {#each pieChartData as slice}
                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={slice.color} stroke-width="6" stroke-dasharray={slice.strokeDasharray} stroke-dashoffset={slice.strokeDashoffset}></circle>
                            {/each}
                        </svg>
                    </div>
                    <div class="w-full grid grid-cols-2 gap-x-4 gap-y-2">
                        {#each pieChartData as slice}
                            <div class="flex items-center text-[11px] font-semibold text-slate-600">
                                <span class="w-3 h-3 rounded-full mr-2 shrink-0 shadow-sm" style="background-color: {slice.color}"></span>
                                <span class="truncate" title={slice.name}>{slice.name} ({formatters.formatNumber(slice.percent, 0)}%)</span>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-sm text-slate-400 italic text-center w-full mt-10">Không có số liệu ngành hàng.</p>
                {/if}
            </div>
        </div>
    </div>

    <!-- ==================== KHỐI 3: ĐƠN GIÁ & THI ĐUA ==================== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-auto">
        
        <!-- ĐƠN GIÁ CÁC NHÓM (Cột Trái) -->
        <div class="bg-teal-50/40 p-5 rounded-2xl border border-teal-100">
            <div class="flex items-center gap-2 mb-4">
                <div class="p-1.5 bg-teal-100 rounded-lg"><i data-feather="tag" class="w-5 h-5 text-teal-600"></i></div>
                <h3 class="text-lg font-bold text-slate-800 uppercase tracking-wide">Đơn Giá Các Nhóm</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                {#each donGiaMetrics as metric, i}
                    {@const c = colorClasses[i % colorClasses.length]}
                    <div class="bg-white p-3 rounded-xl border border-l-4 {c.border} {c.bgBorder} shadow-sm flex flex-col justify-between">
                        <span class="text-[10px] font-bold text-slate-400 uppercase mb-0.5 line-clamp-1" title={metric.label}>{metric.label}</span>
                        <span class="text-lg font-black {c.text}">{metric.value}</span>
                        <span class="text-[10px] font-semibold text-slate-500 mt-1">TB: {metric.average}</span>
                    </div>
                {/each}
                {#if donGiaMetrics.length === 0}
                    <p class="text-sm text-slate-400 italic col-span-full">Chưa có số liệu đơn giá.</p>
                {/if}
            </div>
        </div>

        <!-- KẾT QUẢ THI ĐUA (Cột Phải) -->
        <div class="bg-fuchsia-50/40 p-5 rounded-2xl border border-fuchsia-100">
            <div class="flex items-center gap-2 mb-4">
                <div class="p-1.5 bg-fuchsia-100 rounded-lg"><i data-feather="award" class="w-5 h-5 text-fuchsia-600"></i></div>
                <h3 class="text-lg font-bold text-slate-800 uppercase tracking-wide">Kết Quả Thi Đua</h3>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-white p-3 rounded-xl border border-fuchsia-200 shadow-sm text-center">
                    <p class="text-2xl font-black text-fuchsia-600">{thiDuaSummary.dat}</p>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mt-1">Đạt</p>
                </div>
                <div class="bg-white p-3 rounded-xl border border-amber-200 shadow-sm text-center">
                    <p class="text-2xl font-black text-amber-500">{thiDuaSummary.ganDat}</p>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mt-1">Gần Đạt</p>
                </div>
                <div class="bg-white p-3 rounded-xl border border-rose-200 shadow-sm text-center">
                    <p class="text-2xl font-black text-rose-500">{thiDuaSummary.canCoGang}</p>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mt-1">Cần Cố Gắng</p>
                </div>
            </div>

            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Ngành hàng vượt Target (>100%)</h4>
                {#if thiDuaSummary.listDat.length > 0}
                    <div class="flex flex-wrap gap-2">
                        {#each thiDuaSummary.listDat as item}
                            <span class="bg-fuchsia-50 text-fuchsia-700 px-2 py-1 rounded-md text-[10px] font-bold border border-fuchsia-100">
                                {item}
                            </span>
                        {/each}
                    </div>
                {:else}
                    <p class="text-xs text-slate-400 italic">Chưa có ngành hàng nào hoàn thành 100% mục tiêu.</p>
                {/if}
            </div>
        </div>

    </div>

</div>