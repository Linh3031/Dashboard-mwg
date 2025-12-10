<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure, isAdmin } from '../../stores.js';
    import { cleanCategoryName } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null; 

    const dispatch = createEventDispatcher();
    let isBackdropMouseDown = false; 

    // --- FORM DATA ---
    let title = '';
    let selectedMainCategories = [];
    let isSystemTemplate = false;
    let subColumns = [];
    
    // Metric tổng cho toàn bảng
    let tableMetrics = { sl: false, dt: true, dtqd: false };

    let searchMainCat = '';
    
    // State tìm kiếm cho từng dropdown cột con (Object: { index: searchText })
    let subSearchMap = {};

    // --- DATA SOURCES ---
    $: uniqueMainCategories = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nganhHang)).filter(Boolean))].sort();
    $: filteredMainCategories = uniqueMainCategories.filter(c => c.toLowerCase().includes(searchMainCat.toLowerCase()));

    $: availableSubGroups = [...new Set(
        ($categoryStructure || [])
            .filter(c => selectedMainCategories.includes(cleanCategoryName(c.nganhHang)))
            .map(c => cleanCategoryName(c.nhomHang))
            .filter(Boolean)
    )].sort();

    // --- INIT ---
    $: if (isOpen) {
        if (editItem) {
            title = editItem.title || '';
            selectedMainCategories = [...(editItem.mainCategories || [])];
            isSystemTemplate = !!editItem.isSystem;
            // Load metrics tổng
            tableMetrics = { sl: false, dt: true, dtqd: false, ...(editItem.tableMetrics || {}) };
            
            subColumns = (editItem.subColumns || []).map(col => ({ 
                ...col, 
                id: col.id || Math.random().toString(36).substr(2, 9),
                header: col.header || '',
                items: [...(col.items || [])],
                metrics: { sl: false, dt: true, dtqd: false, ...(col.metrics || {}) },
                isDropdownOpen: false
            }));
        } else {
            resetForm();
        }
    }

    function resetForm() {
        title = '';
        selectedMainCategories = [];
        searchMainCat = '';
        subColumns = [];
        isSystemTemplate = false;
        tableMetrics = { sl: false, dt: true, dtqd: false };
        subSearchMap = {};
        addColumn(); 
    }

    // --- LOGIC ---
    function toggleMainCategory(cat) {
        if (selectedMainCategories.includes(cat)) {
            selectedMainCategories = selectedMainCategories.filter(c => c !== cat);
        } else {
            selectedMainCategories = [...selectedMainCategories, cat];
        }
    }

    function addColumn() {
        subColumns = [...subColumns, {
            id: Math.random().toString(36).substr(2, 9),
            header: '',
            items: [],
            metrics: { sl: false, dt: true, dtqd: false },
            isDropdownOpen: false 
        }];
    }

    function removeColumn(index) {
        subColumns = subColumns.filter((_, i) => i !== index);
    }

    function toggleColumnDropdown(index) {
        subColumns = subColumns.map((col, i) => {
            if (i === index) {
                // Reset search text khi mở
                if (!col.isDropdownOpen) subSearchMap[index] = ''; 
                return { ...col, isDropdownOpen: !col.isDropdownOpen };
            }
            return { ...col, isDropdownOpen: false };
        });
    }

    function toggleSubItem(colIndex, item) {
        const col = subColumns[colIndex];
        if (col.items.includes(item)) {
            col.items = col.items.filter(i => i !== item);
        } else {
            col.items = [...col.items, item];
        }
        subColumns[colIndex] = col;
    }

    function handleSave() {
        if (!title.trim()) return alert("Vui lòng nhập Tên bảng.");
        if (selectedMainCategories.length === 0) return alert("Vui lòng chọn ít nhất 1 Ngành hàng chính.");
        if (subColumns.length === 0) return alert("Vui lòng thêm ít nhất 1 nhóm hàng.");
        
        // Validate metrics tổng
        if (!tableMetrics.sl && !tableMetrics.dt && !tableMetrics.dtqd) {
             tableMetrics.dt = true; // Default fallback
        }

        for (const col of subColumns) {
            if (!col.header.trim()) return alert("Vui lòng đặt tên cho tất cả các nhóm hàng.");
            if (col.items.length === 0) return alert(`Nhóm "${col.header}" chưa chọn thành phần con nào.`);
            if (!col.metrics.sl && !col.metrics.dt && !col.metrics.dtqd) {
                return alert(`Nhóm "${col.header}" chưa chọn chỉ số hiển thị (SL/DT/QĐ).`);
            }
        }

        const payload = {
            id: editItem ? editItem.id : `table_${Date.now()}`,
            title,
            mainCategories: selectedMainCategories,
            tableMetrics,
            subColumns: subColumns.map(c => ({ 
                header: c.header, 
                items: c.items,
                metrics: {
                    sl: !!c.metrics.sl,
                    dt: !!c.metrics.dt,
                    dtqd: !!c.metrics.dtqd
                }
            })),
            isSystem: isSystemTemplate === true,
            isVisible: true
        };

        dispatch('save', payload);
        close();
    }

    function close() {
        dispatch('close');
    }

    function handleContentClick(e) {
        if (!e.target.closest('.sub-item-dropdown') && !e.target.closest('.sub-item-trigger')) {
            subColumns = subColumns.map(c => ({ ...c, isDropdownOpen: false }));
        }
    }

    function handleBackdropMouseDown(e) {
        if (e.target === e.currentTarget) isBackdropMouseDown = true;
    }
    function handleBackdropClick(e) {
        if (e.target === e.currentTarget && isBackdropMouseDown) close();
        isBackdropMouseDown = false;
    }
