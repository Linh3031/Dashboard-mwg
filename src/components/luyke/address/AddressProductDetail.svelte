<script>
    export let selectedNode = null;
    let displayData = [];
    let sortCol = 'doanhThu';
    let sortDir = 'desc';
    let expandedGroups = {}; 

    $: processProducts(selectedNode, sortCol, sortDir);

    function processProducts(node, col, dir) {
        if (!node || !node.products) {
            displayData = [];
            expandedGroups = {};
            return;
        }
        let arr = Object.values(node.products);
        arr.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return dir === 'asc' ? -1 : 1;
            if (valA > valB) return dir === 'asc' ? 1 : -1;
            return 0;
        });
        displayData = arr;
    }

    function handleSort(col) {
        if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = 'desc'; }
    }

    function toggleGroup(nhomHang) {
        expandedGroups[nhomHang] = !expandedGroups[nhomHang];
    }

    // Định dạng DT Tổng: chia 1 triệu, lấy 1 số lẻ
    function formatFinance(num) {
        return new Intl.NumberFormat('vi-VN', { 
            minimumFractionDigits: 1, 
            maximumFractionDigits: 1 
        }).format(num / 1000000);
    }

    function formatSL(num) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    }

    // FIX CHUẨN: Tính Đơn Giá, chia thẳng cho 1 triệu, lấy 1 số lẻ
    function getDonGia(dt, sl) {
        if (!sl || sl === 0) return "0,0";
        const unitPriceInMillions = (dt / sl) / 1000000;
        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(unitPriceInMillions);
    }
</script>

<div class="h-full flex flex-col bg-white rounded-lg shadow border border-gray-200">
    <div class="p-4 border-b border-gray-100 bg-blue-50/50">
        <h3 class="text-lg font-bold text-blue-800">
            {#if selectedNode}
                Thống kê nhóm hàng: <span class="text-orange-600">{selectedNode.name}</span>
            {:else}
                Vui lòng chọn khu vực bên trái
            {/if}
        </h3>
        <p class="text-sm text-gray-500 mt-1">
            Tổng doanh thu: <strong class="text-green-700">{selectedNode ? formatFinance(selectedNode.doanhThu) : "0,0"} Tr</strong> 
            | Tổng SL: <strong>{selectedNode ? formatSL(selectedNode.soLuong) : 0}</strong>
        </p>
    </div>

    <div class="overflow-y-auto flex-1 p-0">
        {#if displayData.length > 0}
            <table class="w-full text-sm text-left">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 shadow-sm z-10">
                    <tr>
                        <th class="w-8 p-3 border-b border-r border-gray-100"></th>
                        <th class="p-3 border-b cursor-pointer hover:bg-gray-200" on:click={() => handleSort('nhomHang')}>Nhóm Hàng / Tên Sản Phẩm {#if sortCol === 'nhomHang'}{sortDir === 'asc' ? '↑' : '↓'}{/if}</th>
                        <th class="p-3 border-b border-l cursor-pointer hover:bg-gray-200 text-right w-20" on:click={() => handleSort('soLuong')}>SL {#if sortCol === 'soLuong'}{sortDir === 'asc' ? '↑' : '↓'}{/if}</th>
                        <th class="p-3 border-b border-l cursor-pointer hover:bg-gray-200 text-right w-28" on:click={() => handleSort('doanhThu')}>DT (Tr) {#if sortCol === 'doanhThu'}{sortDir === 'asc' ? '↑' : '↓'}{/if}</th>
                        <th class="p-3 border-b border-l text-right w-28">Đơn Giá (Tr)</th>
                    </tr>
                </thead>
                <tbody>
                    {#each displayData as row}
                        <tr class="border-b hover:bg-gray-50 transition cursor-pointer" on:click={() => toggleGroup(row.nhomHang)}>
                            <td class="p-3 border-r border-gray-100 text-center text-gray-400">
                                {expandedGroups[row.nhomHang] ? '▼' : '▶'}
                            </td>
                            <td class="p-3 font-semibold text-gray-800">{row.nhomHang}</td>
                            <td class="p-3 text-right bg-gray-50 border-l">{formatSL(row.soLuong)}</td>
                            <td class="p-3 text-right font-bold text-green-700 bg-green-50/20 border-l">{formatFinance(row.doanhThu)}</td>
                            <td class="p-3 text-right text-gray-600 border-l">{getDonGia(row.doanhThu, row.soLuong)}</td>
                        </tr>

                        {#if expandedGroups[row.nhomHang] && row.productDetails}
                            {#each Object.values(row.productDetails).sort((a,b) => b.doanhThu - a.doanhThu) as sp}
                                <tr class="border-b bg-gray-50/50 hover:bg-gray-100 transition text-sm">
                                    <td class="p-2 border-r border-gray-100"></td>
                                    <td class="p-2 pl-6 text-gray-600 italic">↳ {sp.tenSanPham}</td>
                                    <td class="p-2 text-right border-l text-gray-600">{formatSL(sp.soLuong)}</td>
                                    <td class="p-2 text-right text-green-600 border-l">{formatFinance(sp.doanhThu)}</td>
                                    <td class="p-2 text-right text-gray-500 border-l">{getDonGia(sp.doanhThu, sp.soLuong)}</td>
                                </tr>
                            {/each}
                        {/if}
                    {/each}
                </tbody>
            </table>
        {:else}
            <div class="p-8 text-center text-gray-400">Không có dữ liệu hàng hóa.</div>
        {/if}
    </div>
</div>