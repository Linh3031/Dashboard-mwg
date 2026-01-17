<script>
    export let reportData = null;

    // --- HELPER FORMAT SỐ TIỀN ---
    const currencyFormatter = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    });

    const percentFormatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });

    function formatMoney(amount) {
        return currencyFormatter.format(amount || 0);
    }

    function formatPercent(val) {
        return percentFormatter.format(val || 0);
    }

    // --- XỬ LÝ DỮ LIỆU AN TOÀN (CRASH-PROOF) ---
    $: safeData = reportData || {};
    
    // Luôn đảm bảo details là mảng, kể cả khi dữ liệu lỗi
    $: rawDetails = Array.isArray(safeData.details) ? safeData.details : [];

    // Tự động phân loại dữ liệu dựa trên mảng details
    $: listDat = rawDetails.filter(item => (item.duKienHoanThanh || 0) >= 1);
    $: listChuaDat = rawDetails.filter(item => (item.duKienHoanThanh || 0) < 1);

    // Tính toán KPI tổng quan
    $: totalItems = rawDetails.length;
    $: totalDat = listDat.length;
    $: progressPercent = totalItems > 0 ? Math.round((totalDat / totalItems) * 100) : 0;
    
    // Màu sắc trạng thái
    $: statusColor = progressPercent >= 100 ? 'text-green-600' : (progressPercent >= 80 ? 'text-yellow-600' : 'text-red-600');
    $: barColor = progressPercent >= 100 ? 'bg-green-500' : (progressPercent >= 80 ? 'bg-yellow-500' : 'bg-red-500');

</script>

{#if reportData}
<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden font-sans mb-6">
    <div class="p-6 bg-gray-50 border-b border-gray-100">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <span class="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded uppercase tracking-wider">
                        {safeData.kenh || 'SIÊU THỊ'}
                    </span>
                    {safeData.sieuThi || 'Đang cập nhật tên...'}
                </h2>
                <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>Xếp hạng Top 10%: <b class="text-blue-600">{safeData.rankTop10 || '-'}</b></span>
                    <span>•</span>
                    <span>Xếp hạng Vượt trội: <b class="text-purple-600">{safeData.rankVuotTroi || '-'}</b></span>
                </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm min-w-[200px] text-right">
                <p class="text-xs text-gray-500 uppercase font-semibold mb-1">Tổng thưởng dự kiến</p>
                <p class="text-2xl font-bold text-green-600">{formatMoney(safeData.tongThuong)}</p>
            </div>
        </div>

        <div class="mt-6">
            <div class="flex justify-between items-end mb-2">
                <span class="text-sm font-medium text-gray-700">Tiến độ đạt chỉ tiêu ngành hàng</span>
                <span class="text-lg font-bold {statusColor}">{totalDat}/{totalItems} ({progressPercent}%)</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="{barColor} h-3 rounded-full transition-all duration-700 ease-out" style="width: {progressPercent}%"></div>
            </div>
        </div>
    </div>

    <div class="p-6">
        {#if listDat.length > 0}
            <h3 class="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Đã hoàn thành ({listDat.length})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {#each listDat as item}
                    <div class="p-4 rounded border border-green-100 bg-green-50/50 hover:shadow-md transition-shadow">
                        <p class="font-bold text-gray-800 truncate" title={item.nganhHang}>{item.nganhHang}</p>
                        <div class="flex justify-between items-center mt-2 text-sm">
                            <span class="text-gray-600">Đạt: <b class="text-green-600">{formatPercent(item.duKienHoanThanh)}</b></span>
                            <span class="font-medium text-green-700">{formatMoney(item.tongThuong)}</span>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        {#if listChuaDat.length > 0}
            <h3 class="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Cần cố gắng ({listChuaDat.length})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {#each listChuaDat as item}
                    <div class="p-4 rounded border border-gray-200 bg-white hover:border-red-300 transition-colors">
                        <p class="font-bold text-gray-700 truncate" title={item.nganhHang}>{item.nganhHang}</p>
                        <div class="mt-2 text-sm text-gray-500 flex justify-between">
                             <span>Hiện tại: <b class="text-red-500">{formatPercent(item.duKienHoanThanh)}</b></span>
                             {#if item.rankTarget}
                                <span>Hạng: {item.rankTarget}</span>
                             {/if}
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                            <div class="bg-red-400 h-1.5 rounded-full" style="width: {Math.min((item.duKienHoanThanh || 0) * 100, 100)}%"></div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        {#if rawDetails.length === 0}
            <div class="text-center py-10">
                <p class="text-gray-400 italic">Chưa có dữ liệu chi tiết cho siêu thị này.</p>
            </div>
        {/if}
    </div>
</div>
{/if}