<script>
    import { fade } from 'svelte/transition';

    export let data = null;

    function formatCurrency(value) {
        if (!value || isNaN(value)) return '0';
        return new Intl.NumberFormat('vi-VN').format(value);
    }

    // Đã ép mạnh Math.round() để không còn số thập phân
    function formatNumber(value) {
        if (!value || isNaN(value)) return '0';
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(Number(value)));
    }

    function getProgressBarColor(percent) {
        if (percent >= 100) return 'bg-green-500';
        if (percent >= 80) return 'bg-blue-500';
        if (percent >= 50) return 'bg-orange-400';
        return 'bg-red-500';
    }

    // CHỈ LẤY CÁC NGÀNH HÀNG CÓ THƯỞNG HOẶC CÓ DATA (Loại bỏ thẻ rỗng)
    $: safeCategories = (data?.categories || []).filter(c => c.thuong > 0 || c.details !== null);
    
    // Nhóm 1: Có thưởng hoặc Trạng thái Đạt giải
    $: listCoGiai = safeCategories.filter(c => c.thuong > 0 || (c.details && c.details.trangThai === 'Đạt Giải'));
    
    // Nhóm 2: Không thưởng, khoảng cách từ 1 -> 10
    $: listTiemNang = safeCategories.filter(c => c.thuong === 0 && c.details && c.details.trangThai === 'Tiềm Năng');
    
    // Nhóm 3: Còn lại (Cách > 10 hoặc không xác định)
    $: listCanCoGang = safeCategories.filter(c => c.thuong === 0 && c.details && (c.details.trangThai === 'Cần Cố Gắng' || c.details.trangThai === 'N/A'));
</script>

