<script>
    export let reportData = null;

    // --- HELPER ---
    const currencyFormatter = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    });
    
    const numberFormatter = new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0 // 0 nghĩa là làm tròn, không lấy số thập phân
    });

    function formatMoney(amount) {
        return currencyFormatter.format(amount || 0);
    }

    // --- LOGIC PHÂN LOẠI ---
    $: safeData = reportData || {};
    $: rankCutoff = safeData.rankCutoff || 0;
    $: rawDetails = Array.isArray(safeData.details) ? safeData.details : [];

    // 1. NHÓM CÓ GIẢI (Xanh)
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
        return gap >= 10 || d.bestRank === 9999;
    });

</script>

<div class="tdv-root bg-white w-full shadow-sm border border-gray-200 overflow-hidden font-sans rounded-xl mb-6">
    
    <div class="bg-gray-50 p-6 border-b border-gray-100">
        <div class="text-center mb-6">
             <h2 class="text-3xl font-bold text-gray-800 flex flex-col items-center justify-center gap-2">
                <span class="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded uppercase tracking-wider">
                    {safeData.kenh}
                </span>
                <span>{safeData.sieuThi}</span>
            </h2>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div class="bg-white rounded-lg p-3 border border-green-200 shadow-sm text-center flex flex-col justify-center">
                <p class="text-xs text-green-700 uppercase font-semibold tracking-wide mb-1">Tổng Thưởng</p>
                <p class="money-large text-2xl font-black text-green-600 leading-none">{formatMoney(safeData.tongThuong)}</p>
            </div>

            <div class="bg-white rounded-lg p-3 border border-gray-200 text-center flex flex-col justify-center">
                <p class="text-xs text-gray-500 uppercase font-bold">Hạng có giải theo kênh</p>
                <p class="text-2xl font-bold text-gray-800 mt-1">Top {rankCutoff}</p>
            </div>

            <div class="bg-white rounded-lg p-3 border border-gray-200 text-center flex flex-col justify-center">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">Đang có giải</p>
                <p class="text-2xl font-bold text-blue-600 leading-none">{listCoGiai.length}</p>
                <p class="text-[10px] text-gray-400 mt-1">ngành hàng</p>
            </div>

            <div class="bg-white rounded-lg p-3 border border-gray-200 text-center flex flex-col justify-center">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">Sắp có giải</p>
                <p class="text-2xl font-bold text-yellow-600 leading-none">{listTiemNang.length}</p>
                <p class="text-[10px] text-gray-400 mt-1">tiềm năng</p>
            </div>
        </div>
    </div>

    <div class="p-6 bg-white">
        
        {#if listCoGiai.length > 0}
            <div class="mb-8">
                <h3 class="text-lg font-bold text-blue-700 uppercase mb-4 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-blue-600"></span>
                    Đang có giải ({listCoGiai.length})
                </h3>
                <div class="tdv-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {#each listCoGiai as item}
                        <div class="bg-blue-50/50 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden">
                            <div class="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                Hạng {item.bestRank}
                            </div>
                            <h4 class="card-title font-bold text-gray-800 text-sm mb-3 pr-16 truncate" title={item.nganhHang}>{item.nganhHang}</h4>
                            
                            <div class="text-center my-3">
                                <span class="card-money block text-2xl font-black text-blue-600 leading-none">{formatMoney(item.tongThuong)}</span>
                                <span class="text-xs text-blue-500 font-medium mt-1 block">Thưởng dự kiến</span>
                            </div>

                            <div class="bg-white rounded p-2 flex justify-between items-center text-xs border border-blue-100">
                                 <span class="text-gray-600">Vượt: <b class="text-blue-700">+{numberFormatter.format(item.duKienVuot)}</b></span>
                                 <span class="text-gray-600">Đạt: <b class="text-blue-700">{(item.duKienHoanThanh * 100).toFixed(0)}%</b></span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if listTiemNang.length > 0}
            <div class="mb-8">
                <h3 class="text-lg font-bold text-yellow-700 uppercase mb-4 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                    Tiềm năng - Sắp có giải ({listTiemNang.length})
                </h3>
                <div class="tdv-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {#each listTiemNang as item}
                        <div class="bg-yellow-50/50 border-2 border-yellow-300 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden">
                             <div class="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                Hạng {item.bestRank}
                            </div>
                            <h4 class="card-title font-bold text-gray-800 text-sm mb-3 pr-16 truncate" title={item.nganhHang}>{item.nganhHang}</h4>

                            <div class="text-center my-3">
                                <span class="card-money block text-2xl font-black text-yellow-600 leading-none opacity-50">
                                    {formatMoney(item.potentialPrize)}
                                </span>
                                <span class="text-[10px] text-yellow-600 font-bold uppercase mt-1 block">Thưởng nếu đạt giải</span>
                            </div>

                            <div class="bg-white rounded-lg p-2 my-2 border border-yellow-200 text-center">
                                <div class="flex justify-between items-center text-xs mb-1">
                                    <span class="text-gray-500">Cần chạy thêm:</span>
                                    <b class="text-red-600 text-sm">{numberFormatter.format(Math.abs(item.duKienVuot))}</b>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                     <span class="text-gray-500">Khoảng cách:</span>
                                     <span class="font-bold text-red-500">{item.bestRank - rankCutoff} hạng</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if listCanCoGang.length > 0}
            <div>
                <h3 class="text-lg font-bold text-red-700 uppercase mb-4 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-red-500"></span>
                    Cần cố gắng ({listCanCoGang.length})
                </h3>
                <div class="tdv-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {#each listCanCoGang as item}
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm hover:border-red-300 transition-colors">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="card-title font-bold text-gray-700 text-sm w-2/3 truncate" title={item.nganhHang}>{item.nganhHang}</h4>
                                <span class="text-xs font-bold text-red-400">{(item.duKienHoanThanh * 100).toFixed(0)}%</span>
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
    /* Khi nằm trong container chụp ảnh (.capture-container) */
    :global(.capture-container) .tdv-root {
        width: 960px !important; /* Giảm từ 1100 xuống 960 cho gọn */
        max-width: 960px !important;
        margin: 0 !important; /* Xóa margin auto */
        background-color: white;
        border: none !important;
        padding: 0 !important; /* Xóa padding thừa */
    }

    /* Cưỡng ép lưới thẻ con thành 4 CỘT trên 1 dòng */
    :global(.capture-container) .tdv-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 12px !important;
    }
    
    :global(.capture-container) .tdv-root h2 { font-size: 28px !important; }
    :global(.capture-container) .tdv-root .money-large { font-size: 36px !important; }
    :global(.capture-container) .tdv-root .card-title { font-size: 15px !important; }
    :global(.capture-container) .tdv-root .card-money { font-size: 24px !important; }
</style>