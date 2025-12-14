<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure } from '../../stores.js';
    import { parseIdentity } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null; // Nếu null là thêm mới, có data là sửa
    export let isAdmin = false; // Biến cờ xác định Admin/User

    const dispatch = createEventDispatcher();

    // --- FORM DATA ---
    let label = '';
    let groupA = []; // Lưu danh sách ID
    let groupB = []; // Lưu danh sách ID
    let target = 80;
    let type = 'DTTL'; // 'SL', 'DTTL', 'DTQD'
    let searchA = '';
    let searchB = '';
    let modeA = 'group'; // 'group' | 'category'
    let modeB = 'category'; // 'group' | 'category'

    // --- DATA PREPARATION ---
    // 1. Danh sách Ngành hàng (Unique by ID)
    $: uniqueCategories = (() => {
        const map = new Map();
        ($categoryStructure || []).forEach(c => {
            if(!c.nganhHang) return;
            const parsed = parseIdentity(c.nganhHang);
            if (parsed.id && parsed.id !== 'unknown') {
                map.set(parsed.id, { 
                    id: parsed.id, 
                    display: `${parsed.id} - ${parsed.name}` 
                });
            }
        });
        return Array.from(map.values()).sort((a,b) => a.display.localeCompare(b.display));
    })();

    // 2. Danh sách Nhóm hàng (Unique by ID)
    $: uniqueGroups = (() => {
        const map = new Map();
        ($categoryStructure || []).forEach(c => {
            if(!c.nhomHang) return;
            const parsed = parseIdentity(c.nhomHang);
            if (parsed.id && parsed.id !== 'unknown') {
                map.set(parsed.id, { 
                    id: parsed.id, 
                    display: `${parsed.id} - ${parsed.name}` 
                });
            }
        });
        return Array.from(map.values()).sort((a,b) => a.display.localeCompare(b.display));
    })();
    
    // --- LIST SOURCE ---
    $: listSourceA = modeA === 'group' ? uniqueGroups : uniqueCategories;
    $: listSourceB = modeB === 'group' ? uniqueGroups : uniqueCategories;

    // --- SORTING LOGIC: SELECTED FIRST ---
    // Lọc theo search -> Sắp xếp (Đã chọn lên đầu -> Alpha)
    $: visibleListA = listSourceA
        .filter(i => i.display.toLowerCase().includes(searchA.toLowerCase()))
        .sort((a, b) => {
            const aSel = groupA.includes(a.id);
            const bSel = groupA.includes(b.id);
            if (aSel && !bSel) return -1;
            if (!aSel && bSel) return 1;
            return 0; // Giữ nguyên thứ tự alpha nếu cùng trạng thái
        });

    $: visibleListB = listSourceB
        .filter(i => i.display.toLowerCase().includes(searchB.toLowerCase()))
        .sort((a, b) => {
            const aSel = groupB.includes(b.id);
            const bSel = groupB.includes(a.id);
            if (aSel && !bSel) return -1; // Fix logic sort chiều B
            if (!aSel && bSel) return 1;
            
            // Logic chuẩn: Selected A lên đầu
            const isASel = groupB.includes(a.id);
            const isBSel = groupB.includes(b.id);
            if (isASel && !isBSel) return -1;
            if (!isASel && isBSel) return 1;
            return 0;
        });

    // --- INIT ---
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
            label = '';
            groupA = [];
            groupB = [];
            target = 80;
            type = 'DTTL';
            modeA = 'group';
            modeB = 'category';
            searchA = '';
            searchB = '';
        }
    }

    // --- HANDLERS ---
    function toggleSelection(isA, id) {
        if (isA) {
            if (groupA.includes(id)) groupA = groupA.filter(i => i !== id);
            else groupA = [...groupA, id];
        } else {
            if (groupB.includes(id)) groupB = groupB.filter(i => i !== id);
            else groupB = [...groupB, id];
        }
    }

    function toggleAll(isA, sourceList) {
        // Chỉ toggle những item đang hiển thị (theo search)
        const visibleIds = sourceList.map(i => i.id);
        if (isA) {
            const allSelected = visibleIds.every(id => groupA.includes(id));
            if (allSelected) {
                // Bỏ chọn tất cả visible
                groupA = groupA.filter(id => !visibleIds.includes(id));
            } else {
                // Chọn tất cả visible (merge unique)
                groupA = [...new Set([...groupA, ...visibleIds])];
            }
        } else {
            const allSelected = visibleIds.every(id => groupB.includes(id));
            if (allSelected) {
                groupB = groupB.filter(id => !visibleIds.includes(id));
            } else {
                groupB = [...new Set([...groupB, ...visibleIds])];
            }
        }
    }

    function handleSave() {
        if (!label.trim()) return alert("Vui lòng nhập Tên cột.");
        if (groupA.length === 0) return alert("Vui lòng chọn ít nhất 1 mục cho Tử số (Nhóm A).");
        if (groupB.length === 0) return alert("Vui lòng chọn ít nhất 1 mục cho Mẫu số (Nhóm B).");

        dispatch('save', {
            id: editItem ? editItem.id : `eff_${Date.now()}`,
            label, 
            groupA, 
            groupB, 
            target: isAdmin ? 0 : target, 
            type, 
            modeA, 
            modeB
        });
        close();
    }

    function close() {
        dispatch('close');
    }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm" on:click={close} role="button" tabindex="0">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" on:click|stopPropagation>
        
        <div class="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {editItem ? 'Chỉnh sửa' : 'Thêm'} Chỉ số Hiệu quả
                    {#if isAdmin}
                        <span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 uppercase">System Config</span>
                    {/if}
                </h3>
                <p class="text-sm text-gray-500 mt-1">Công thức: (Tổng Nhóm A / Tổng Nhóm B) * 100%</p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
            
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                <div>
                    <label for="col-label" class="block text-xs font-bold text-gray-500 uppercase mb-1">Tên hiển thị</label>
                    <input id="col-label" type="text" bind:value={label} class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold" placeholder="VD: % Gia dụng...">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Loại dữ liệu</label>
                    <div class="flex gap-4 mt-2">
                        <label class="flex items-center text-sm cursor-pointer"><input type="radio" bind:group={type} value="DTTL" class="mr-1.5 accent-blue-600"> DT Thực</label>
                        <label class="flex items-center text-sm cursor-pointer"><input type="radio" bind:group={type} value="DTQD" class="mr-1.5 accent-purple-600"> DT QĐ</label>
                        <label class="flex items-center text-sm cursor-pointer"><input type="radio" bind:group={type} value="SL" class="mr-1.5 accent-green-600"> Số lượng</label>
                    </div>
                </div>

                {#if !isAdmin}
                    <div>
                        <label for="col-target" class="block text-xs font-bold text-gray-500 uppercase mb-1">Mục tiêu (%)</label>
                        <input id="col-target" type="number" bind:value={target} class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="80">
                    </div>
                {/if}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                
                <div class="flex flex-col border rounded-xl overflow-hidden border-blue-200 shadow-sm">
                    <div class="p-3 bg-blue-50 border-b border-blue-200 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-blue-800 text-sm uppercase">Tử số (Nhóm A)</h4>
                            <span class="text-xs text-blue-600 font-medium">{groupA.length} đã chọn</span>
                        </div>
                        <div class="flex bg-white rounded p-0.5 border border-blue-100">
                            <label class="cursor-pointer px-2 py-0.5 text-xs rounded transition-colors {modeA === 'group' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}">
                                <input type="radio" bind:group={modeA} value="group" class="hidden"> Nhóm
                            </label>
                            <label class="cursor-pointer px-2 py-0.5 text-xs rounded transition-colors {modeA === 'category' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}">
                                <input type="radio" bind:group={modeA} value="category" class="hidden"> Ngành
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-2 border-b border-blue-100 bg-white relative">
                        <input type="text" bind:value={searchA} class="w-full pl-8 p-2 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none" placeholder="Tìm kiếm...">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div class="flex-grow overflow-y-auto p-2 bg-slate-50 custom-scrollbar">
                        <div class="flex justify-end mb-2 px-1">
                            <button class="text-xs text-blue-600 hover:underline font-bold" on:click={() => toggleAll(true, visibleListA)}>
                                {groupA.length > 0 && visibleListA.every(i => groupA.includes(i.id)) ? 'Bỏ chọn hiển thị' : 'Chọn hiển thị'}
                            </button>
                        </div>
                        <div class="space-y-1">
                            {#each visibleListA as item (item.id)}
                                {@const isChecked = groupA.includes(item.id)}
                                <label 
                                    class="flex items-center p-2 rounded cursor-pointer transition-all select-none border
                                    {isChecked ? 'bg-blue-100 border-blue-300 shadow-sm' : 'bg-white border-transparent hover:bg-white hover:border-gray-200'}"
                                >
                                    <input type="checkbox" checked={isChecked} on:change={() => toggleSelection(true, item.id)} class="mr-3 w-4 h-4 accent-blue-600 rounded border-gray-300">
                                    <span class="text-sm {isChecked ? 'font-bold text-blue-800' : 'text-gray-700'} truncate" title={item.display}>
                                        {item.display}
                                    </span>
                                    {#if isChecked}
                                        <span class="ml-auto text-xs bg-blue-200 text-blue-800 px-1.5 rounded">✔</span>
                                    {/if}
                                </label>
                            {/each}
                            {#if visibleListA.length === 0}
                                <p class="text-center text-gray-400 text-xs py-4">Không tìm thấy dữ liệu.</p>
                            {/if}
                        </div>
                    </div>
                </div>

                <div class="flex flex-col border rounded-xl overflow-hidden border-green-200 shadow-sm">
                    <div class="p-3 bg-green-50 border-b border-green-200 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-green-800 text-sm uppercase">Mẫu số (Nhóm B)</h4>
                            <span class="text-xs text-green-600 font-medium">{groupB.length} đã chọn</span>
                        </div>
                        <div class="flex bg-white rounded p-0.5 border border-green-100">
                            <label class="cursor-pointer px-2 py-0.5 text-xs rounded transition-colors {modeB === 'group' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-500'}">
                                <input type="radio" bind:group={modeB} value="group" class="hidden"> Nhóm
                            </label>
                            <label class="cursor-pointer px-2 py-0.5 text-xs rounded transition-colors {modeB === 'category' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-500'}">
                                <input type="radio" bind:group={modeB} value="category" class="hidden"> Ngành
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-2 border-b border-green-100 bg-white relative">
                        <input type="text" bind:value={searchB} class="w-full pl-8 p-2 border border-gray-200 rounded text-sm focus:border-green-500 outline-none" placeholder="Tìm kiếm...">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div class="flex-grow overflow-y-auto p-2 bg-slate-50 custom-scrollbar">
                        <div class="flex justify-end mb-2 px-1">
                            <button class="text-xs text-green-600 hover:underline font-bold" on:click={() => toggleAll(false, visibleListB)}>
                                {groupB.length > 0 && visibleListB.every(i => groupB.includes(i.id)) ? 'Bỏ chọn hiển thị' : 'Chọn hiển thị'}
                            </button>
                        </div>
                        <div class="space-y-1">
                            {#each visibleListB as item (item.id)}
                                {@const isChecked = groupB.includes(item.id)}
                                <label 
                                    class="flex items-center p-2 rounded cursor-pointer transition-all select-none border
                                    {isChecked ? 'bg-green-100 border-green-300 shadow-sm' : 'bg-white border-transparent hover:bg-white hover:border-gray-200'}"
                                >
                                    <input type="checkbox" checked={isChecked} on:change={() => toggleSelection(false, item.id)} class="mr-3 w-4 h-4 accent-green-600 rounded border-gray-300">
                                    <span class="text-sm {isChecked ? 'font-bold text-green-800' : 'text-gray-700'} truncate" title={item.display}>
                                        {item.display}
                                    </span>
                                    {#if isChecked}
                                        <span class="ml-auto text-xs bg-green-200 text-green-800 px-1.5 rounded">✔</span>
                                    {/if}
                                </label>
                            {/each}
                            {#if visibleListB.length === 0}
                                <p class="text-center text-gray-400 text-xs py-4">Không tìm thấy dữ liệu.</p>
                            {/if}
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