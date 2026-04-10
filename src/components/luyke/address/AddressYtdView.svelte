<script>
    import { ycxData, ycxDataThangTruoc } from '../../../stores.js';
    import AddressDashboard from '../AddressDashboard.svelte';

    let selectedMonths = [];
    let allMonths = [];
    let showMonthDropdown = false;

    // 1. Gộp toàn bộ data 2026 từ 2 store
    $: combinedData = [...($ycxDataThangTruoc || []), ...($ycxData || [])];

    // --- 🚨 TRẠM GÁC LOG CHUYÊN SÂU (QUÉT TOÀN BỘ) 🚨 ---
    $: {
        if ($ycxDataThangTruoc && $ycxDataThangTruoc.length > 0) {
            console.group("%c🔥 QUÉT TÌM KEY TRÊN TOÀN BỘ 33.130 DÒNG", "color: white; background: blue; font-size: 14px; font-weight: bold; padding: 4px;");
            
            // Dùng Set để gom TẤT CẢ các tên cột từng xuất hiện trong bất kỳ dòng nào
            const allKeys = new Set();
            $ycxDataThangTruoc.forEach(row => {
                Object.keys(row).forEach(k => allKeys.add(k));
            });

            console.log("1. Danh sách TỔNG HỢP tất cả các cột tồn tại trong bộ nhớ:", Array.from(allKeys));
            
            // Tìm các cột tình nghi
            const suspectKeys = Array.from(allKeys).filter(k => 
                k.toLowerCase().includes('dia') || 
                k.toLowerCase().includes('chi') || 
                k.toLowerCase().includes('add') || 
                k.toLowerCase().includes('địa')
            );
            
            console.log("2. Các cột tình nghi là Địa chỉ (quét toàn mạng):", suspectKeys.length > 0 ? suspectKeys : "❌ VẪN KHÔNG TÌM THẤY! CACHE ĐÃ BỊ LƯU THIẾU TỪ TRƯỚC.");

            if (suspectKeys.length === 0) {
                console.log("%c💡 HÀNH ĐỘNG CẦN THIẾT: Vào mục Upload, hãy UP LẠI FILE THÁNG TRƯỚC để hệ thống ghi đè cache mới với config đã sửa!", "color: yellow; font-size: 14px; background: red; padding: 2px;");
            }
            
            console.groupEnd();
        }
    }

    // 2. Hàm trích xuất Tháng (1-12) an toàn
    const getMonth = (dateVal) => {
        if (!dateVal) return null;
        let d = dateVal instanceof Date ? dateVal : new Date(dateVal);
        if (isNaN(d.getTime())) {
            const str = String(dateVal).trim();
            const parts = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
            if (parts) d = new Date(parts[3], parts[2] - 1, parts[1]);
        }
        if (!d || isNaN(d.getTime())) return null;
        return d.getMonth() + 1; 
    };

    // 3. Tự động nhận diện các tháng có trong dữ liệu
    $: {
        if (combinedData.length > 0) {
            const mSet = new Set();
            combinedData.forEach(row => {
                const m = getMonth(row.ngayTao || row.NGAY_TAO);
                if (m) mSet.add(m);
            });
            allMonths = Array.from(mSet).sort((a, b) => a - b);
            
            if (selectedMonths.length === 0 && allMonths.length > 0) {
                selectedMonths = [...allMonths];
            }
        }
    }

    // 4. Lọc data cuối cùng
    $: finalData = combinedData.filter(row => {
        const m = getMonth(row.ngayTao || row.NGAY_TAO);
        return m && selectedMonths.includes(m);
    });

    function closeDropdown() { 
        showMonthDropdown = false;
    }
</script>

<svelte:window on:click={closeDropdown} />

<div class="flex flex-col gap-4">
    <div class="flex items-center gap-4 pb-2 border-b border-gray-100">
        <h2 class="text-xl font-bold text-blue-800">Thống kê địa chỉ khách hàng</h2>
        
        <div class="relative flex items-center gap-3">
            <button class="px-4 py-1.5 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 shadow-sm flex items-center gap-2" on:click|stopPropagation={() => showMonthDropdown = !showMonthDropdown}>
                Chọn tháng ({selectedMonths.length}/{allMonths.length}) ▾
            </button>
            
            {#if showMonthDropdown}
                <div class="absolute top-full mt-1 left-0 bg-white border border-gray-200 shadow-xl rounded-md w-56 max-h-64 overflow-y-auto z-50 p-2" on:click|stopPropagation>
                    <button class="text-blue-600 font-bold mb-2 w-full text-left text-sm hover:bg-blue-50 px-2 py-1.5 rounded transition-colors" on:click={() => selectedMonths = selectedMonths.length === allMonths.length ? [] : [...allMonths]}>
                        {selectedMonths.length === allMonths.length ? '[ ] Bỏ chọn tất cả' : '[✓] Chọn tất cả'}
                    </button>
                    <div class="grid grid-cols-2 gap-1">
                        {#each allMonths as opt}
                            <label class="flex items-center gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-sm rounded">
                                <input type="checkbox" value={opt} bind:group={selectedMonths} class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"> Tháng {opt}
                            </label>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <div class="w-full">
        <AddressDashboard ycxData={finalData} />
    </div>
</div>