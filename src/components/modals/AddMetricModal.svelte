<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure, macroCategoryConfig, macroProductGroupConfig } from '../../stores.js';
    import { cleanCategoryName } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null; // [MỚI] Nhận item cần sửa

    const dispatch = createEventDispatcher();

    // Form data
    let label = '';
    let selectedGroups = [];
    let revenueType = 'REAL';
    let search = '';

    // Data Source
    $: allItems = [
        ...($macroCategoryConfig || []).map(m => m.name),
        ...($macroProductGroupConfig || []).map(m => m.name),
        ...[...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nganhHang)).filter(Boolean))],
        ...[...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))]
    ].sort();

    $: filteredList = allItems.filter(i => i.toLowerCase().includes(search.toLowerCase()));

    // [MỚI] Logic Reset / Load Data khi mở modal
    $: if (isOpen) {
        if (editItem) {
            // Chế độ Sửa: Load dữ liệu từ item cũ
            label = editItem.label;
            // Với đơn giá, groupA và groupB giống nhau, lấy groupA là đủ
            selectedGroups = [...(editItem.groupA || [])];
            // Xác định loại doanh thu: Nếu typeA là DTQD -> CONVERTED, ngược lại REAL
            revenueType = editItem.typeA === 'DTQD' ? 'CONVERTED' : 'REAL';
            search = '';
        } else {
            // Chế độ Thêm mới: Reset trắng
            label = '';
            selectedGroups = [];
            revenueType = 'REAL';
            search = '';
        }
    }

    function toggleItem(item) {
        if (selectedGroups.includes(item)) {
            selectedGroups = selectedGroups.filter(i => i !== item);
        } else {
            selectedGroups = [...selectedGroups, item];
        }
    }

    function handleSelectAll(isSelect) {
        selectedGroups = isSelect ? [...filteredList] : [];
    }

    function handleSave() {
        if (!label.trim()) return alert("Vui lòng nhập Tên Đơn giá.");
        if (selectedGroups.length === 0) return alert("Vui lòng chọn ít nhất 1 nhóm hàng.");

        const payload = {
            id: editItem ? editItem.id : `custom_price_${Date.now()}`, // Giữ ID cũ nếu sửa
            label: label,
            groupA: selectedGroups,
            groupB: selectedGroups,
            type: 'UNIT_PRICE',
            typeA: revenueType === 'REAL' ? 'DTTL' : 'DTQD',
            typeB: 'SL'
        };

        dispatch('save', payload);
        dispatch('close');
    }

    function close() {
        dispatch('close');
    }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-gray-900 bg-opacity-60 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" on:click={close} role="button" tabindex="0">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden" on:click|stopPropagation>
        
        <div class="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-lg font-bold text-gray-800 uppercase">
                    {editItem ? 'Chỉnh Sửa Đơn Giá' : 'Thêm Đơn Giá Mới'}
                </h3>
                <p class="text-xs text-gray-500 mt-1">Công thức: Tổng Doanh thu / Tổng Số lượng</p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 bg-white custom-scrollbar">
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">1. Đặt tên Đơn giá <span class="text-red-500">*</span></label>
                    <input type="text" bind:value={label} class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold" placeholder="VD: ĐG Tivi, ĐG Gia dụng..." autoFocus>
                </div>

                <div class="flex flex-col h-[300px] border border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50">
                    <label class="block text-sm font-bold text-gray-700 mb-2">2. Chọn Nhóm hàng tính toán</label>
                    <div class="mb-2 relative">
                        <input type="text" bind:value={search} class="w-full p-2 pl-8 border border-gray-300 rounded text-xs focus:border-blue-500 outline-none bg-white" placeholder="Tìm kiếm nhóm hàng...">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-2.5 top-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div class="flex justify-between items-center mb-2 px-1">
                        <span class="text-xs font-bold text-blue-600">Đã chọn: {selectedGroups.length}</span>
                        <div class="space-x-2">
                            <button on:click={() => handleSelectAll(true)} class="text-xs text-gray-500 hover:text-blue-600 underline">Chọn hết</button>
                            <button on:click={() => handleSelectAll(false)} class="text-xs text-gray-500 hover:text-red-600 underline">Bỏ chọn</button>
                        </div>
                    </div>
                    <div class="flex-grow overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded">
                        {#each filteredList as item}
                            <label class="flex items-center p-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0">
                                <input type="checkbox" checked={selectedGroups.includes(item)} on:change={() => toggleItem(item)} class="mr-3 w-4 h-4 accent-blue-600 rounded border-gray-300">
                                <span class="text-sm text-gray-700">{item}</span>
                            </label>
                        {/each}
                    </div>
                </div>

                <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label class="block text-sm font-bold text-blue-800 mb-2">3. Chọn loại Doanh thu (Tử số)</label>
                    <div class="flex gap-6">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" bind:group={revenueType} value="REAL" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                            <span class="ml-2 text-sm text-gray-700 font-medium">Doanh thu Thực (DTLK)</span>
                        </label>
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" bind:group={revenueType} value="CONVERTED" class="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500">
                            <span class="ml-2 text-sm text-gray-700 font-medium">Doanh thu Quy đổi (DTQĐ)</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button on:click={close} class="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors shadow-sm">Huỷ bỏ</button>
            <button on:click={handleSave} class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                Lưu Đơn Giá
            </button>
        </div>
    </div>
</div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
</style>