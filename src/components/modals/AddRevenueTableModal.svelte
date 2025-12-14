<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure } from '../../stores.js';
    import { parseIdentity } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null;

    const dispatch = createEventDispatcher();

    // --- DỮ LIỆU ---
    let tableName = '';
    let tableId = '';
    let isSystem = false; // [FIX] Biến cờ xác định bảng hệ thống
    
    // Cấu hình Cột Tổng (Main Column)
    let mainColumn = {
        header: 'Tổng cộng',
        type: 'group', // 'group' | 'category'
        items: [],     // Danh sách ID đã chọn
        metrics: { sl: false, dt: true, dtqd: false }
    };

    // Danh sách Cột Phụ
    let subColumns = [];
    
    // --- UI STATE ---
    let activeContext = 'main'; // 'main' | 'sub'
    let activeSubIndex = 0;     // Index nếu đang sửa sub column
    let searchText = '';
    let showSelectedOnly = false;

    // --- HELPER: Lấy cột đang Active ---
    $: activeColumn = activeContext === 'main' ? mainColumn : subColumns[activeSubIndex];

    // 1. Chuẩn hóa Ngành hàng (Lấy ID)
    $: uniqueCategories = (() => {
        const map = new Map();
        ($categoryStructure || []).forEach(c => {
            if(!c.nganhHang) return;
            const parsed = parseIdentity(c.nganhHang);
            map.set(parsed.id, { 
                id: parsed.id, 
                name: parsed.name, 
                display: parsed.name.includes(parsed.id) ? parsed.name : `${parsed.id} - ${parsed.name}`
            });
        });
        return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
    })();

    // 2. Chuẩn hóa Nhóm hàng (Lấy ID)
    $: uniqueGroups = (() => {
        const map = new Map();
        ($categoryStructure || []).forEach(c => {
            if(!c.nhomHang) return;
            const id = c.maNhomHang || parseIdentity(c.nhomHang).id;
            const name = c.nhomHang;
            map.set(id, { 
                id: id, 
                name: name, 
                display: name.includes(id) ? name : `${id} - ${name}`
            });
        });
        return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
    })();

    // --- INIT ---
    $: if (isOpen) {
        if (editItem) {
            tableId = editItem.id;
            tableName = editItem.title;
            // [FIX] Lấy trạng thái isSystem từ item sửa hoặc payload
            isSystem = !!editItem.isSystem; 
            
            mainColumn = editItem.mainColumn ? JSON.parse(JSON.stringify(editItem.mainColumn)) : { 
                header: 'Tổng cộng', type: 'group', items: [], metrics: { sl: false, dt: true, dtqd: false } 
            };
            subColumns = JSON.parse(JSON.stringify(editItem.subColumns || []));
        } else {
            // [FIX] Reset form và kiểm tra payload (Admin truyền { isSystem: true })
            isSystem = editItem?.isSystem || false;

            tableId = `tbl_${Date.now()}`;
            tableName = '';
            mainColumn = { 
                header: 'Tổng cộng', type: 'group', items: [], metrics: { sl: false, dt: true, dtqd: false } 
            };
            subColumns = [];
            addSubColumn();
        }
        selectMain();
    }

    // --- NAVIGATION ---
    function selectMain() {
        activeContext = 'main';
        resetFilter();
    }

    function selectSub(index) {
        activeContext = 'sub';
        activeSubIndex = index;
        resetFilter();
    }

    function resetFilter() {
        searchText = '';
        showSelectedOnly = false;
    }

    // --- COLUMN ACTIONS ---
    function addSubColumn() {
        subColumns = [
            ...subColumns, 
            { 
                header: `Cột ${subColumns.length + 1}`, 
                type: 'group', 
                items: [], 
                metrics: { sl: false, dt: true, dtqd: false } 
            }
        ];
        selectSub(subColumns.length - 1);
    }

    function removeSubColumn(index) {
        if(subColumns.length <= 1) return alert("Cần ít nhất 1 cột phụ.");
        if(!confirm("Xóa cột này?")) return;
        
        subColumns = subColumns.filter((_, i) => i !== index);
        if (activeSubIndex >= subColumns.length) {
            activeSubIndex = subColumns.length - 1;
        }
    }

    // --- ITEM SELECTION LOGIC ---
    function toggleItem(itemId) {
        const currentItems = new Set(activeColumn.items || []);
        if (currentItems.has(itemId)) currentItems.delete(itemId);
        else currentItems.add(itemId);
        activeColumn.items = [...currentItems];
    }

    function toggleAll(listSource) {
        const allIds = listSource.map(i => i.id);
        const currentLen = activeColumn.items.length;
        
        if (currentLen > 0 && currentLen >= allIds.length) {
            activeColumn.items = [];
        } else {
            activeColumn.items = [...allIds];
        }
    }

    function clearSelection() {
        if(!confirm("Xóa sạch danh sách đã chọn của cột này?")) return;
        activeColumn.items = [];
    }

    function handleTypeChange(newType) {
        activeColumn.type = newType;
    }

    // --- SAVE ---
    function handleSave() {
        if (!tableName.trim()) return alert("Vui lòng nhập Tên bảng.");
        if (!mainColumn.header.trim()) return alert("Vui lòng nhập tên Cột Tổng.");
        
        if (subColumns.length === 0) return alert("Vui lòng thêm ít nhất 1 cột phụ.");
        
        for (let i = 0; i < subColumns.length; i++) {
            const col = subColumns[i];
            if (!col.header.trim()) return alert(`Cột phụ số ${i+1} chưa có tên.`);
            if (!col.items || col.items.length === 0) return alert(`Cột "${col.header}" chưa chọn dữ liệu.`);
        }

        dispatch('save', {
            id: tableId,
            title: tableName,
            isSystem: isSystem, // [FIX] Quan trọng: Gửi cờ hệ thống về App
            mainColumn: mainColumn, 
            subColumns: subColumns
        });
        close();
    }

    function close() { dispatch('close'); }

    // --- FILTER LOGIC ---
    $: currentListSource = (activeColumn.type === 'category') ? uniqueCategories : uniqueGroups;
    
    $: filteredList = currentListSource.filter(item => {
        const matchesSearch = item.display.toLowerCase().includes(searchText.toLowerCase());
        const isSelected = activeColumn.items?.includes(item.id);
        if (showSelectedOnly) return matchesSearch && isSelected;
        return matchesSearch;
    });

