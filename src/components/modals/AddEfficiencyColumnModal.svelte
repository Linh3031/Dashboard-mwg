<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure } from '../../stores.js';
    import { cleanCategoryName } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null; // Nếu null là thêm mới, có data là sửa

    const dispatch = createEventDispatcher();

    // Dữ liệu form
    let label = '';
    let groupA = []; // Danh sách tên nhóm/ngành hàng tử số
    let groupB = []; // Danh sách tên nhóm/ngành hàng mẫu số
    let target = 80;
    let type = 'DTTL'; // 'SL', 'DTTL' (Doanh thu thực), 'DTQD'
    let searchA = '';
    let searchB = '';

    // Lấy danh sách duy nhất từ categoryStructure
    $: uniqueCategories = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nganhHang)).filter(Boolean))].sort();
    $: uniqueGroups = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))].sort();
    
    let modeA = 'group'; // 'group' | 'category'
    let modeB = 'category'; // 'group' | 'category'

    $: listSourceA = modeA === 'group' ? uniqueGroups : uniqueCategories;
    $: listSourceB = modeB === 'group' ? uniqueGroups : uniqueCategories;

    $: filteredListA = listSourceA.filter(i => i.toLowerCase().includes(searchA.toLowerCase()));
    $: filteredListB = listSourceB.filter(i => i.toLowerCase().includes(searchB.toLowerCase()));

    // Khởi tạo khi edit
    $: if (isOpen) {
        if (editItem) {
            label = editItem.label;
            groupA = [...(editItem.groupA || [])];
            groupB = [...(editItem.groupB || [])];
            target = editItem.target;
            type = editItem.type || 'DTTL';
            modeA = editItem.modeA || 'group';
            modeB = editItem.modeB || 'category';
        } else {
            // Reset logic nếu cần thiết
        }
    }

    function toggleSelection(list, item) {
        if (list.includes(item)) return list.filter(i => i !== item);
        return [...list, item];
    }

    function toggleAll(isA, sourceList) {
        if (isA) {
            groupA = groupA.length === sourceList.length ? [] : [...sourceList];
        } else {
            groupB = groupB.length === sourceList.length ? [] : [...sourceList];
        }
    }

    function handleSave() {
        if (!label) {
            alert("Vui lòng nhập Tên cột.");
            return;
        }
        if (groupA.length === 0) {
            alert("Vui lòng chọn ít nhất 1 mục cho Tử số (Nhóm A).");
            return;
        }
        if (groupB.length === 0) {
            alert("Vui lòng chọn ít nhất 1 mục cho Mẫu số (Nhóm B).");
            return;
        }

        dispatch('save', {
            id: editItem ? editItem.id : `eff_${Date.now()}`,
            label, 
            groupA, 
            groupB, 
            target, 
            type, 
            modeA, 
            modeB
        });
        close();
    }

    function close() {
        dispatch('close');
        setTimeout(() => {
            label = ''; groupA = []; groupB = []; searchA = ''; searchB = ''; 
            target = 80; type = 'DTTL';
        }, 300);
    }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm" on:click={close} role="button" tabindex="0">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" on:click|stopPropagation>
        
        <div class="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-xl font-bold text-gray-800">
                    {editItem ? 'Chỉnh sửa' : 'Thêm'} Cột Tỷ lệ Nhóm hàng
                </h3>
                <p class="text-sm text-gray-500 mt-1">Công thức tính: (Tổng Nhóm A / Tổng Nhóm B) * 100%</p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div>
                        <label for="col-label" class="block text-sm font-bold text-gray-700 mb-1">Tên hiển thị (Label)</label>
                        <input id="col-label" type="text" bind:value={label} class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="VD: % Gia dụng, % Phụ kiện...">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="col-target" class="block text-sm font-bold text-gray-700 mb-1">Mục tiêu khai thác (%)</label>
                            <input id="col-target" type="number" bind:value={target} class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="80">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Loại dữ liệu tính</label>
                            <div class="flex flex-col gap-2 mt-1">
                                <label class="cursor-pointer flex items-center text-sm"><input type="radio" bind:group={type} value="DTTL" class="mr-2 accent-blue-600"> Doanh thu Thực</label>
                                <label class="cursor-pointer flex items-center text-sm"><input type="radio" bind:group={type} value="DTQD" class="mr-2 accent-blue-600"> Doanh thu QĐ</label>
                                <label class="cursor-pointer flex items-center text-sm"><input type="radio" bind:group={type} value="SL" class="mr-2 accent-blue-600"> Số lượng</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 leading-relaxed">
                        <strong>Lưu ý:</strong> Nếu tỷ lệ của nhân viên nhỏ hơn Mục tiêu, ô sẽ được tô đỏ. Ngược lại sẽ có màu xanh.
                    </div>
                </div>

                <div class="hidden lg:flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100 p-6 text-center">
                    <div>
                        <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h4 class="font-bold text-blue-800 mb-1">Hướng dẫn chọn nhóm</h4>
                        <p class="text-sm text-blue-700">
                            <strong>Nhóm A (Tử số):</strong> Các nhóm hàng con cần tính tỷ lệ (VD: Nồi cơm, Bếp ga...).<br>
                            <strong>Nhóm B (Mẫu số):</strong> Ngành hàng mẹ để so sánh (VD: Gia dụng, CE...).
                        </p>
                    </div>
                </div>
            </div>

            <hr class="my-6 border-gray-200">

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-[450px]">
                <div class="flex flex-col border rounded-xl overflow-hidden border-gray-300 shadow-sm">
                    <div class="p-3 bg-blue-50 border-b border-blue-100">
                        <h4 class="font-bold text-blue-800 text-sm uppercase">Tên Nhóm A (Tử số)</h4>
                        <div class="flex gap-4 mt-2 text-xs font-medium text-gray-600">
                            <label class="flex items-center cursor-pointer hover:text-blue-700">
                                <input type="radio" bind:group={modeA} value="group" class="mr-1 accent-blue-600"> Nhóm hàng
                            </label>
                            <label class="flex items-center cursor-pointer hover:text-blue-700">
                                <input type="radio" bind:group={modeA} value="category" class="mr-1 accent-blue-600"> Ngành hàng
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-2 border-b border-gray-200 bg-white">
                        <input type="text" bind:value={searchA} class="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" placeholder="Tìm kiếm...">
                    </div>

                    <div class="flex-grow overflow-y-auto p-2 bg-slate-50 custom-scrollbar">
                        <div class="mb-2 px-2 flex justify-between items-center">
                            <span class="text-xs font-bold text-gray-500">{groupA.length} đã chọn</span>
                            <button class="text-xs text-blue-600 hover:underline font-medium" on:click={() => toggleAll(true, filteredListA)}>
                                {groupA.length === filteredListA.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>
                        <div class="space-y-1">
                            {#each filteredListA as item}
                                <label class="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-blue-200 group">
                                    <input type="checkbox" checked={groupA.includes(item)} on:change={() => groupA = toggleSelection(groupA, item)} class="mr-3 w-4 h-4 accent-blue-600 rounded border-gray-300">
                                    <span class="text-sm text-gray-700 group-hover:text-blue-700">{item}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                </div>

                <div class="flex flex-col border rounded-xl overflow-hidden border-gray-300 shadow-sm">
                    <div class="p-3 bg-green-50 border-b border-green-100">
                        <h4 class="font-bold text-green-800 text-sm uppercase">Tên Nhóm B (Mẫu số)</h4>
                        <div class="flex gap-4 mt-2 text-xs font-medium text-gray-600">
                            <label class="flex items-center cursor-pointer hover:text-green-700">
                                <input type="radio" bind:group={modeB} value="group" class="mr-1 accent-green-600"> Nhóm hàng
                            </label>
                            <label class="flex items-center cursor-pointer hover:text-green-700">
                                <input type="radio" bind:group={modeB} value="category" class="mr-1 accent-green-600"> Ngành hàng
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-2 border-b border-gray-200 bg-white">
                        <input type="text" bind:value={searchB} class="w-full p-2 border border-gray-300 rounded text-sm focus:border-green-500 outline-none" placeholder="Tìm kiếm...">
                    </div>

                    <div class="flex-grow overflow-y-auto p-2 bg-slate-50 custom-scrollbar">
                        <div class="mb-2 px-2 flex justify-between items-center">
                            <span class="text-xs font-bold text-gray-500">{groupB.length} đã chọn</span>
                            <button class="text-xs text-green-600 hover:underline font-medium" on:click={() => toggleAll(false, filteredListB)}>
                                {groupB.length === filteredListB.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>
                        <div class="space-y-1">
                            {#each filteredListB as item}
                                <label class="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-green-200 group">
                                    <input type="checkbox" checked={groupB.includes(item)} on:change={() => groupB = toggleSelection(groupB, item)} class="mr-3 w-4 h-4 accent-green-600 rounded border-gray-300">
                                    <span class="text-sm text-gray-700 group-hover:text-green-700">{item}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button on:click={close} class="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors shadow-sm">Hủy</button>
            <button on:click={handleSave} class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Lưu
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
</style>