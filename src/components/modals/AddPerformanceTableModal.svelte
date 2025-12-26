<script>
    import { createEventDispatcher } from 'svelte';
    import { 
        categoryStructure, 
        macroCategoryConfig, 
        macroProductGroupConfig,
        efficiencyConfig,
        warehouseCustomMetrics
    } from '../../stores.js';
    import { parseIdentity } from '../../utils.js';

    export let isOpen = false;
    export let editItem = null; // null = tạo mới, object = sửa
    export let isSystem = false; // true = Admin tạo, false = User tạo

    const dispatch = createEventDispatcher();

    // --- CẤU HÌNH UI ---
    const COLORS = [
        { id: 'blue',   bg: 'bg-blue-500',   class: 'bg-blue-100 text-blue-900 border-blue-200', label: 'Xanh dương' },
        { id: 'green',  bg: 'bg-green-500',  class: 'bg-green-100 text-green-900 border-green-200', label: 'Xanh lá' },
        { id: 'orange', bg: 'bg-orange-500', class: 'bg-orange-100 text-orange-900 border-orange-200', label: 'Cam' },
        { id: 'purple', bg: 'bg-purple-500', class: 'bg-purple-100 text-purple-900 border-purple-200', label: 'Tím' },
        { id: 'teal',   bg: 'bg-teal-500',   class: 'bg-teal-100 text-teal-900 border-teal-200', label: 'Xanh cổ vịt' },
        { id: 'red',    bg: 'bg-red-500',    class: 'bg-red-100 text-red-900 border-red-200', label: 'Đỏ' },
        { id: 'gray',   bg: 'bg-gray-500',   class: 'bg-gray-100 text-gray-900 border-gray-200', label: 'Xám' }
    ];

    const DATA_TYPES = [
        { id: 'DT', label: 'Doanh thu', icon: 'dollar-sign' },
        { id: 'DTQD', label: 'DTQĐ', icon: 'refresh-cw' },
        { id: 'SL', label: 'Số lượng', icon: 'hash' },
        { id: 'PERCENT', label: 'Tỷ lệ %', icon: 'percent' }
    ];

    // --- DATA SOURCES ---
    let sourceList = []; 
    let searchFilter = '';
    let sourceTypeFilter = 'ALL'; // 'ALL' | 'GROUP' | 'CATEGORY'

    // --- STATE ---
    let tableId = '';
    let tableName = '';
    let columns = [];
    let activeColIndex = 0;
    let wasOpen = false;

    $: activeColumn = columns[activeColIndex] || null;

    // --- INITIALIZATION ---
    $: if (isOpen) {
        if (!wasOpen) {
            initDataSource();
            if (editItem) {
                tableId = editItem.id;
                tableName = editItem.title;
                columns = JSON.parse(JSON.stringify(editItem.columns || []));
            } else {
                resetForm();
            }
            if (columns.length === 0) addColumn();
            activeColIndex = 0;
            searchFilter = ''; // Reset khi mở
            wasOpen = true;
        }
    } else {
        wasOpen = false;
        searchFilter = '';
        sourceTypeFilter = 'ALL';
    }

    function resetForm() {
        tableId = `perf_table_${Date.now()}`;
        tableName = '';
        columns = [];
    }

    function initDataSource() {
        const uniqueMap = new Map();
        
        // 1. MACRO CONFIG -> Type: MACRO_GROUP
        ($macroCategoryConfig || []).forEach(m => {
            const id = (m.id || m.name).trim();
            if (!uniqueMap.has(id)) uniqueMap.set(id, { id, name: m.name, type: 'MACRO_CAT' });
        });
        ($macroProductGroupConfig || []).forEach(m => {
            const id = (m.id || m.name).trim();
            if (!uniqueMap.has(id)) uniqueMap.set(id, { id, name: m.name, type: 'MACRO_GROUP' });
        });

        // 2. DATA STRUCTURE
        const processItem = (rawString, type) => {
            if (!rawString) return;
            const { identity } = parseIdentity(rawString);
            const key = identity || rawString.trim(); 
            const displayName = rawString.trim();

            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, { id: key, name: displayName, type });
            }
        };

        ($categoryStructure || []).forEach(c => {
            if (c.nhomHang) processItem(c.nhomHang, 'GROUP');
            if (c.nganhHang) processItem(c.nganhHang, 'CATEGORY');
        });

        sourceList = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    // --- COLUMN ACTIONS ---
    function addColumn() {
        columns = [...columns, {
            id: `col_${Date.now()}`,
            header: `Cột ${columns.length + 1}`,
            type: 'DT',
            color: 'blue',
            items: [],
            numerator: [],
            denominator: [],
            targetId: null
        }];
        activeColIndex = columns.length - 1;
        searchFilter = ''; // [MỚI] Reset tìm kiếm khi thêm cột
    }

    function selectColumn(index) {
        activeColIndex = index;
        searchFilter = ''; // [MỚI] Reset tìm kiếm khi chuyển cột
    }

    function removeColumn(index) {
        if (columns.length <= 1) return alert("Bảng cần ít nhất 1 cột.");
        if (confirm("Xóa cột này?")) {
            columns = columns.filter((_, i) => i !== index);
            if (activeColIndex >= columns.length) {
                activeColIndex = columns.length - 1;
                searchFilter = ''; // Reset khi xóa và chuyển cột
            }
        }
    }

    function updateActiveColumn(key, value) {
        if (!activeColumn) return;
        columns[activeColIndex][key] = value;
    }

    // --- SELECTION LOGIC ---
    function toggleSelection(item, targetArrayName) {
        if (!activeColumn) return;
        const currentArr = activeColumn[targetArrayName] || [];
        const idx = currentArr.indexOf(item.id);
        
        let newArr;
        if (idx >= 0) {
            newArr = currentArr.filter(i => i !== item.id);
        } else {
            newArr = [...currentArr, item.id];
        }
        
        columns[activeColIndex][targetArrayName] = newArr;
        if (activeColumn.type === 'PERCENT') detectExistingIndicator();
    }

    function clearAllSelection(targetArrayName) {
        if (!activeColumn) return;
        const currentArr = activeColumn[targetArrayName] || [];
        if (currentArr.length === 0) return;
        if (confirm(`Bạn có chắc muốn xóa tất cả ${currentArr.length} mục đã chọn?`)) {
            columns[activeColIndex][targetArrayName] = [];
            if (activeColumn.type === 'PERCENT') detectExistingIndicator();
        }
    }

    function toggleAll(targetArrayName, select) {
        if (!activeColumn) return;
        
        // Lấy danh sách đang hiển thị (sau khi lọc)
        const visibleItems = getProcessedItems(sourceList, activeColumn[targetArrayName] || [], searchFilter, sourceTypeFilter).map(i => i.id);

        let newArr;
        if (select) {
            const currentSet = new Set(activeColumn[targetArrayName] || []);
            visibleItems.forEach(id => currentSet.add(id));
            newArr = [...currentSet];
        } else {
            const visibleSet = new Set(visibleItems);
            newArr = (activeColumn[targetArrayName] || []).filter(id => !visibleSet.has(id));
        }
        columns[activeColIndex][targetArrayName] = newArr;
    }

    function copyFromColumn(targetSide, sourceColIndex) {
        if (sourceColIndex === '' || sourceColIndex === undefined) return;
        const sourceCol = columns[sourceColIndex];
        if (!sourceCol) return;

        let sourceItems = [];
        if (sourceCol.type === 'PERCENT') {
            sourceItems = sourceCol.numerator || [];
        } else {
            sourceItems = sourceCol.items || [];
        }

        const targetKey = targetSide === 'TOP' ? 'numerator' : 'denominator';
        columns[activeColIndex][targetKey] = [...sourceItems];
        
        if (activeColumn.type === 'PERCENT') detectExistingIndicator();
    }

    function detectExistingIndicator() {
        if (!activeColumn || activeColumn.type !== 'PERCENT') return;
        const num = new Set(activeColumn.numerator || []);
        const den = new Set(activeColumn.denominator || []);

        const allConfigs = [...$efficiencyConfig, ...$warehouseCustomMetrics];
        const match = allConfigs.find(cfg => {
            const cfgNum = new Set(cfg.groupA || []);
            const cfgDen = new Set(cfg.groupB || []);
            const eq = (s1, s2) => s1.size === s2.size && [...s1].every(x => s2.has(x));
            return eq(num, cfgNum) && eq(den, cfgDen);
        });
        if (match) {
            columns[activeColIndex].targetId = match.id;
        } else {
            columns[activeColIndex].targetId = null;
        }
    }

    // --- [MỚI] HÀM XỬ LÝ DANH SÁCH (FILTER + SORT) ---
    function getProcessedItems(items, selectedIds, filter, sourceType) {
        // 1. Lọc (Filter)
        const filtered = items.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(filter.toLowerCase());
            
            // Logic lọc nguồn: GROUP bao gồm cả Macro và Raw Group
            const matchesType = sourceType === 'ALL' ? true : 
                                (sourceType === 'GROUP' ? ['MACRO_CAT', 'MACRO_GROUP', 'GROUP'].includes(i.type) : i.type === 'CATEGORY');
            
            return matchesSearch && matchesType;
        });

        // 2. Sắp xếp (Sort): Đã chọn lên đầu
        return filtered.sort((a, b) => {
            const isA = selectedIds.includes(a.id);
            const isB = selectedIds.includes(b.id);
            
            // Nếu trạng thái chọn khác nhau: Đã chọn (true) lên trước
            if (isA && !isB) return -1;
            if (!isA && isB) return 1;
            
            // Nếu cùng trạng thái: Giữ nguyên thứ tự Alpha ban đầu
            return 0; 
        });
    }

    function handleSave() {
        if (!tableName.trim()) return alert("Vui lòng nhập Tên bảng.");
        if (columns.length === 0) return alert("Vui lòng thêm ít nhất 1 cột.");
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            if (!col.header.trim()) return alert(`Cột số ${i+1} chưa có tên.`);
            
            if (col.type === 'PERCENT') {
                if (col.numerator.length === 0) return alert(`Cột "${col.header}": Chưa chọn Tử số.`);
                if (col.denominator.length === 0) return alert(`Cột "${col.header}": Chưa chọn Mẫu số.`);
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
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-[1300px] h-[95vh] flex flex-col overflow-hidden animate-scale-in" on:click|stopPropagation role="document" tabindex="0">
        
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
            
            <div class="w-full lg:w-2/12 border-r border-gray-200 bg-white flex flex-col z-10 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                <div class="p-3 border-b border-gray-100 bg-slate-50">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tên Bảng Hiển Thị</label>
                    <input 
                        type="text" 
                        bind:value={tableName} 
                        class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-800 shadow-sm"
                        placeholder="VD: Hiệu quả Phụ Kiện..."
                    >
                </div>

                <div class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-gray-50/50">
                    {#each columns as col, index}
                        <div 
                            class="bg-white border rounded-lg p-3 cursor-pointer transition-all relative group
                            {activeColIndex === index ? 'border-blue-500 ring-1 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-blue-300 shadow-sm'}"
                            on:click={() => selectColumn(index)}
                            role="button" tabindex="0"
                        >
                            <div class="flex justify-between items-center mb-1">
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
                            <div class="text-sm font-bold text-gray-700 truncate">{col.header}</div>
                            <div class="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full {COLORS.find(c=>c.id===col.color)?.bg || 'bg-blue-500'}"></span>
                                {DATA_TYPES.find(t=>t.id===col.type)?.label}
                            </div>
                        </div>
                    {/each}

                    <button 
                        class="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold text-xs flex items-center justify-center gap-2 group"
                        on:click={addColumn}
                    >
                        <span class="bg-gray-200 group-hover:bg-blue-200 rounded-full p-0.5"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg></span>
                        Thêm cột mới
                    </button>
                </div>
            </div>

            <div class="w-full lg:w-10/12 flex flex-col bg-slate-50 h-full">
                
                {#if activeColumn}
                    <div class="p-3 border-b border-gray-200 bg-white shadow-sm z-20 space-y-3">
                        
                        <div class="flex flex-wrap items-end gap-6">
                            <div class="flex-1 min-w-[200px]">
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tiêu đề cột</label>
                                <input 
                                    type="text" 
                                    value={activeColumn.header} 
                                    on:input={(e) => updateActiveColumn('header', e.target.value)}
                                    class="w-full p-2 border border-gray-300 rounded text-sm font-bold text-gray-800 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white"
                                    placeholder="Nhập tên cột..."
                                >
                            </div>

                            <div class="flex-shrink-0">
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loại dữ liệu</label>
                                <div class="inline-flex bg-gray-100 p-1 rounded-lg">
                                    {#each DATA_TYPES as type}
                                        <button 
                                            class="px-4 py-1.5 rounded-md text-xs font-bold transition-all
                                            {activeColumn.type === type.id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}"
                                            on:click={() => updateActiveColumn('type', type.id)}
                                        >
                                            {#if type.icon === 'percent'}%{:else if type.icon === 'hash'}#{:else}${/if} {type.label}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div class="flex-shrink-0">
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Màu sắc</label>
                                <div class="flex gap-1">
                                    {#each COLORS as color}
                                        <button 
                                            class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 {color.bg}
                                            {activeColumn.color === color.id ? 'border-gray-800 scale-110 shadow-sm ring-2 ring-white' : 'border-transparent opacity-70 hover:opacity-100'}"
                                            on:click={() => updateActiveColumn('color', color.id)}
                                            title={color.label}
                                        ></button>
                                    {/each}
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-4 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                            <div class="flex items-center gap-3 border-r border-blue-200 pr-4">
                                <span class="text-[10px] font-bold uppercase text-blue-400">Lọc nguồn:</span>
                                <label class="flex items-center text-xs font-bold cursor-pointer hover:text-blue-700 transition-colors">
                                    <input type="radio" bind:group={sourceTypeFilter} value="ALL" class="mr-1.5 accent-blue-600"> Tất cả
                                </label>
                                <label class="flex items-center text-xs font-bold cursor-pointer hover:text-blue-700 transition-colors">
                                    <input type="radio" bind:group={sourceTypeFilter} value="GROUP" class="mr-1.5 accent-blue-600"> Nhóm Hàng (Gộp)
                                </label>
                                <label class="flex items-center text-xs font-bold cursor-pointer hover:text-blue-700 transition-colors">
                                    <input type="radio" bind:group={sourceTypeFilter} value="CATEGORY" class="mr-1.5 accent-blue-600"> Ngành Hàng (Lẻ)
                                </label>
                            </div>

                            <div class="flex-1 relative">
                                <input 
                                    type="text" 
                                    bind:value={searchFilter}
                                    class="w-full pl-8 pr-4 py-1.5 bg-white border border-blue-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm placeholder-gray-400"
                                    placeholder="🔍 Tìm kiếm nhóm hàng..."
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-2.5 top-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 overflow-hidden p-4 bg-slate-100 relative">
                        {#if activeColumn.type === 'PERCENT'}
                            
                            <div class="flex items-center justify-center mb-4">
                                <div class="bg-white border border-gray-200 shadow-sm px-6 py-2 rounded-full flex items-center gap-3">
                                    <span class="text-xs font-bold text-gray-500 uppercase">Công thức:</span>
                                    <div class="flex items-center gap-2 font-mono text-sm font-bold text-gray-700">
                                        <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">( A ) Tử số</span>
                                        <span class="text-gray-400">/</span>
                                        <span class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">( B ) Mẫu số</span>
                                        <span class="text-gray-400">x</span>
                                        <span class="text-green-600">100%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex h-[calc(100%-60px)] gap-4">
                                
                                <div class="flex-1 flex flex-col border border-blue-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <div class="bg-blue-50 p-3 border-b border-blue-100">
                                        <div class="flex justify-between items-center mb-2">
                                            <div class="flex items-center gap-2">
                                                <span class="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shadow-sm">A</span>
                                                <span class="font-bold text-blue-800 text-sm uppercase">Tử Số</span>
                                            </div>
                                            <div class="flex gap-2 text-[10px]">
                                                <button class="text-blue-600 font-bold hover:underline" on:click={() => toggleAll('numerator', true)}>Chọn hết</button>
                                                <button class="text-red-500 font-bold hover:underline" on:click={() => clearAllSelection('numerator')}>Xóa tất cả</button>
                                            </div>
                                        </div>
                                        <div class="relative">
                                            <select 
                                                class="w-full text-xs border border-blue-200 rounded-lg px-2 py-1.5 text-blue-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                                                on:change={(e) => { copyFromColumn('TOP', e.target.value); e.target.value = ''; }}
                                            >
                                                <option value="">⚡ Nạp nhanh từ cột khác...</option>
                                                {#each columns.slice(0, activeColIndex) as prevCol, idx}
                                                    <option value={idx}>Lấy từ: {prevCol.header}</option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                        {@render DataSourceList({ 
                                            items: getProcessedItems(sourceList, activeColumn.numerator, searchFilter, sourceTypeFilter), 
                                            selectedIds: activeColumn.numerator, 
                                            onToggle: (item) => toggleSelection(item, 'numerator'),
                                            selectedColor: "bg-blue-50 border-blue-300 text-blue-800 shadow-sm"
                                        })}
                                    </div>
                                    <div class="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 text-center border-t border-gray-100 font-bold">
                                        Đã chọn: <span class="text-blue-600">{activeColumn.numerator.length}</span>
                                    </div>
                                </div>

                                <div class="flex-1 flex flex-col border border-orange-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <div class="bg-orange-50 p-3 border-b border-orange-100">
                                        <div class="flex justify-between items-center mb-2">
                                            <div class="flex items-center gap-2">
                                                <span class="bg-orange-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shadow-sm">B</span>
                                                <span class="font-bold text-orange-800 text-sm uppercase">Mẫu Số</span>
                                            </div>
                                            <div class="flex gap-2 text-[10px]">
                                                <button class="text-orange-600 font-bold hover:underline" on:click={() => toggleAll('denominator', true)}>Chọn hết</button>
                                                <button class="text-red-500 font-bold hover:underline" on:click={() => clearAllSelection('denominator')}>Xóa tất cả</button>
                                            </div>
                                        </div>
                                        <div class="relative">
                                            <select 
                                                class="w-full text-xs border border-orange-200 rounded-lg px-2 py-1.5 text-orange-700 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
                                                on:change={(e) => { copyFromColumn('BOTTOM', e.target.value); e.target.value = ''; }}
                                            >
                                                <option value="">⚡ Nạp nhanh từ cột khác...</option>
                                                {#each columns.slice(0, activeColIndex) as prevCol, idx}
                                                    <option value={idx}>Lấy từ: {prevCol.header}</option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>

                                    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                        {@render DataSourceList({ 
                                            items: getProcessedItems(sourceList, activeColumn.denominator, searchFilter, sourceTypeFilter), 
                                            selectedIds: activeColumn.denominator, 
                                            onToggle: (item) => toggleSelection(item, 'denominator'),
                                            selectedColor: "bg-orange-50 border-orange-300 text-orange-800 shadow-sm"
                                        })}
                                    </div>
                                    <div class="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 text-center border-t border-gray-100 font-bold">
                                        Đã chọn: <span class="text-orange-600">{activeColumn.denominator.length}</span>
                                    </div>
                                </div>
                            </div>

                        {:else}
                            <div class="h-full flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div class="bg-gray-50 p-2 border-b border-gray-200 flex justify-between items-center">
                                    <span class="font-bold text-gray-700 text-xs uppercase px-2">Danh sách Nguồn dữ liệu</span>
                                    <div class="flex gap-3 text-xs px-2">
                                        <button class="text-blue-600 font-bold hover:underline" on:click={() => toggleAll('items', true)}>Chọn hiển thị</button>
                                        <button class="text-red-500 font-bold hover:underline" on:click={() => clearAllSelection('items')}>Xóa tất cả</button>
                                    </div>
                                </div>
                                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {@render DataSourceList({ 
                                            items: getProcessedItems(sourceList, activeColumn.items, searchFilter, sourceTypeFilter), 
                                            selectedIds: activeColumn.items, 
                                            onToggle: (item) => toggleSelection(item, 'items'),
                                            selectedColor: "bg-blue-50 border-blue-300 text-blue-800 ring-1 ring-blue-200 shadow-sm",
                                            gridLayout: true
                                        })}
                                    </div>
                                </div>
                                <div class="bg-gray-50 p-2 text-xs text-gray-500 border-t border-gray-200 flex justify-between px-4">
                                    <span>Tổng nguồn: {sourceList.length}</span>
                                    <span>Đã chọn: <strong>{activeColumn.items.length}</strong></span>
                                </div>
                            </div>
                        {/if}
                    </div>

                {:else}
                    <div class="h-full flex items-center justify-center text-gray-400 bg-gray-50">
                        <div class="text-center">
                            <i data-feather="arrow-left" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                            <p>Vui lòng chọn hoặc thêm một cột để cấu hình.</p>
                        </div>
                    </div>
                {/if}
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

{#snippet DataSourceList({ items, selectedIds, onToggle, selectedColor, gridLayout = false })}
    {#each items as item (item.id)}
        {@const isSelected = selectedIds.includes(item.id)}
        <div 
            class="flex items-center p-2 rounded cursor-pointer border transition-all select-none
            {isSelected ? selectedColor : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}"
            on:click={() => onToggle(item)}
            role="button" tabindex="0"
        >
            <div class="mr-2 flex-shrink-0 flex items-center justify-center w-4 h-4 border rounded 
                {isSelected ? 'bg-blue-600 border-transparent' : 'border-gray-300 bg-white'}">
                {#if isSelected}
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                {/if}
            </div>
            <span class="text-xs truncate flex-1 {isSelected ? 'font-bold' : 'text-gray-600'}">
                {item.name}
            </span>
            {#if item.type.includes('MACRO')}
                <span class="text-[9px] px-1 bg-gray-200 text-gray-500 rounded ml-1 font-bold">GỘP</span>
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