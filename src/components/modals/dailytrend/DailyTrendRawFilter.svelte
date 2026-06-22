<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let isOpen = false;
    export let rawType = 'revenue';
    
    export let selectedNganh = []; export let selectedNhom = [];
    export let selectedHang = []; export let selectedSP = [];
    
    export let distinctCache = []; 
    export let listNganhHang = []; export let listNhomHang = []; 
    export let listHang = []; export let listSanPham = [];

    let searchNganh = ''; let searchNhom = ''; let searchHang = ''; let searchProduct = '';
    let dispNganh = []; let dispNhom = []; let dispHang = []; let dispSP = [];
    
    $: setNganh = new Set(selectedNganh); $: setNhom = new Set(selectedNhom); 
    $: setHang = new Set(selectedHang); $: setSP = new Set(selectedSP);

    $: if (!isOpen) { searchNganh = ''; searchNhom = ''; searchHang = ''; searchProduct = ''; }

    // Chỉ việc chờ Cha bơm cache vào và render danh sách hiển thị
    $: if (isOpen && distinctCache.length > 0) triggerUpdateOptions();

    function triggerUpdateOptions() {
        const tempNganh = new Set(); const tempNhom = new Set(); const tempHang = new Set(); const tempSP = new Set();
        for (let i = 0; i < distinctCache.length; i++) {
            const r = distinctCache[i];
            if (r.nganh) tempNganh.add(r.nganh);
            const matchNganh = setNganh.size === 0 || setNganh.has(r.nganh);
            if (matchNganh && r.nhom) tempNhom.add(r.nhom);
            const matchNhom = setNhom.size === 0 || setNhom.has(r.nhom);
            if (matchNganh && matchNhom && r.hang) tempHang.add(r.hang);
            const matchHang = setHang.size === 0 || setHang.has(r.hang);
            if (matchNganh && matchNhom && matchHang && r.sp) tempSP.add(r.sp);
        }
        listNganhHang = [...tempNganh].sort(); listNhomHang = [...tempNhom].sort();
        listHang = [...tempHang].sort(); listSanPham = [...tempSP].sort();
        updateDisplayNodes(); 
    }

    function updateDisplayNodes() {
        dispNganh = listNganhHang.filter(p => p.toLowerCase().includes(searchNganh.toLowerCase())).slice(0, 100);
        dispNhom = listNhomHang.filter(p => p.toLowerCase().includes(searchNhom.toLowerCase())).slice(0, 100);
        dispHang = listHang.filter(p => p.toLowerCase().includes(searchHang.toLowerCase())).slice(0, 100);
        dispSP = listSanPham.filter(p => p.toLowerCase().includes(searchProduct.toLowerCase())).slice(0, 100);
    }

    $: if (searchNganh !== undefined || searchNhom !== undefined || searchHang !== undefined || searchProduct !== undefined) {
        if (isOpen && distinctCache.length > 0) updateDisplayNodes();
    }

    function toggleSelection(type, item, isChecked) {
        if (type === 'nganh') selectedNganh = isChecked ? [...selectedNganh, item] : selectedNganh.filter(x => x !== item);
        else if (type === 'nhom') selectedNhom = isChecked ? [...selectedNhom, item] : selectedNhom.filter(x => x !== item);
        else if (type === 'hang') selectedHang = isChecked ? [...selectedHang, item] : selectedHang.filter(x => x !== item);
        else if (type === 'sp') selectedSP = isChecked ? [...selectedSP, item] : selectedSP.filter(x => x !== item);
    }

    function selectAll(type) {
        if (type === 'nganh') selectedNganh = [...new Set([...selectedNganh, ...dispNganh])];
        if (type === 'nhom') selectedNhom = [...new Set([...selectedNhom, ...dispNhom])];
        if (type === 'hang') selectedHang = [...new Set([...selectedHang, ...dispHang])];
        if (type === 'sp') selectedSP = [...new Set([...selectedSP, ...dispSP])];
    }
    
    function clearAll(type) {
        if (type === 'nganh') selectedNganh = [];
        if (type === 'nhom') selectedNhom = [];
        if (type === 'hang') selectedHang = [];
        if (type === 'sp') selectedSP = [];
    }
