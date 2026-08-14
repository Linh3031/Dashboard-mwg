<script>
    export let selectedNode = null;
    export let cleanLocations = []; 
    export let pendingMappings = {}; 
    export let onMappingChange = (raw, mapped) => {};

    let displayData = [];
    let sortCol = 'doanhThu';
    let sortDir = 'desc';
    let expandedGroups = {}; 
    let processingTimer;

    let isDropdownOpen = false;
    let searchQuery = '';
    
    // [PHẪU THUẬT LOGIC]: Biến tạm để lưu trạng thái đang chọn trước khi bấm Lưu
    let tempSelectedValue = "";

    $: filteredLocations = cleanLocations.filter(loc => 
        loc.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    $: {
        clearTimeout(processingTimer);
        processingTimer = setTimeout(() => {
            processProducts(selectedNode, sortCol, sortDir);
        }, 0);
    }

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

    function formatFinance(num) {
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num / 1000000);
    }

    function formatSL(num) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    }

    function getDonGia(dt, sl) {
        if (!sl || sl === 0) return "0,0";
        const unitPriceInMillions = (dt / sl) / 1000000;
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(unitPriceInMillions);
    }
    
    function toggleDropdown(e) {
        e.stopPropagation();
        isDropdownOpen = !isDropdownOpen;
        if(isDropdownOpen) {
            searchQuery = '';
            // Nạp giá trị đang map hiện tại vào biến tạm
            tempSelectedValue = pendingMappings[selectedNode?.name] || "";
        }
    }

    function selectTempItem(val) {
        tempSelectedValue = val;
    }

    // Nút Lưu chính thức gọi lệnh cập nhật
    function confirmMapping() {
        onMappingChange(selectedNode.name, tempSelectedValue);
        isDropdownOpen = false;
    }
</script>

<svelte:window on:click={() => isDropdownOpen = false} />

<div class="h-full flex flex-col bg-white rounded-lg shadow border border-gray-200">
    <div class="p-4 border-b border-gray-100 bg-blue-50/50 flex flex-col gap-2 relative">
        <div class="flex justify-between items-start md:items-center w-full gap-4">
            <h3 class="text-lg font-bold text-blue-800 flex-1 truncate">
                {#if selectedNode}
                    Thống kê: <span class="text-orange-600" title={selectedNode.name}>{selectedNode.name}</span>
                {:else}
                    Vui lòng chọn khu vực bên trái
                {/if}
            </h3>
            
            {#if selectedNode && (selectedNode.level >= 1 || selectedNode.id === 'empty') && cleanLocations.length > 0}
                <div class="relative">
                    <!-- [PHẪU THUẬT GIAO DIỆN]: Giấu chức năng sau Icon Chỉnh Sửa -->
                    <button 
                        class="px-2 py-1.5 bg-white border border-gray-300 text-gray-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 rounded shadow-sm transition flex items-center gap-1.5 text-sm font-medium" 
                        title="Chỉnh sửa/Gộp khu vực" 
                        on:click={toggleDropdown}
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        <span>Chỉnh sửa gộp</span>
                    </button>
                    
                    {#if isDropdownOpen}
                        <div class="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-[340px] overflow-hidden flex flex-col max-h-[450px]" on:click|stopPropagation>
                            
                            <!-- Tiêu đề Cảnh báo / Hướng dẫn -->
                            <div class="p-3 border-b border-orange-100 bg-orange-50">
                                <p class="text-[13px] font-bold text-orange-800 uppercase tracking-wide">Chọn lại phân loại đúng cho địa chỉ này</p>
                            </div>
                            
                            <div class="p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                                <input 
                                    type="text" 
                                    class="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="🔍 Tìm Phường/Xã..." 
                                    bind:value={searchQuery}
                                    autofocus
                                />
                            </div>
                            
                            <div class="overflow-y-auto flex-1 p-1.5">
                                <div 
                                    class="p-2.5 text-sm cursor-pointer rounded mb-1 border transition-colors {tempSelectedValue === '' ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'border-transparent text-red-600 hover:bg-red-50'}"
                                    on:click={() => selectTempItem("")}
                                >
                                    ⓧ Hủy gộp (Khôi phục dữ liệu gốc)
                                </div>
                                {#if filteredLocations.length === 0}
                                    <div class="p-4 text-sm text-gray-400 text-center">Không tìm thấy kết quả</div>
                                {:else}
                                    {#each filteredLocations as loc}
                                        <div 
                                            class="p-2.5 text-sm cursor-pointer rounded mb-1 border transition-colors {tempSelectedValue === loc.value ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-transparent text-gray-700 hover:bg-gray-100'}"
                                            title={loc.label}
                                            on:click={() => selectTempItem(loc.value)}
                                        >
                                            {loc.label}
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                            
                            <!-- Action Footer -->
                            <div class="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <button class="px-4 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition" on:click={() => isDropdownOpen = false}>Hủy</button>
                                <button class="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm transition" on:click={confirmMapping}>Lưu thay đổi</button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        
        <p class="text-sm text-gray-500">
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
                            <td class="p-3 border-r border-gray-100 text-center text-gray-400">{expandedGroups[row.nhomHang] ? '▼' : '▶'}</td>
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