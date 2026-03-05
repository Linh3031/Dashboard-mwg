<script>
    export let reportData = null;

    // --- HELPER ---
    const currencyFormatter = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    });
    
    const numberFormatter = new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0 
    });

    function formatMoney(amount) {
        return currencyFormatter.format(amount || 0);
    }

    // --- LOGIC PHÂN LOẠI ---
    $: safeData = reportData || {};
    $: rankCutoff = safeData.rankCutoff || 0;
    $: rawDetails = Array.isArray(safeData.details) ? safeData.details : [];

    // 1. NHÓM CÓ GIẢI (Xanh dương sáng)
    $: listCoGiai = rawDetails.filter(d => d.tongThuong > 0);

    // 2. NHÓM TIỀM NĂNG (Vàng)
    $: listTiemNang = rawDetails.filter(d => {
        if (d.tongThuong > 0) return false;
        const gap = (d.bestRank - rankCutoff);
        return gap > 0 && gap < 10;
    });

    // 3. NHÓM CÒN LẠI (Đỏ)
    $: listCanCoGang = rawDetails.filter(d => {
        if (d.tongThuong > 0) return false;
        const gap = (d.bestRank - rankCutoff);
        return gap >= 10;
    });

</script>

<div class="tdv-root rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/20 border border-gray-200 overflow-hidden shadow-sm" data-capture-group="regional-competition">
    
    <div class="bg-blue-900 text-white p-6 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>

        <div class="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
            <div>
                <span class="px-3 py-1 rounded-full bg-blue-800/80 border border-blue-700 text-blue-200 text-xs font-bold uppercase tracking-wider mb-3 inline-block">
                    {safeData.kenh || 'KÊNH'} - Mốc Đạt: Top {rankCutoff}
                </span>
                <h2 class="text-3xl font-black text-white mb-1 tracking-tight leading-tight">{safeData.sieuThi}</h2>
                <div class="flex items-center flex-wrap gap-4 text-blue-100 mt-2 text-sm font-medium">
                    <span class="flex items-center gap-1.5 label-with-icon"><i data-feather="box" class="w-4 h-4"></i> Thi đua: {safeData.soNganhHang} NH</span>
                    <span class="flex items-center gap-1.5 label-with-icon"><i data-feather="check-circle" class="w-4 h-4 text-green-400"></i> Đang đạt: {safeData.soNganhHangDat} NH</span>
                    
                    {#if listCoGiai.length > 0}
                        <span class="flex items-center gap-1.5 text-yellow-300 font-bold label-with-icon"><i data-feather="award" class="w-4 h-4"></i> Đã có giải: {listCoGiai.length} NH</span>
                    {/if}
                </div>
            </div>

            <div class="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center min-w-[200px]">
                <p class="text-blue-200 text-xs font-bold uppercase mb-1">Tổng Thưởng Hiện Tại</p>
                <p class="text-4xl font-black text-yellow-400 drop-shadow-md">
                    {formatMoney(safeData.tongThuong)}
                </p>
            </div>
        </div>
    </div>

    <div class="p-6 space-y-8">

        {#if listCoGiai.length > 0}
            <div class="bg-sky-50/50 rounded-xl border border-sky-100 overflow-hidden">
                <div class="px-5 py-3 bg-sky-100/50 border-b border-sky-200 flex items-center gap-2">
                    <i data-feather="check-circle" class="w-5 h-5 text-sky-600"></i>
                    <h3 class="font-bold text-sky-800 uppercase text-lg">Đang Nằm Trong Top Có Giải ({listCoGiai.length})</h3>
                </div>
                <div class="p-5 tdv-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                    {#each listCoGiai as item}
                        <div class="bg-white p-4 rounded-lg border border-sky-200 shadow-sm relative overflow-hidden group flex flex-col h-full">
                            <div class="absolute top-0 right-0 w-16 h-16 bg-sky-100 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                            
                            <h4 class="font-bold text-gray-800 mb-2 leading-tight line-clamp-2 h-[44px]" title={item.nganhHang}>{item.nganhHang}</h4>
                            
                            <div class="text-2xl font-black text-sky-600 money-large mb-3">
                                +{formatMoney(item.tongThuong)}
                            </div>
                            
                            <div class="space-y-1 mb-3 mt-auto relative z-10">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">DK Hoàn thành:</span>
                                    <span class="font-semibold text-gray-800">{numberFormatter.format(item.duKienHoanThanh * 100)}%</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Vượt mục tiêu:</span>
                                    <span class="font-semibold text-gray-800">{numberFormatter.format(item.duKienVuot)}</span>
                                </div>
                            </div>
                            <div class="text-xs text-sky-700 bg-sky-50 flex justify-between px-2 py-1 rounded font-medium border border-sky-100">
                                <span>Hạng: <b>{item.bestRank}</b></span>
                                <span>An toàn: <b>{rankCutoff - item.bestRank} bậc</b></span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if listTiemNang.length > 0}
            <div class="bg-yellow-50/50 rounded-xl border border-yellow-100 overflow-hidden">
                <div class="px-5 py-3 bg-yellow-100/50 border-b border-yellow-200 flex items-center gap-3 flex-wrap">
                    <div class="flex items-center gap-2">
                        <i data-feather="trending-up" class="w-5 h-5 text-yellow-600"></i>
                        <h3 class="font-bold text-yellow-800 uppercase text-lg">Tiềm Năng Sắp Có Giải ({listTiemNang.length})</h3>
                    </div>
                    {#if safeData.tongThuongTiemNang > 0}
                        <span class="text-green-600 font-bold text-base bg-white px-3 py-0.5 rounded-full border border-green-200 shadow-sm whitespace-nowrap">
                            + {formatMoney(safeData.tongThuongTiemNang)}
                        </span>
                    {/if}
                </div>
                <div class="p-5 tdv-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                    {#each listTiemNang as item}
                        <div class="bg-white p-4 rounded-lg border border-yellow-200 shadow-sm relative overflow-hidden flex flex-col h-full">
                            <div class="absolute top-0 right-0 w-16 h-16 bg-yellow-100 rounded-bl-full -z-0 opacity-50"></div>
                            
                            <h4 class="font-bold text-gray-800 mb-2 leading-tight line-clamp-2 h-[44px]" title={item.nganhHang}>{item.nganhHang}</h4>
                            
                            <div class="text-2xl font-black text-yellow-600 money-large mb-3 relative z-10">
                                {item.potentialPrize > 0 ? formatMoney(item.potentialPrize) : '0 đ'}
                            </div>
                            
                            <div class="space-y-1 mb-3 mt-auto relative z-10">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">DK Hoàn thành:</span>
                                    <span class="font-semibold text-gray-800">{numberFormatter.format(item.duKienHoanThanh * 100)}%</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Vượt mục tiêu:</span>
                                    <span class="font-semibold text-gray-800">{numberFormatter.format(item.duKienVuot)}</span>
                                </div>
                            </div>
                            <div class="text-xs text-yellow-700 bg-yellow-50 flex justify-between px-2 py-1 rounded font-medium border border-yellow-100">
                                <span>Hạng: <b>{item.bestRank}</b></span>
                                <span>Cách giải: <b>{item.bestRank - rankCutoff} hạng</b></span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if listCanCoGang.length > 0}
            <div class="bg-red-50/30 rounded-xl border border-red-100 overflow-hidden">
                <div class="px-5 py-3 bg-red-100/30 border-b border-red-100 flex items-center gap-2">
                    <i data-feather="alert-circle" class="w-5 h-5 text-red-500"></i>
                    <h3 class="font-bold text-red-800 uppercase text-lg">Cần Nỗ Lực Thêm ({listCanCoGang.length})</h3>
                </div>
                <div class="p-5 tdv-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                    {#each listCanCoGang as item}
                        <div class="bg-white p-3 rounded-lg border border-gray-200 opacity-80 hover:opacity-100 transition-opacity flex flex-col h-full">
                            <h4 class="font-semibold text-gray-700 mb-2 leading-tight line-clamp-2 h-[44px]" title={item.nganhHang}>{item.nganhHang}</h4>
                            
                            <div class="space-y-1 mb-2 mt-auto">
                                <div class="flex justify-between text-xs">
                                    <span class="text-gray-500">DK Hoàn thành:</span>
                                    <span class="font-semibold text-gray-800">{numberFormatter.format(item.duKienHoanThanh * 100)}%</span>
                                </div>
                                <div class="flex justify-between text-xs">
                                    <span class="text-gray-500">Vượt mục tiêu:</span>
                                    <span class="font-semibold text-gray-800">{numberFormatter.format(item.duKienVuot)}</span>
                                </div>
                            </div>
                            <div class="text-xs text-gray-500 flex justify-between items-center bg-white p-2 rounded border border-red-100">
                                <span>Hạng: <b>{item.bestRank}</b></span>
                                <span>Cách giải: <b>{item.bestRank - rankCutoff} hạng</b></span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    </div>
</div>

<style>
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* BẢO VỆ CHUẨN MỰC CHỤP ẢNH HTML2CANVAS */
    /* [FIX 1] Ép chuẩn 1100px giống file LuykeThiDua */
    :global(.capture-container) .tdv-root {
        width: 1100px !important; 
        max-width: 1100px !important;
        margin: 0 auto !important; 
        background-color: white;
        border: none !important;
        padding: 0 !important; 
    }

    :global(.capture-container) .tdv-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 16px !important;
    }

    :global(.capture-container) .line-clamp-2 {
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        white-space: normal !important;
        height: 44px !important; 
    }
    
    :global(.capture-container) .tdv-root h2 { font-size: 28px !important; }
    :global(.capture-container) .tdv-root .money-large { font-size: 36px !important; }

    /* [FIX 2] Xử lý SVG Icon lơ lửng khi chụp ảnh */
    :global(.capture-container svg) {
        display: inline-block !important;
        transform: translateY(3px) !important; /* Đẩy vật lý icon xuống 3px để thẳng hàng với chữ */
        margin-right: 4px !important;
    }

    :global(.capture-container .label-with-icon) {
        display: inline-flex !important;
        align-items: center !important;
    }
</style>