</script>

<svelte:window on:click={handleContentClick} />

{#if isOpen}
<div 
    class="fixed inset-0 bg-gray-900/60 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" 
    role="button" 
    tabindex="0" 
    on:mousedown={handleBackdropMouseDown}
    on:click={handleBackdropClick}
>
    <div 
        class="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200" 
        role="button" 
        tabindex="0" 
        on:click|stopPropagation={handleContentClick}
        on:mousedown|stopPropagation={() => isBackdropMouseDown = false}
    >
        
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-xl font-bold text-gray-800">
                    {editItem ? 'Chỉnh sửa Bảng theo dõi' : 'Tạo Bảng theo dõi mới'}
                </h3>
                <p class="text-xs text-gray-500 mt-1">Thiết kế bảng báo cáo theo phong cách Excel đa tầng.</p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors text-2xl leading-none p-2 rounded-full hover:bg-gray-200">&times;</button>
        </div>

        <div class="flex-grow flex flex-col md:flex-row overflow-hidden">
            
            <div class="w-full md:w-1/3 border-r border-gray-200 p-6 bg-white overflow-y-auto custom-scrollbar flex flex-col gap-6">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">1. Tên Bảng <span class="text-red-500">*</span></label>
                    <input type="text" bind:value={title} class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold" placeholder="VD: Gia dụng Mùa hè...">
                </div>
                
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label class="block text-sm font-bold text-blue-800 mb-2">2. Chỉ số TỔNG (Header Bảng)</label>
                    <div class="flex gap-4">
                        <label class="flex items-center gap-1.5 cursor-pointer hover:bg-blue-100/50 p-1 rounded transition-colors" on:click|stopPropagation>
                            <input type="checkbox" bind:checked={tableMetrics.sl} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500">
                            <span class="text-sm text-gray-700">Tổng Số lượng</span>
                        </label>
                        <label class="flex items-center gap-1.5 cursor-pointer hover:bg-blue-100/50 p-1 rounded transition-colors" on:click|stopPropagation>
                            <input type="checkbox" bind:checked={tableMetrics.dt} class="w-4 h-4 rounded text-green-600 focus:ring-green-500">
                            <span class="text-sm text-gray-700">Tổng Doanh thu</span>
                        </label>
                        <label class="flex items-center gap-1.5 cursor-pointer hover:bg-blue-100/50 p-1 rounded transition-colors" on:click|stopPropagation>
                            <input type="checkbox" bind:checked={tableMetrics.dtqd} class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500">
                            <span class="text-sm text-gray-700">Tổng DT Quy đổi</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">3. Lọc nguồn (Ngành hàng chính)</label>
                    <div class="mb-2 relative">
                        <input type="text" bind:value={searchMainCat} placeholder="Tìm kiếm..." class="w-full p-2 pl-8 border border-gray-300 rounded text-xs focus:border-blue-500 outline-none" />
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-2.5 top-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div class="h-48 border border-gray-300 rounded-lg overflow-y-auto custom-scrollbar p-2 bg-gray-50">
                        {#if filteredMainCategories.length === 0}
                            <p class="text-xs text-gray-400 italic text-center mt-4">Không tìm thấy.</p>
                        {:else}
                            {#each filteredMainCategories as cat}
                                <label class="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors border-b border-gray-100 last:border-0" on:click|stopPropagation>
                                    <input type="checkbox" checked={selectedMainCategories.includes(cat)} on:change={() => toggleMainCategory(cat)} class="rounded text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="text-sm text-gray-600">{cat}</span>
                                </label>
                            {/each}
                        {/if}
                    </div>
                    <p class="text-xs text-gray-500 mt-1 italic">* Chọn để lọc danh sách nhóm hàng con.</p>
                </div>

                {#if $isAdmin}
                    <div class="p-3 bg-purple-50 border border-purple-200 rounded-lg mt-auto">
                        <label class="flex items-center gap-2 cursor-pointer" on:click|stopPropagation>
                            <input type="checkbox" bind:checked={isSystemTemplate} class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300">
                            <span class="text-sm font-bold text-purple-800">Lưu làm Mẫu hệ thống</span>
                        </label>
                        <p class="text-xs text-purple-600 mt-1 pl-6">Bảng này sẽ hiển thị cho tất cả người dùng.</p>
                    </div>
                {/if}
            </div>

            <div class="w-full md:w-2/3 p-6 bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col">
                <div class="flex justify-between items-center mb-4">
                    <label class="text-sm font-bold text-gray-700">4. Cấu hình Cột hiển thị & Gom nhóm</label>
                    <button class="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1 shadow-sm" on:click={addColumn}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                        Thêm nhóm hàng
                    </button>
                </div>

                {#if selectedMainCategories.length === 0}
                    <div class="flex-grow flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-white/50">
                        <div class="text-center p-6">
                            <span class="text-4xl">👈</span>
                            <p class="text-gray-500 font-medium mt-2">Vui lòng chọn "Lọc nguồn" bên trái trước.</p>
                        </div>
                    </div>
                {:else}
                    <div class="space-y-3 pb-4">
                        {#each subColumns as col, index (col.id)}
                            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 relative group animate-fade-in-up">
                                <button class="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 transition-colors" on:click={() => removeColumn(index)} title="Xóa cột này">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                                </button>

                                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                    <div class="md:col-span-4">
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tên nhóm hiển thị</label>
                                        <input type="text" bind:value={col.header} class="w-full p-2 border border-gray-300 rounded text-sm font-semibold focus:border-blue-500 outline-none" placeholder="VD: Camera Tổng">
                                    </div>

                                    <div class="md:col-span-8 relative">
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Thành phần (Gom nhóm)</label>
                                        
                                        <div 
                                            class="w-full min-h-[38px] p-1.5 border border-gray-300 rounded bg-white cursor-pointer flex flex-wrap gap-1 items-center sub-item-trigger focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all"
                                            on:click|stopPropagation={() => toggleColumnDropdown(index)}
                                            role="button" tabindex="0"
                                        >
                                            {#if col.items.length === 0}
                                                <span class="text-gray-400 text-sm ml-1 select-none">-- Chọn nhóm hàng con --</span>
                                            {:else}
                                                {#each col.items as item}
                                                    <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 border border-blue-100">
                                                        {item} <span class="cursor-pointer hover:text-blue-900 font-bold" on:click|stopPropagation={() => toggleSubItem(index, item)}>&times;</span>
                                                    </span>
                                                {/each}
                                            {/if}
                                            <div class="ml-auto pr-1 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></div>
                                        </div>

                                        {#if col.isDropdownOpen}
                                            <div class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar sub-item-dropdown animate-fade-in-fast" on:click|stopPropagation>
                                                <div class="p-2 sticky top-0 bg-white border-b border-gray-100">
                                                    <input 
                                                        type="text" 
                                                        class="w-full p-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none" 
                                                        placeholder="Lọc danh sách..."
                                                        bind:value={subSearchMap[index]}
                                                        on:click|stopPropagation
                                                        on:keydown|stopPropagation
                                                    />
                                                </div>
                                                <div class="p-1">
                                                    {#if true}
                                                        {@const currentSubSearch = subSearchMap[index] || ''}
                                                        {@const filteredSubGroups = availableSubGroups.filter(s => s.toLowerCase().includes(currentSubSearch.toLowerCase()))}
                                                        
                                                        {#if filteredSubGroups.length === 0}
                                                            <p class="text-center text-sm text-gray-400 py-4">Không tìm thấy.</p>
                                                        {:else}
                                                            {#each filteredSubGroups as subGroup}
                                                                <label class="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer rounded transition-colors border-b border-gray-50 last:border-0" on:click|stopPropagation>
                                                                    <input type="checkbox" checked={col.items.includes(subGroup)} on:change={() => toggleSubItem(index, subGroup)} class="mr-3 w-4 h-4 accent-blue-600">
                                                                    <span class="text-sm text-gray-700">{subGroup}</span>
                                                                </label>
                                                            {/each}
                                                        {/if}
                                                    {/if}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </div>

                                <div class="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-4">
                                    <span class="text-xs font-bold text-gray-500 uppercase">Hiển thị:</span>
                                    <label class="flex items-center gap-1.5 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors" on:click|stopPropagation>
                                        <input type="checkbox" bind:checked={col.metrics.sl} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500">
                                        <span class="text-xs font-semibold text-gray-700">Số lượng</span>
                                    </label>
                                    <label class="flex items-center gap-1.5 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors" on:click|stopPropagation>
                                        <input type="checkbox" bind:checked={col.metrics.dt} class="w-4 h-4 rounded text-green-600 focus:ring-green-500">
                                        <span class="text-xs font-semibold text-gray-700">Doanh thu</span>
                                    </label>
                                    <label class="flex items-center gap-1.5 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors" on:click|stopPropagation>
                                        <input type="checkbox" bind:checked={col.metrics.dtqd} class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500">
                                        <span class="text-xs font-semibold text-gray-700">DT Quy đổi</span>
                                    </label>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button on:click={close} class="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors shadow-sm">Hủy</button>
            <button on:click={handleSave} class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-colors flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                Lưu Bảng
            </button>
        </div>
    </div>
</div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
    .animate-fade-in-fast { animation: fadeIn 0.15s ease-out; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>