</script>

{#if isOpen}
<div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm" on:click={close} role="button" tabindex="0">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden" on:click|stopPropagation role="document" tabindex="0">
        
        <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-lg font-bold text-gray-800">
                    {editItem ? 'Chỉnh sửa' : 'Thêm mới'} Bảng Doanh Thu 
                    {#if isSystem}
                        <span class="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 uppercase">Hệ thống</span>
                    {/if}
                </h3>
                <p class="text-xs text-gray-500">Cấu hình nguồn dữ liệu theo ID cho từng cột.</p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row bg-gray-50">
            
            <div class="w-full lg:w-1/3 border-r border-gray-200 bg-white flex flex-col">
                <div class="p-4 border-b border-gray-100 bg-slate-50">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tên Bảng</label>
                    <input 
                        type="text" 
                        bind:value={tableName} 
                        class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none font-bold text-gray-800"
                        placeholder="VD: Báo cáo Apple..."
                    >
                </div>

                <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    
                    <div 
                        class="border-2 rounded-lg p-3 cursor-pointer transition-all relative
                        {activeContext === 'main' ? 'border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-300' : 'border-gray-200 bg-white hover:border-orange-200'}"
                        on:click={selectMain}
                        role="button" tabindex="0"
                    >
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Main</span>
                                <span class="text-xs font-bold text-gray-700 uppercase">Cột Tổng</span>
                            </div>
                            <span class="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                                {mainColumn.items.length} mục
                            </span>
                        </div>
                        
                        <div class="space-y-2">
                            <input 
                                type="text" 
                                bind:value={mainColumn.header} 
                                class="w-full bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none text-sm font-bold text-gray-800 pb-1"
                                placeholder="Tên cột tổng..."
                            >
                            <div class="flex gap-2">
                                <label class="flex items-center text-[10px] text-gray-600 cursor-pointer"><input type="checkbox" bind:checked={mainColumn.metrics.sl} class="mr-1 accent-orange-600"> SL</label>
                                <label class="flex items-center text-[10px] text-gray-600 cursor-pointer"><input type="checkbox" bind:checked={mainColumn.metrics.dt} class="mr-1 accent-orange-600"> DT</label>
                                <label class="flex items-center text-[10px] text-gray-600 cursor-pointer"><input type="checkbox" bind:checked={mainColumn.metrics.dtqd} class="mr-1 accent-orange-600"> DTQĐ</label>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold px-1">
                        <div class="flex-1 h-px bg-gray-200"></div>
                        Các cột phụ
                        <div class="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {#each subColumns as col, index}
                        <div 
                            class="border rounded p-3 cursor-pointer transition-all relative group
                            {activeContext === 'sub' && activeSubIndex === index ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'}"
                            on:click={() => selectSub(index)}
                            role="button" tabindex="0"
                        >
                            <button 
                                class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                on:click|stopPropagation={() => removeSubColumn(index)}
                                title="Xóa cột này"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>

                            <div class="space-y-2 pr-4">
                                <div class="flex justify-between items-center">
                                    <label class="text-[10px] text-gray-400 font-bold uppercase">Cột {index + 1}</label>
                                    <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                        {col.items.length} mục
                                    </span>
                                </div>
                                <input 
                                    type="text" 
                                    bind:value={col.header} 
                                    class="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-sm font-semibold text-gray-700 pb-1"
                                    placeholder="Nhập tên cột..."
                                >
                                <div class="flex gap-2">
                                    <label class="flex items-center text-[10px] text-gray-600 cursor-pointer"><input type="checkbox" bind:checked={col.metrics.sl} class="mr-1 rounded text-blue-600"> SL</label>
                                    <label class="flex items-center text-[10px] text-gray-600 cursor-pointer"><input type="checkbox" bind:checked={col.metrics.dt} class="mr-1 rounded text-blue-600"> DT</label>
                                    <label class="flex items-center text-[10px] text-gray-600 cursor-pointer"><input type="checkbox" bind:checked={col.metrics.dtqd} class="mr-1 rounded text-blue-600"> DTQĐ</label>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="p-3 border-t border-gray-200">
                    <button 
                        class="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-blue-500 hover:text-blue-500 transition font-bold text-sm flex items-center justify-center gap-2"
                        on:click={addSubColumn}
                    >
                        + Thêm cột phụ
                    </button>
                </div>
            </div>

            <div class="w-full lg:w-2/3 flex flex-col bg-slate-50">
                <div class="p-3 border-b border-gray-200 bg-white shadow-sm z-10 space-y-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm">
                                Cấu hình: <span class="{activeContext === 'main' ? 'text-orange-600' : 'text-blue-600'}">"{activeColumn.header}"</span>
                            </h4>
                            <div class="flex gap-4 mt-2 text-xs font-medium text-gray-600">
                                <label class="flex items-center cursor-pointer hover:text-black">
                                    <input 
                                        type="radio" 
                                        name="colType"
                                        checked={activeColumn.type === 'group'} 
                                        on:change={() => handleTypeChange('group')}
                                        class="mr-1.5 w-4 h-4 {activeContext === 'main' ? 'accent-orange-600' : 'accent-blue-600'}"
                                    > 
                                    Nhóm Hàng
                                </label>
                                <label class="flex items-center cursor-pointer hover:text-black">
                                    <input 
                                        type="radio" 
                                        name="colType"
                                        checked={activeColumn.type === 'category'} 
                                        on:change={() => handleTypeChange('category')}
                                        class="mr-1.5 w-4 h-4 {activeContext === 'main' ? 'accent-orange-600' : 'accent-blue-600'}"
                                    > 
                                    Ngành Hàng
                                </label>
                            </div>
                        </div>
                        
                        <div class="flex gap-2">
                            <button 
                                class="px-2 py-1 text-xs font-medium rounded border transition-colors {showSelectedOnly ? (activeContext === 'main' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200') : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}"
                                on:click={() => showSelectedOnly = !showSelectedOnly}
                            >
                                {showSelectedOnly ? 'Hiện tất cả' : `Đã chọn (${activeColumn.items.length})`}
                            </button>
                            
                            <button 
                                class="px-2 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition flex items-center gap-1"
                                on:click={clearSelection}
                                title="Xóa sạch dữ liệu đã chọn"
                            >
                                Xóa chọn 🧹
                            </button>
                        </div>
                    </div>
                    
                    <div class="relative">
                        <input 
                            type="text" 
                            bind:value={searchText}
                            class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-1 {activeContext === 'main' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'} outline-none text-sm"
                            placeholder="Tìm kiếm tên hoặc mã..."
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     <div class="mb-3 flex justify-between items-center px-1">
                        <span class="text-xs text-gray-500 italic">Tìm thấy {filteredList.length} mục</span>
                        <button 
                            class="text-xs font-bold hover:underline {activeContext === 'main' ? 'text-orange-600' : 'text-blue-600'}"
                            on:click={() => toggleAll(filteredList)}
                        >
                            {activeColumn.items.length >= filteredList.length && filteredList.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {#each filteredList as item (item.id)}
                            {@const isChecked = activeColumn.items.includes(item.id)}
                            <label 
                                class="flex items-start p-2 rounded border cursor-pointer transition-all select-none
                                {isChecked 
                                    ? (activeContext === 'main' ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-300' : 'bg-blue-50 border-blue-300 ring-1 ring-blue-300') 
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}"
                            >
                                <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    on:change={() => toggleItem(item.id)}
                                    class="mt-1 mr-3 w-4 h-4 rounded border-gray-300 {activeContext === 'main' ? 'accent-orange-600' : 'accent-blue-600'}"
                                >
                                <div class="flex flex-col overflow-hidden">
                                    <span class="text-sm font-medium text-gray-800 truncate" title={item.display}>{item.display}</span>
                                    <span class="text-[10px] text-gray-500 font-mono mt-0.5">ID: {item.id}</span>
                                </div>
                            </label>
                        {:else}
                            <div class="col-span-full py-10 text-center">
                                <div class="text-gray-300 mb-2 text-4xl">📭</div>
                                <p class="text-gray-500 text-sm">Không tìm thấy dữ liệu.</p>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 z-20">
            <button on:click={close} class="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 font-medium transition-colors shadow-sm">Hủy</button>
            <button on:click={handleSave} class="px-8 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-md transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                Lưu Bảng
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