{#if data}
<div class="w-full bg-transparent overflow-hidden" in:fade>
    
    <div class="text-center mb-6 border-b border-gray-200 pb-4">
        <h2 class="text-3xl font-extrabold text-gray-800 uppercase tracking-wide text-blue-800">{data.sieuThi}</h2>
        <p class="text-gray-500 mt-2 font-medium">Báo cáo Thi Đua Vùng Hồ Chí Minh</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div class="bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg p-5 text-white shadow-md flex items-center justify-between">
            <div>
                <p class="text-green-50 text-xs font-bold uppercase tracking-wider mb-1 opacity-90">Tổng Thưởng Đạt Được</p>
                <h3 class="text-3xl font-extrabold flex items-baseline gap-1">
                    {formatCurrency(data.tongThuong)} <span class="text-sm font-medium opacity-80">₫</span>
                </h3>
            </div>
            <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
        </div>

        <div class="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg p-5 text-white shadow-md flex items-center justify-between">
            <div>
                <p class="text-blue-50 text-xs font-bold uppercase tracking-wider mb-1 opacity-90">Số Giải Đang Giữ</p>
                <h3 class="text-3xl font-extrabold flex items-baseline gap-2">
                    {data.soGiai} <span class="text-sm font-medium opacity-80">Giải</span>
                </h3>
            </div>
            <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            </div>
        </div>
    </div>

    {#snippet categoryCard(cat, groupType)}
        <div class="bg-white rounded-xl shadow-sm border p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1 {groupType === 'cogiai' ? 'border-blue-200' : groupType === 'tiemnang' ? 'border-orange-200' : 'border-gray-200'}">
            
            <div class="flex justify-between items-start mb-3">
                <div class="pr-2">
                    <h4 class="font-bold text-gray-800 text-sm leading-tight">{cat.name}</h4>
                    <div class="mt-1 flex flex-wrap gap-1.5 items-center">
                        {#if cat.details && cat.details.bestRank > 0}
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                Hạng: #{cat.details.bestRank}
                            </span>
                        {/if}
                        {#if cat.loaiGiai || (cat.details && cat.details.loiThe)}
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                {cat.loaiGiai || cat.details.loiThe}
                            </span>
                        {/if}
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="block text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Tiền Thưởng</span>
                    <span class="font-bold text-green-600 text-base leading-none">{formatCurrency(cat.thuong)} ₫</span>
                </div>
            </div>

            {#if cat.details}
                <div class="mb-3">
                    <div class="flex justify-between text-[11px] font-semibold mb-1">
                        <span class="text-gray-500">Tiến độ HT Target</span>
                        <span class={cat.details.percentHT >= 100 ? 'text-green-600' : 'text-blue-600'}>
                            {Math.round(cat.details.percentHT)}%
                        </span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5">
                        <div class="h-1.5 rounded-full {getProgressBarColor(cat.details.percentHT)}" style="width: {Math.min(cat.details.percentHT, 100)}%"></div>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-1 p-2 bg-gray-50 rounded-lg mb-3 border border-gray-100">
                    <div class="text-center border-r border-gray-200">
                        <span class="block text-[9px] text-gray-500 font-medium">Lũy Kế</span>
                        <span class="font-bold text-gray-800 text-xs">{formatNumber(cat.details.luyKe)}</span>
                    </div>
                    <div class="text-center border-r border-gray-200">
                        <span class="block text-[9px] text-gray-500 font-medium">Target</span>
                        <span class="font-bold text-gray-800 text-xs">{formatNumber(cat.details.target)}</span>
                    </div>
                    <div class="text-center">
                        <span class="block text-[9px] text-gray-500 font-medium">DKHT</span>
                        <span class="font-bold text-blue-600 text-xs">{formatNumber(cat.details.dkht)}</span>
                    </div>
                </div>

                <div class="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                        <span>Lấy Top</span>
                        <span class="px-1 py-0.5 bg-gray-200 text-gray-700 rounded font-bold">{cat.details.cutoffRank}</span>
                    </div>

                    <div class="px-2 py-1 rounded border text-[10px] font-bold {groupType === 'cogiai' ? 'bg-green-100 text-green-800 border-green-200' : groupType === 'tiemnang' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-red-50 text-red-700 border-red-100'}">
                        {#if groupType === 'cogiai'}
                            🎉 An toàn trong Top
                        {:else if groupType === 'tiemnang'}
                            🔥 Cách {cat.details.khoangCach} hạng
                        {:else}
                            ⚠️ Cách xa {cat.details.khoangCach} hạng
                        {/if}
                    </div>
                </div>
            {:else}
                <div class="mt-auto pt-3 border-t border-gray-100">
                    <p class="text-center text-[11px] text-gray-400 italic">Chưa có số liệu phân tích...</p>
                </div>
            {/if}
        </div>
    {/snippet}

    {#if listCoGiai.length > 0}
        <div class="mb-8">
            <h3 class="text-base font-bold text-blue-700 uppercase mb-3 flex items-center gap-2 border-l-4 border-blue-500 pl-2">
                🏆 Nhóm Đang Đạt Giải ({listCoGiai.length})
            </h3>
            <div class="hcm-grid-4">
                {#each listCoGiai as cat} {@render categoryCard(cat, 'cogiai')} {/each}
            </div>
        </div>
    {/if}

    {#if listTiemNang.length > 0}
        <div class="mb-8">
            <h3 class="text-base font-bold text-orange-600 uppercase mb-3 flex items-center gap-2 border-l-4 border-orange-500 pl-2">
                🔥 Nhóm Tiềm Năng Bứt Phá ({listTiemNang.length})
            </h3>
            <div class="hcm-grid-4">
                {#each listTiemNang as cat} {@render categoryCard(cat, 'tiemnang')} {/each}
            </div>
        </div>
    {/if}

    {#if listCanCoGang.length > 0}
        <div class="mb-8 opacity-90">
            <h3 class="text-base font-bold text-red-600 uppercase mb-3 flex items-center gap-2 border-l-4 border-red-500 pl-2">
                ⚠️ Nhóm Cần Cố Gắng ({listCanCoGang.length})
            </h3>
            <div class="hcm-grid-4">
                {#each listCanCoGang as cat} {@render categoryCard(cat, 'cancogang')} {/each}
            </div>
        </div>
    {/if}

</div>
{/if}

<style>
    /* NÂNG CẤP LÊN 4 CỘT THEO YÊU CẦU */
    .hcm-grid-4 {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
    }
    
    @media (max-width: 1280px) {
        .hcm-grid-4 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 1024px) {
        .hcm-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
        .hcm-grid-4 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    }
</style>