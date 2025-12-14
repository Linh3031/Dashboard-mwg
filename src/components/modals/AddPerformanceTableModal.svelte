<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { 
        categoryStructure, 
        macroCategoryConfig, 
        macroProductGroupConfig,
        efficiencyConfig,
        warehouseCustomMetrics
    } from '../../stores.js';
    import { parseIdentity, cleanCategoryName } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null; // null = tạo mới, object = sửa
    export let isSystem = false; // true = Admin tạo, false = User tạo

    const dispatch = createEventDispatcher();

    // --- CẤU HÌNH UI ---
    const COLORS = [
        { id: 'blue', class: 'bg-blue-100 text-blue-900 border-blue-200', label: 'Xanh dương' },
        { id: 'green', class: 'bg-green-100 text-green-900 border-green-200', label: 'Xanh lá' },
        { id: 'orange', class: 'bg-orange-100 text-orange-900 border-orange-200', label: 'Cam' },
        { id: 'purple', class: 'bg-purple-100 text-purple-900 border-purple-200', label: 'Tím' },
        { id: 'teal', class: 'bg-teal-100 text-teal-900 border-teal-200', label: 'Xanh cổ vịt' },
        { id: 'red', class: 'bg-red-100 text-red-900 border-red-200', label: 'Đỏ' },
        { id: 'gray', class: 'bg-gray-100 text-gray-900 border-gray-200', label: 'Xám' }
    ];

    const DATA_TYPES = [
        { id: 'DT', label: 'Doanh thu (Thực)', icon: 'dollar-sign' },
        { id: 'DTQD', label: 'Doanh thu (QĐ)', icon: 'refresh-cw' },
        { id: 'SL', label: 'Số lượng', icon: 'hash' },
        { id: 'PERCENT', label: 'Tỷ lệ %', icon: 'percent' }
    ];

    // --- DATA SOURCES ---
    let sourceList = []; 
    let searchFilter = '';

    // --- STATE ---
    let tableId = '';
    let tableName = '';
    let columns = [];
    let activeColIndex = 0;
    
    // --- COMPUTED: Active Column ---
    $: activeColumn = columns[activeColIndex] || null;

    // --- INITIALIZATION ---
    $: if (isOpen) {
        initDataSource();
        if (editItem) {
            tableId = editItem.id;
            tableName = editItem.title;
            // Clone deep để không ảnh hưởng dữ liệu gốc khi chưa Save
            columns = JSON.parse(JSON.stringify(editItem.columns || []));
        } else {
            resetForm();
        }
        if (columns.length === 0) addColumn();
        activeColIndex = 0;
    }

    function resetForm() {
        tableId = `perf_table_${Date.now()}`;
        tableName = '';
        columns = [];
    }

    function initDataSource() {
        // Gộp tất cả nguồn: Macro Group, Macro Category, Simple Category, Simple Group
        const macros = [
            ...($macroCategoryConfig || []).map(m => ({ id: m.id || m.name, name: m.name, type: 'MACRO_CAT' })),
            ...($macroProductGroupConfig || []).map(m => ({ id: m.id || m.name, name: m.name, type: 'MACRO_GROUP' }))
        ];
        
        // Lấy Unique Groups & Categories từ structure
        const groups = new Set();
        const cats = new Set();
        ($categoryStructure || []).forEach(c => {
            if (c.nhomHang) groups.add(cleanCategoryName(c.nhomHang));
            if (c.nganhHang) cats.add(cleanCategoryName(c.nganhHang));
        });

        const simples = [
            ...[...groups].map(n => ({ id: n, name: n, type: 'GROUP' })),
            ...[...cats].map(n => ({ id: n, name: n, type: 'CATEGORY' }))
        ];

        sourceList = [...macros, ...simples].sort((a, b) => a.name.localeCompare(b.name));
    }

    // --- COLUMN ACTIONS ---
    function addColumn() {
        columns = [...columns, {
            id: `col_${Date.now()}`,
            header: `Cột ${columns.length + 1}`,
            type: 'DT', // Mặc định Doanh thu
            color: 'blue',
            items: [],      // Dùng cho SL, DT, DTQD
            numerator: [],  // Dùng cho PERCENT (Tử)
            denominator: [],// Dùng cho PERCENT (Mẫu)
            targetId: null  // ID liên kết với goal setting (chỉ cho PERCENT)
        }];
        activeColIndex = columns.length - 1;
    }

    function removeColumn(index) {
        if (columns.length <= 1) return alert("Bảng cần ít nhất 1 cột.");
        if (confirm("Xóa cột này?")) {
            columns = columns.filter((_, i) => i !== index);
            if (activeColIndex >= columns.length) activeColIndex = columns.length - 1;
        }
    }

    // --- SELECTION LOGIC ---
    function toggleSelection(item, targetArrayName) {
        if (!activeColumn) return;
        
        // targetArrayName: 'items' | 'numerator' | 'denominator'
        const currentArr = activeColumn[targetArrayName] || [];
        const idx = currentArr.indexOf(item.id);
        
        if (idx >= 0) {
            // Remove
            activeColumn[targetArrayName] = currentArr.filter(i => i !== item.id);
        } else {
            // Add
            activeColumn[targetArrayName] = [...currentArr, item.id];
        }

        // Logic gợi ý cho cột %
        if (activeColumn.type === 'PERCENT') {
            detectExistingIndicator();
        }
    }

    function toggleAll(targetArrayName, select) {
        if (!activeColumn) return;
        const visibleItems = sourceList
            .filter(i => i.name.toLowerCase().includes(searchFilter.toLowerCase()))
            .map(i => i.id);

        if (select) {
            // Add all visible that are not already selected
            const currentSet = new Set(activeColumn[targetArrayName] || []);
            visibleItems.forEach(id => currentSet.add(id));
            activeColumn[targetArrayName] = [...currentSet];
        } else {
            // Remove all visible
            const visibleSet = new Set(visibleItems);
            activeColumn[targetArrayName] = (activeColumn[targetArrayName] || []).filter(id => !visibleSet.has(id));
        }
    }

    // --- SMART LOGIC: Tìm chỉ số đã có ---
    function detectExistingIndicator() {
        if (!activeColumn || activeColumn.type !== 'PERCENT') return;

        const num = new Set(activeColumn.numerator || []);
        const den = new Set(activeColumn.denominator || []);

        // Quét trong efficiencyConfig (Global & Local)
        const allConfigs = [...$efficiencyConfig, ...$warehouseCustomMetrics];
        
        // Tìm xem có chỉ số nào khớp Tử/Mẫu không
        const match = allConfigs.find(cfg => {
            const cfgNum = new Set(cfg.groupA || []);
            const cfgDen = new Set(cfg.groupB || []);
            
            // So sánh 2 Set (đơn giản hoá bằng JSON stringify mảng đã sort)
            const eq = (s1, s2) => s1.size === s2.size && [...s1].every(x => s2.has(x));
            return eq(num, cfgNum) && eq(den, cfgDen);
        });

        if (match) {
            // Nếu khớp -> Dùng lại ID cũ để link Target
            activeColumn.targetId = match.id;
            console.log("Đã tìm thấy chỉ số khớp:", match.label);
        } else {
            // Nếu không khớp -> Reset targetId (sẽ sinh mới khi lưu)
            activeColumn.targetId = null;
        }
    }

    function handleSave() {
        if (!tableName.trim()) return alert("Vui lòng nhập Tên bảng.");
        if (columns.length === 0) return alert("Vui lòng thêm ít nhất 1 cột.");

        // Validate từng cột
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            if (!col.header.trim()) return alert(`Cột số ${i+1} chưa có tên.`);
            
            if (col.type === 'PERCENT') {
                if (col.numerator.length === 0) return alert(`Cột "${col.header}": Chưa chọn Tử số.`);
                if (col.denominator.length === 0) return alert(`Cột "${col.header}": Chưa chọn Mẫu số.`);
                
                // Nếu chưa có targetId (chỉ số mới), tạo ID mới
                if (!col.targetId) {
                    col.targetId = `eff_custom_${Date.now()}_${i}`;
                }
            } else {
                if (col.items.length === 0) return alert(`Cột "${col.header}": Chưa chọn nguồn dữ liệu.`);
            }
        }

        dispatch('save', {
            id: tableId,
            title: tableName,
            isSystem: isSystem,
            columns: columns
        });
        close();
    }

    function close() { dispatch('close'); }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-gray-900/60 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm" on:click={close} role="button" tabindex="0">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden animate-scale-in" on:click|stopPropagation role="document" tabindex="0">
        
        <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <i data-feather="layout" class="w-5 h-5 text-blue-600"></i>
                    {editItem ? 'Chỉnh sửa' : 'Thêm mới'} Bảng Hiệu Quả
                    {#if isSystem}
                        <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 uppercase font-bold">System</span>
                    {/if}
                </h3>
                <p class="text-xs text-gray-500 mt-1">Tạo bảng báo cáo tuỳ chỉnh với đa dạng loại dữ liệu (SL, DT, %)</p>
            </div>
            <button on:click={close} class="text-gray-400 hover:text-red-500 text-3xl leading-none transition-colors">&times;</button>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            <div class="w-full lg:w-4/12 border-r border-gray-200 bg-white flex flex-col z-10 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                <div class="p-4 border-b border-gray-100 bg-slate-50">
                    <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tên Bảng Hiển Thị</label>
                    <input 
                        type="text" 
                        bind:value={tableName} 
                        class="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-800 shadow-sm"
                        placeholder="VD: Hiệu quả Phụ Kiện..."
                    >
                </div>

                <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-gray-50/50">
                    {#each columns as col, index}
                        <div 
                            class="bg-white border rounded-xl p-3 cursor-pointer transition-all relative group
                            {activeColIndex === index ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-blue-300 shadow-sm'}"
                            on:click={() => activeColIndex = index}
                            role="button" tabindex="0"
                        >
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    Cột {index + 1}
                                </span>
                                <button 
                                    class="text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                                    on:click|stopPropagation={() => removeColumn(index)}
                                    title="Xóa cột"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            <div class="space-y-3">
                                <div>
                                    <label class="block text-[10px] text-gray-500 font-semibold mb-1">Tiêu đề cột</label>
                                    <input 
                                        type="text" 
                                        bind:value={col.header} 
                                        class="w-full p-2 border border-gray-200 rounded text-sm font-bold text-gray-800 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                        placeholder="Nhập tên cột..."
                                    >
                                </div>

                                <div>
                                    <label class="block text-[10px] text-gray-500 font-semibold mb-1">Loại dữ liệu</label>
                                    <div class="grid grid-cols-2 gap-2">
                                        {#each DATA_TYPES as type}
                                            <button 
                                                class="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-[11px] font-medium transition-all
                                                {col.type === type.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}"
                                                on:click|stopPropagation={() => col.type = type.id}
                                            >
                                                {type.label}
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-[10px] text-gray-500 font-semibold mb-1">Màu tiêu đề</label>
                                    <div class="flex flex-wrap gap-1.5">
                                        {#each COLORS as color}
                                            <button 
                                                class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
                                                {color.class.split(' ')[0]} 
                                                {col.color === color.id ? 'border-gray-600 scale-110 shadow-sm' : 'border-transparent'}"
                                                on:click|stopPropagation={() => col.color = color.id}
                                                title={color.label}
                                            ></button>
                                        {/each}
                                    </div>
                                </div>
                            </div>

                            {#if col.type === 'PERCENT'}
                                <div class="mt-3 pt-2 border-t border-dashed border-gray-200">
                                    {#if col.targetId}
                                        <div class="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 p-1.5 rounded">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                                            <span class="font-medium">Đã liên kết mục tiêu cũ</span>
                                        </div>
                                    {:else}
                                        <div class="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 p-1.5 rounded">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" /></svg>
                                            <span class="font-medium">Sẽ tạo chỉ số mới</span>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/each}

                    <button 
                        class="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold text-sm flex items-center justify-center gap-2 group"
                        on:click={addColumn}
                    >
                        <span class="bg-gray-200 group-hover:bg-blue-200 rounded-full p-0.5"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg></span>
                        Thêm cột mới
                    </button>
                </div>
            </div>

            <div class="w-full lg:w-8/12 flex flex-col bg-slate-50 h-full">
                
                <div class="p-3 border-b border-gray-200 bg-white shadow-sm z-20 flex justify-between items-center gap-4">
                    <h4 class="font-bold text-gray-800 text-sm whitespace-nowrap">
                        Nguồn dữ liệu cho: <span class="text-blue-600">"{activeColumn?.header}"</span>
                    </h4>
                    <div class="relative flex-1 max-w-md">
                        <input 
                            type="text" 
                            bind:value={searchFilter}
                            class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Tìm kiếm nhóm hàng, ngành hàng..."
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div class="flex-1 overflow-hidden p-4">
                    {#if !activeColumn}
                        <div class="h-full flex items-center justify-center text-gray-400">Vui lòng chọn hoặc thêm một cột.</div>
                    
                    {:else if activeColumn.type === 'PERCENT'}
                        <div class="flex h-full gap-4">
                            <div class="flex-1 flex flex-col border border-blue-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div class="bg-blue-50 p-2 border-b border-blue-200 flex justify-between items-center">
                                    <span class="font-bold text-blue-800 text-xs uppercase flex items-center gap-1">
                                        <span class="bg-blue-200 text-blue-800 px-1.5 rounded text-[10px]">A</span> Tử Số
                                    </span>
                                    <div class="flex gap-2 text-[10px]">
                                        <button class="text-blue-600 font-bold hover:underline" on:click={() => toggleAll('numerator', true)}>Chọn hết</button>
                                        <button class="text-red-500 font-bold hover:underline" on:click={() => toggleAll('numerator', false)}>Bỏ chọn</button>
                                    </div>
                                </div>
                                <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                    <DataSourceList 
                                        items={sourceList} 
                                        selectedIds={activeColumn.numerator} 
                                        filter={searchFilter} 
                                        onToggle={(item) => toggleSelection(item, 'numerator')}
                                        colorClass="text-blue-700 bg-blue-50 border-blue-200"
                                    />
                                </div>
                                <div class="bg-gray-50 p-2 text-[10px] text-gray-500 text-center border-t border-gray-100">
                                    Đã chọn: <strong>{activeColumn.numerator.length}</strong>
                                </div>
                            </div>

                            <div class="flex-1 flex flex-col border border-orange-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div class="bg-orange-50 p-2 border-b border-orange-200 flex justify-between items-center">
                                    <span class="font-bold text-orange-800 text-xs uppercase flex items-center gap-1">
                                        <span class="bg-orange-200 text-orange-800 px-1.5 rounded text-[10px]">B</span> Mẫu Số
                                    </span>
                                    <div class="flex gap-2 text-[10px]">
                                        <button class="text-orange-600 font-bold hover:underline" on:click={() => toggleAll('denominator', true)}>Chọn hết</button>
                                        <button class="text-red-500 font-bold hover:underline" on:click={() => toggleAll('denominator', false)}>Bỏ chọn</button>
                                    </div>
                                </div>
                                <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                    <DataSourceList 
                                        items={sourceList} 
                                        selectedIds={activeColumn.denominator} 
                                        filter={searchFilter} 
                                        onToggle={(item) => toggleSelection(item, 'denominator')}
                                        colorClass="text-orange-700 bg-orange-50 border-orange-200"
                                    />
                                </div>
                                <div class="bg-gray-50 p-2 text-[10px] text-gray-500 text-center border-t border-gray-100">
                                    Đã chọn: <strong>{activeColumn.denominator.length}</strong>
                                </div>
                            </div>
                        </div>

                    {:else}
                        <div class="h-full flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                            <div class="bg-gray-50 p-2 border-b border-gray-200 flex justify-between items-center">
                                <span class="font-bold text-gray-700 text-xs uppercase">Danh sách Nguồn dữ liệu</span>
                                <div class="flex gap-3 text-xs">
                                    <button class="text-blue-600 font-bold hover:underline" on:click={() => toggleAll('items', true)}>Chọn hiển thị ({sourceList.filter(i => i.name.toLowerCase().includes(searchFilter.toLowerCase())).length})</button>
                                    <button class="text-red-500 font-bold hover:underline" on:click={() => toggleAll('items', false)}>Bỏ chọn tất cả</button>
                                </div>
                            </div>
                            <div class="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    <DataSourceList 
                                        items={sourceList} 
                                        selectedIds={activeColumn.items} 
                                        filter={searchFilter} 
                                        onToggle={(item) => toggleSelection(item, 'items')}
                                        colorClass="text-gray-800 bg-gray-100 border-gray-300 font-bold"
                                        gridLayout={true}
                                    />
                                </div>
                            </div>
                            <div class="bg-gray-50 p-2 text-xs text-gray-500 border-t border-gray-200 flex justify-between px-4">
                                <span>Tổng nguồn: {sourceList.length}</span>
                                <span>Đã chọn: <strong>{activeColumn.items.length}</strong></span>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 z-30">
            <button on:click={close} class="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors shadow-sm">Hủy</button>
            <button on:click={handleSave} class="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-colors flex items-center gap-2">
                <i data-feather="save" class="w-4 h-4"></i> Lưu Bảng
            </button>
        </div>
    </div>
</div>
{/if}

{#snippet DataSourceList({ items, selectedIds, filter, onToggle, colorClass, gridLayout = false })}
    {#each items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase())) as item (item.id)}
        {@const isSelected = selectedIds.includes(item.id)}
        <div 
            class="flex items-center p-2 rounded cursor-pointer border transition-all select-none
            {isSelected ? `${colorClass} shadow-sm ring-1 ring-opacity-50` : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}"
            on:click={() => onToggle(item)}
            role="button" tabindex="0"
        >
            <div class="mr-2 flex-shrink-0 flex items-center justify-center w-4 h-4 border rounded {isSelected ? 'bg-current border-transparent' : 'border-gray-300 bg-white'}">
                {#if isSelected}<i data-feather="check" class="w-3 h-3 text-white"></i>{/if}
            </div>
            <span class="text-xs truncate flex-1 {isSelected ? 'font-bold' : 'text-gray-600'}">
                {item.name}
            </span>
            {#if item.type.includes('MACRO')}
                <span class="text-[9px] px-1 bg-gray-200 text-gray-500 rounded ml-1">GỘP</span>
            {/if}
        </div>
    {/each}
{/snippet}

<style>
    .animate-scale-in { animation: scaleIn 0.2s ease-out; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>