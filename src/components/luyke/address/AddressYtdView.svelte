<script>
    import { onMount, onDestroy } from 'svelte';
    import { ycxData, ycxDataThangTruoc } from '../../../stores.js';
    import AddressDashboard from '../AddressDashboard.svelte';

    let selectedMonths = [];
    let allMonths = [];
    let showMonthDropdown = false;
    let hasInitializedMonths = false; 
    let pendingMappings = {};
    let syncTimer;

    // [PHẪU THUẬT LOGIC]: Bổ sung trạng thái UX Nút Lưu và Lifecycle
    let showSaveToast = false;
    let isInitialLoad = true;

    $: combinedData = [...($ycxDataThangTruoc || []), ...($ycxData || [])];

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

    $: {
        if (combinedData.length > 0) {
            const mSet = new Set();
            combinedData.forEach(row => {
                const m = getMonth(row.ngayTao || row.NGAY_TAO);
                if (m) mSet.add(m);
            });
            allMonths = Array.from(mSet).sort((a, b) => a - b);
            if (!hasInitializedMonths && allMonths.length > 0) {
                selectedMonths = [...allMonths];
                hasInitializedMonths = true;
            }
        }
    }

    $: finalData = combinedData.filter(row => {
        const m = getMonth(row.ngayTao || row.NGAY_TAO);
        return m && selectedMonths.includes(m);
    });

    function closeDropdown() { 
        showMonthDropdown = false;
    }

    // [PHẪU THUẬT LOGIC]: Tự động khôi phục cấu hình khi F5
    onMount(() => {
        const savedMappings = localStorage.getItem('address_mappings_v1');
        if (savedMappings) {
            try {
                pendingMappings = JSON.parse(savedMappings);
            } catch(e) {}
        }
        // Cho hệ thống một nhịp trễ để vẽ cây, sau đó mới kích hoạt bộ theo dõi Sync
        setTimeout(() => { isInitialLoad = false; }, 500);
    });

    function syncToCloudSilently() {
        if (isInitialLoad) return; 
        
        console.group("☁️ [SILENT SYNC] Đã tự động lưu cấu hình địa chỉ");
        console.log(JSON.parse(JSON.stringify(pendingMappings)));
        console.groupEnd();

        // Ghi vào RAM của trình duyệt trước để chống F5
        localStorage.setItem('address_mappings_v1', JSON.stringify(pendingMappings));
        
        // Nơi gọi API Firebase Update Document tại đây.
    }

    // [PHẪU THUẬT LOGIC]: Hành vi khi nhấn Nút Lưu thủ công
    function handleManualSave() {
        clearTimeout(syncTimer);
        syncToCloudSilently();
        
        showSaveToast = true;
        setTimeout(() => { showSaveToast = false; }, 3000);
    }

    // TRIGGER BỘ ĐẾM 60S (SILENT)
    $: {
        // Cú lừa Svelte để trigger re-run block này khi object pendingMappings thay đổi
        const _trigger = pendingMappings; 
        
        if (!isInitialLoad) {
            clearTimeout(syncTimer);
            syncTimer = setTimeout(() => {
                syncToCloudSilently();
            }, 60000); 
        }
    }

    onDestroy(() => {
        clearTimeout(syncTimer);
        if (!isInitialLoad && Object.keys(pendingMappings).length > 0) {
            syncToCloudSilently(); 
        }
    });

</script>

<svelte:window on:click={closeDropdown} />

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between pb-2 border-b border-gray-100">
        <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold text-blue-800">Thống kê địa chỉ khách hàng</h2>
            
            {#if showSaveToast}
                <span class="text-sm font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 animate-fade-in shadow-sm flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Đã lưu cấu hình
                </span>
            {/if}
        </div>
        
        <div class="relative flex items-center gap-3">
            <!-- NÚT LƯU CẤU HÌNH -->
            <button class="px-4 py-1.5 border border-blue-200 rounded-md bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 shadow-sm flex items-center gap-2 transition" on:click={handleManualSave}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Lưu
            </button>

            <button class="px-4 py-1.5 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 shadow-sm flex items-center gap-2" on:click|stopPropagation={() => showMonthDropdown = !showMonthDropdown}>
                Chọn tháng ({selectedMonths.length}/{allMonths.length}) ▾
            </button>
            
            {#if showMonthDropdown}
                <div class="absolute top-full mt-1 right-0 bg-white border border-gray-200 shadow-xl rounded-md w-56 max-h-64 overflow-y-auto z-50 p-2" on:click|stopPropagation>
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
        <AddressDashboard ycxData={finalData} bind:pendingMappings={pendingMappings} />
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { 
        from { opacity: 0; transform: translateY(-3px); } 
        to { opacity: 1; transform: translateY(0); } 
    }
</style>