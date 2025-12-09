<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure, macroCategoryConfig, macroProductGroupConfig } from '../../stores.js';
    import { cleanCategoryName } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null;
    export let mode = 'EFFICIENCY'; // 'EFFICIENCY' (Tỷ lệ) | 'UNIT_PRICE' (Đơn giá)

    const dispatch = createEventDispatcher();

    // Dữ liệu form
    let label = '';
    let groupA = []; // Nhóm hàng được chọn
    let groupB = []; // Mẫu số (Chỉ dùng cho Efficiency)
    let target = 80;
    let priceType = 'REAL'; // 'REAL' (Thực) | 'CONVERTED' (Quy đổi)
    let efficiencyType = 'DTTL'; 
    
    let searchA = '';
    let searchB = '';
    let step = 1; 

    // Nguồn dữ liệu chọn (Gộp tất cả: Macro + Nhóm hàng + Ngành hàng)
    $: allItems = [
        ...($macroCategoryConfig || []).map(m => m.name),
        ...($macroProductGroupConfig || []).map(m => m.name),
        ...[...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nganhHang)).filter(Boolean))],
        ...[...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))]
    ].sort();

    $: filteredListA = allItems.filter(i => i.toLowerCase().includes(searchA.toLowerCase()));
    $: filteredListB = allItems.filter(i => i.toLowerCase().includes(searchB.toLowerCase()));

    // Reset khi mở modal
    $: if (isOpen) {
        if (!editItem) {
            // Reset form add new
            if (!label) {
                target = mode === 'UNIT_PRICE' ? 0 : 80;
                step = 1;
            }
        } else {
            // Load data edit
            label = editItem.label;
            groupA = [...(editItem.groupA || [])];
            groupB = [...(editItem.groupB || [])];
            target = editItem.target;
            mode = editItem.mode || mode;
        }
    }

    function toggleItem(list, item) {
        if (list.includes(item)) return list.filter(i => i !== item);
        return [...list, item];
    }

    function handleNext() {
        if (step === 1) {
            if (!label.trim()) return alert("Vui lòng nhập tên chỉ số.");
            step = 2;
        } else if (step === 2) {
            if (groupA.length === 0) return alert("Vui lòng chọn ít nhất 1 nhóm hàng.");
            
            // LOGIC QUAN TRỌNG: Nếu là Đơn giá -> Bỏ qua bước 3, Lưu luôn
            if (mode === 'UNIT_PRICE') {
                handleSubmit();
            } else {
                step = 3;
                searchB = ''; // Reset search B khi chuyển qua bước 3
            }
        } else if (step === 3) {
            if (groupB.length === 0) return alert("Vui lòng chọn nhóm Mẫu số.");
            handleSubmit();
        }
    }

    function handleBack() {
        if (step > 1) step--;
    }

    function handleSubmit() {
        const payload = {
            id: editItem ? editItem.id : `custom_${Date.now()}`,
            label,
            groupA,
            mode: mode,
            target
        };

        if (mode === 'UNIT_PRICE') {
            // Cấu hình Đơn giá: Tử = Doanh thu (user chọn), Mẫu = Số lượng (Tự động)
            payload.typeA = priceType === 'REAL' ? 'DTTL' : 'DTQD';
            payload.typeB = 'SL'; 
            payload.groupB = groupA; // Mẫu số chính là nhóm đó
        } else {
            // Cấu hình Hiệu quả
            payload.groupB = groupB;
            payload.typeA = efficiencyType;
            payload.typeB = efficiencyType === 'SL' ? 'SL' : 'DTTL';
        }

        dispatch('save', payload);
        close();
    }

    function close() {
        dispatch('close');
        setTimeout(() => { step = 1; label = ''; groupA = []; groupB = []; searchA = ''; searchB = ''; }, 300);
    }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm" on:click={close} role="button" tabindex="0">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden" on:click|stopPropagation>
        
        <div class="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-xl font-bold text-gray-800">
                    {mode === 'UNIT_PRICE' ? 'Thêm Đơn giá' : 'Thêm Chỉ số Hiệu quả'}
                </h3>
                <p class="text-xs text-gray-500 mt-1">
                    {mode === 'UNIT_PRICE' 
                        ? 'Bước 1: Đặt tên & Loại DT -> Bước 2: Chọn nhóm hàng' 
                        : `Bước ${step}/3: ${step===1?'Thông tin':(step===2?'Chọn Tử số':'Chọn Mẫu số')}`
                    }
                </p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
            {#if step === 1}
                <div class="space-y-5">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Tên hiển thị</label>
                        <input type="text" bind:value={label} class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder={mode === 'UNIT_PRICE' ? "VD: ĐG Tivi Sony..." : "VD: % Tivi..."} autoFocus>
                    </div>

                    {#if mode === 'UNIT_PRICE'}
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <label class="block text-sm font-bold text-blue-800 mb-2">Tính theo doanh thu nào?</label>
                            <div class="flex gap-6">
                                <label class="inline-flex items-center cursor-pointer">
                                    <input type="radio" bind:group={priceType} value="REAL" class="form-radio text-blue-600 h-4 w-4">
                                    <span class="ml-2 text-sm text-gray-700 font-medium">Doanh thu Thực</span>
                                </label>
                                <label class="inline-flex items-center cursor-pointer">
                                    <input type="radio" bind:group={priceType} value="CONVERTED" class="form-radio text-purple-600 h-4 w-4">
                                    <span class="ml-2 text-sm text-gray-700 font-medium">Doanh thu Quy đổi</span>
                                </label>
                            </div>
                            <p class="text-xs text-blue-600 mt-3 italic">
                                * Hệ thống sẽ tự động lấy Tổng Doanh thu chia cho Tổng Số lượng của nhóm hàng bạn chọn ở bước sau.
                            </p>
                        </div>
                    {:else}
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Mục tiêu (%)</label>
                                <input type="number" bind:value={target} class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Loại dữ liệu tính</label>
                                <select bind:value={efficiencyType} class="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                                    <option value="DTTL">Doanh thu Thực</option>
                                    <option value="DTQD">Doanh thu QĐ</option>
                                    <option value="SL">Số lượng</option>
                                </select>
                            </div>
                        </div>
                        <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800">
                            Công thức: <strong>(Tổng Nhóm A / Tổng Nhóm B) * 100%</strong>
                        </div>
                    {/if}
                </div>

            {:else}
                <div class="flex flex-col h-full">
                    <div class="mb-3">
                        <label class="block text-sm font-bold text-gray-700 mb-1">
                            {step === 2 ? (mode === 'UNIT_PRICE' ? 'Chọn Nhóm Hàng' : 'Chọn Nhóm A (Tử số)') : 'Chọn Nhóm B (Mẫu số)'}
                        </label>
                        
                        {#if step === 2}
                            <input 
                                type="text" 
                                bind:value={searchA} 
                                class="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" 
                                placeholder="Tìm kiếm..."
                            >
                        {:else}
                            <input 
                                type="text" 
                                bind:value={searchB} 
                                class="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" 
                                placeholder="Tìm kiếm..."
                            >
                        {/if}
                    </div>

                    <div class="flex-grow border rounded-lg overflow-y-auto p-2 bg-slate-50 custom-scrollbar max-h-60">
                        {#each (step === 2 ? filteredListA : filteredListB) as item}
                            {@const list = step === 2 ? groupA : groupB}
                            <label class="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-blue-200 mb-1">
                                <input type="checkbox" checked={list.includes(item)} on:change={() => step === 2 ? groupA = toggleItem(groupA, item) : groupB = toggleItem(groupB, item)} class="mr-3 w-4 h-4 accent-blue-600 rounded border-gray-300">
                                <span class="text-sm text-gray-700 font-medium">{item}</span>
                            </label>
                        {/each}
                    </div>
                    
                    <div class="mt-2 text-right text-xs text-gray-500">
                        Đã chọn: <span class="font-bold text-blue-600">{(step === 2 ? groupA : groupB).length}</span> mục
                    </div>
                </div>
            {/if}
        </div>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            {#if step > 1}
                <button on:click={handleBack} class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors">Quay lại</button>
            {/if}
            
            <button on:click={handleNext} class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md transition-colors flex items-center gap-2">
                {#if (mode === 'UNIT_PRICE' && step === 2) || step === 3}
                    <i data-feather="check" class="w-4 h-4"></i> Lưu
                {:else}
                    Tiếp tục <i data-feather="arrow-right" class="w-4 h-4"></i>
                {/if}
            </button>
        </div>
    </div>
</div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>