</script>

<div class="flex flex-col h-full">
    <div class="p-4 bg-white border-b border-gray-200 shrink-0">
        <label class="text-xs font-bold text-orange-600 uppercase mb-2 block">Cấu hình Loại dữ liệu lấy thô</label>
        <select bind:value={rawType} class="w-[300px] px-3 py-2 border border-orange-300 rounded-md text-sm font-bold text-orange-900 bg-orange-50 outline-none cursor-pointer focus:ring-2 focus:ring-orange-400">
            <option value="quantity">Số Lượng</option>
            <option value="revenue">Doanh Thu Thực</option>
            <option value="revenueQuyDoi">Doanh Thu Quy Đổi</option>
            <option value="unitPrice">Đơn Giá (Doanh Thu thực / Số Lượng)</option>
        </select>
    </div>

    <div class="flex-1 flex overflow-hidden">
        <div class="w-1/4 flex flex-col border-r border-gray-200 bg-white">
            <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                    <span>1. Ngành {#if selectedNganh.length > 0}<span class="text-blue-600">({selectedNganh.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                    <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('nganh')}>✓</button><button class="text-red-400" on:click={() => clearAll('nganh')}>✕</button></div>
                </div>
                <input type="text" bind:value={searchNganh} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
            </div>
            <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                {#each dispNganh as item}
                    <label class="flex items-start gap-2 p-1.5 hover:bg-blue-50 rounded cursor-pointer group"><input type="checkbox" checked={setNganh.has(item)} on:change={(e) => toggleSelection('nganh', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-700">{item}</span></label>
                {/each}
            </div>
        </div>

        <div class="w-1/4 flex flex-col border-r border-gray-200 bg-white">
            <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                    <span>2. Nhóm {#if selectedNhom.length > 0}<span class="text-orange-600">({selectedNhom.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                    <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('nhom')}>✓</button><button class="text-red-400" on:click={() => clearAll('nhom')}>✕</button></div>
                </div>
                <input type="text" bind:value={searchNhom} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
            </div>
            <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                {#each dispNhom as item}
                    <label class="flex items-start gap-2 p-1.5 hover:bg-orange-50 rounded cursor-pointer group"><input type="checkbox" checked={setNhom.has(item)} on:change={(e) => toggleSelection('nhom', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-700">{item}</span></label>
                {/each}
            </div>
        </div>

        <div class="w-1/4 flex flex-col border-r border-gray-200 bg-white">
            <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                    <span>3. Hãng {#if selectedHang.length > 0}<span class="text-purple-600">({selectedHang.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                    <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('hang')}>✓</button><button class="text-red-400" on:click={() => clearAll('hang')}>✕</button></div>
                </div>
                <input type="text" bind:value={searchHang} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
            </div>
            <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                {#each dispHang as item}
                    <label class="flex items-start gap-2 p-1.5 hover:bg-purple-50 rounded cursor-pointer group"><input type="checkbox" checked={setHang.has(item)} on:change={(e) => toggleSelection('hang', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-700">{item}</span></label>
                {/each}
            </div>
        </div>

        <div class="w-1/4 flex flex-col bg-white">
            <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                    <span>4. SP {#if selectedSP.length > 0}<span class="text-emerald-600">({selectedSP.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                    <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('sp')}>✓</button><button class="text-red-400" on:click={() => clearAll('sp')}>✕</button></div>
                </div>
                <input type="text" bind:value={searchProduct} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
            </div>
            <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                {#if dispSP.length === 0}
                    <p class="text-center text-[10px] text-gray-400 mt-5">Trống.</p>
                {:else}
                    {#each dispSP as item}
                        <label class="flex items-start gap-2 p-1.5 hover:bg-emerald-50 rounded cursor-pointer group border-b border-gray-50 last:border-0"><input type="checkbox" checked={setSP.has(item)} on:change={(e) => toggleSelection('sp', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-800 leading-snug">{item}</span></label>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>