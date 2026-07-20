<script>
    import { createEventDispatcher } from 'svelte';
    import { modalState, brandList, specialProductList } from '../../stores.js'; 
    import UniversalCategorySelector from './UniversalCategorySelector.svelte';
    import IndicatorBuilder from './IndicatorBuilder.svelte';
    import TableBuilder from './TableBuilder.svelte';

    export let isOpen = false;
    export let editItem = null;
    export let isSystem = false;

    const dispatch = createEventDispatcher();
    let configType = 'INDICATOR';
    let rightPanelMode = 'group';

    // --- STATE CHỈ SỐ ---
    let indLabel = ''; let indType = 'PERCENT'; let indMetricBase = 'REAL'; let indTarget = 0;
    let indNumerator = []; let indDenominator = []; let indActiveContext = 'numerator';

    // --- STATE BẢNG ---
    let tabName = '';
    let tabMainCol = { id: 'mainValue', header: 'Tổng cộng', show: false, items: [], itemType: 'group', type: 'DT', showSL: false };
    let tabSubCols = [];
    let tabActiveContext = 'main';
    let tabActiveSubIndex = 0;

    // --- STATE QUẢN LÝ TÌM KIẾM & LỌC HÃNG ---
    let searchBrand = '';
    let showSelectedBrandOnly = false;

    let wasOpen = false;
    $: if (isOpen && !wasOpen) { wasOpen = true; initData(); }
    $: if (!isOpen) { wasOpen = false; }

    function initData() {
        if (editItem) {
            configType = (editItem.name !== undefined || editItem.tableName !== undefined || editItem.columns !== undefined || editItem.subColumns !== undefined) ? 'TABLE' : 'INDICATOR';
        } else {
            const appState = $modalState.activeModal || '';
            configType = appState.includes('table') ? 'TABLE' : 'INDICATOR';
        }

        if (configType === 'INDICATOR') {
            indLabel = editItem?.label || ''; indType = editItem?.type || 'PERCENT';
            indMetricBase = editItem?.percentMetric === 'DTQD' ? 'CONVERTED' : (editItem?.percentMetric === 'SL' ? 'SL' : 'REAL');
            indTarget = editItem?.target || 0; indNumerator = editItem?.groupA ? [...editItem.groupA] : [];
            indDenominator = editItem?.groupB ? [...editItem.groupB] : []; indActiveContext = 'numerator';
        } else {
            tabName = editItem?.name || editItem?.tableName || editItem?.title || '';
            
            if (editItem && editItem.mainColumn && Object.keys(editItem.mainColumn).length > 0) {
                tabMainCol = { ...editItem.mainColumn, show: true };
            } else {
                tabMainCol = { id: 'mainValue', header: 'Tổng cộng', show: false, items: [], itemType: 'group', type: 'DT', showSL: false };
            }

            let rawCols = editItem?.subColumns ? editItem.subColumns : (editItem?.columns ? editItem.columns : []);
            tabSubCols = JSON.parse(JSON.stringify(rawCols)).map(c => ({
                ...c,
                type: c.type || 'DT',
                color: c.color || '#3b82f6',
                target: c.target || 0,
                percentMetric: c.percentMetric || 'DT',
                showSL: c.showSL || false,
                brands: c.brands || [] 
            }));
            
            tabActiveContext = tabMainCol.show ? 'main' : (tabSubCols.length > 0 ? 'sub_items' : 'main');
            tabActiveSubIndex = 0;
            searchBrand = '';
            showSelectedBrandOnly = false;
        }
    }

    $: activeColumn = tabActiveContext === 'main' ? tabMainCol : tabSubCols[tabActiveSubIndex];

    $: {
        if (configType === 'TABLE') {
            if (tabActiveContext === 'main') {
                rightPanelMode = tabMainCol.itemType === 'category' ? 'category' : 'group';
            } else if (tabSubCols[tabActiveSubIndex]) {
                const col = tabSubCols[tabActiveSubIndex];
                if (tabActiveContext === 'sub_items') rightPanelMode = col.itemType === 'category' ? 'category' : 'group';
                else if (tabActiveContext === 'sub_num') rightPanelMode = col.numType === 'category' ? 'category' : 'group';
                else if (tabActiveContext === 'sub_den') rightPanelMode = col.denType === 'category' ? 'category' : 'group';
            }
        }
    }

    $: selectorItems = (() => {
        if (configType === 'INDICATOR') return indActiveContext === 'numerator' ? [...indNumerator] : [...indDenominator];
        if (tabActiveContext === 'main') return [...(tabMainCol.items || [])];
        const col = tabSubCols[tabActiveSubIndex];
        if (!col) return [];
        if (tabActiveContext === 'sub_items') return [...(col.items || [])];
        if (tabActiveContext === 'sub_num') return [...(col.numerator || [])];
        if (tabActiveContext === 'sub_den') return [...(col.denominator || [])];
        return [];
    })();

    $: availableBrands = (() => {
        const allBrands = $brandList || [];
        if (!activeColumn || tabActiveContext === 'main' || configType === 'INDICATOR') return allBrands;
        
        const selectedGroups = selectorItems || [];
        if (selectedGroups.length === 0 || !$specialProductList) return allBrands;
        
        const groupSet = new Set(selectedGroups.map(g => String(g).trim().toLowerCase()));
        const matchedBrands = new Set();
        
        $specialProductList.forEach(sp => {
            const nh = String(sp.nhomHang || '').trim().toLowerCase();
            const br = String(sp.nhaSanXuat || sp.brand || '').trim();
            if (groupSet.has(nh) && br) {
                matchedBrands.add(br);
            }
        });
        
        return matchedBrands.size > 0 ? Array.from(matchedBrands).sort() : allBrands;
    })();

    $: filteredBrands = availableBrands.filter(b => {
        const matchSearch = b.toLowerCase().includes(searchBrand.toLowerCase());
        const matchSelected = !showSelectedBrandOnly || (activeColumn?.brands || []).includes(b);
        return matchSearch && matchSelected;
    }).sort((a, b) => {
        const aSel = (activeColumn?.brands || []).includes(a);
        const bSel = (activeColumn?.brands || []).includes(b);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return a.localeCompare(b);
    });

    function toggleBrandSelection(brand) {
        if (!activeColumn || tabActiveContext === 'main') return;
        const current = activeColumn.brands || [];
        const next = current.includes(brand) ? current.filter(b => b !== brand) : [...current, brand];
        updateActiveCol('brands', next);
    }

    function selectAllBrands() {
        if (!activeColumn || tabActiveContext === 'main') return;
        const current = activeColumn.brands || [];
        const toAdd = filteredBrands.filter(b => !current.includes(b));
        updateActiveCol('brands', [...current, ...toAdd]);
    }

    function deselectAllBrands() {
        if (!activeColumn || tabActiveContext === 'main') return;
        const current = activeColumn.brands || [];
        updateActiveCol('brands', current.filter(b => !filteredBrands.includes(b)));
    }

    function handleSelectionChange(event) {
        const newArray = event.detail;
        if (configType === 'INDICATOR') {
            if (indActiveContext === 'numerator') indNumerator = newArray;
            else indDenominator = newArray;
        } else {
            if (tabActiveContext === 'main') {
                tabMainCol.items = newArray; tabMainCol.itemType = rightPanelMode;
            } else {
                const col = tabSubCols[tabActiveSubIndex];
                if (col) {
                    if (tabActiveContext === 'sub_items') { col.items = newArray; col.itemType = rightPanelMode; } 
                    else if (tabActiveContext === 'sub_num') { col.numerator = newArray; col.numType = rightPanelMode; } 
                    else if (tabActiveContext === 'sub_den') { col.denominator = newArray; col.denType = rightPanelMode; }
                }
            }
        }
    }

    function updateActiveCol(key, value) {
        if (tabActiveContext === 'main') {
            tabMainCol[key] = value;
            if (key === 'type' && (value === 'SL' || value === 'PERCENT')) tabMainCol['showSL'] = false;
            tabMainCol = { ...tabMainCol };
        } else {
            tabSubCols[tabActiveSubIndex][key] = value;
            if (key === 'type' && value === 'PERCENT') tabActiveContext = 'sub_num';
            else if (key === 'type' && value !== 'PERCENT') tabActiveContext = 'sub_items';
            
            if (key === 'type' && (value === 'SL' || value === 'PERCENT')) {
                tabSubCols[tabActiveSubIndex]['showSL'] = false;
            }
            tabSubCols = [...tabSubCols];
        }
    }

    function handleQuickLoad(sourceIndex) {
        if (sourceIndex === '') return;
        const sourceCol = tabSubCols[sourceIndex];
        if (!sourceCol || !sourceCol.items) return;
        
        if (tabActiveContext === 'main') {
            tabMainCol.items = [...sourceCol.items];
            tabMainCol = { ...tabMainCol };
        } else if (tabActiveContext === 'sub_items') {
            tabSubCols[tabActiveSubIndex].items = [...sourceCol.items];
            tabSubCols[tabActiveSubIndex].brands = [...(sourceCol.brands || [])]; 
            tabSubCols = [...tabSubCols];
        } else if (tabActiveContext === 'sub_num') {
            tabSubCols[tabActiveSubIndex].numerator = [...sourceCol.items];
            if (sourceCol.type === 'SL' || sourceCol.type === 'DTQD' || sourceCol.type === 'DT') {
                tabSubCols[tabActiveSubIndex].percentMetric = sourceCol.type;
            }
            tabSubCols = [...tabSubCols];
        } else if (tabActiveContext === 'sub_den') {
            tabSubCols[tabActiveSubIndex].denominator = [...sourceCol.items];
            if (sourceCol.type === 'SL' || sourceCol.type === 'DTQD' || sourceCol.type === 'DT') {
                tabSubCols[tabActiveSubIndex].percentMetric = sourceCol.type;
            }
            tabSubCols = [...tabSubCols];
        }
    }

    function handleSave() {
        let payload = {};
        if (configType === 'INDICATOR') {
            if (!indLabel.trim()) return alert('Vui lòng nhập tên chỉ số.');
            payload = {
                id: editItem?.id || `metric_${Date.now()}`, label: indLabel, type: indType,
                percentMetric: indMetricBase === 'REAL' ? 'DT' : (indMetricBase === 'CONVERTED' ? 'DTQD' : 'SL'),
                target: indTarget, groupA: indNumerator, groupB: indType === 'UNIT_PRICE' ? indNumerator : indDenominator 
            };
        } else {
            if (!tabName.trim()) return alert('Vui lòng nhập tên bảng.');
            
            // [SURGICAL VALIDATION]: Bắt buộc chọn ít nhất 1 Nhóm/Ngành hàng nếu bật Cột tổng gộp
            if (tabMainCol.show && (!tabMainCol.items || tabMainCol.items.length === 0)) {
                return alert('⚠️ Lỗi Cấu Hình: Bạn đã bật "Cột Tổng Gộp" nhưng chưa chọn Nhóm hàng hoặc Ngành hàng nào.\n\nVui lòng chọn phạm vi dữ liệu hoặc tắt Cột tổng gộp nếu không sử dụng!');
            }
            
            let processedCols = tabSubCols.map((c, i) => ({
                ...c,
                id: c.id || `col_${Date.now()}_${i}`,
                targetId: c.targetId || null,
                brands: c.brands || [], 
                numerator: c.numerator || [], denominator: c.denominator || [], items: c.items || []
            }));

            // [SURGICAL FIX]: Giữ nguyên thuộc tính show: true để processor nhận biết
            let finalMainCol = tabMainCol.show ? { ...tabMainCol, show: true } : null;

            payload = {
                id: editItem?.id || editItem?.tableId || `table_${Date.now()}`,
                tableId: editItem?.tableId || editItem?.id || `table_${Date.now()}`,
                name: tabName, tableName: tabName, title: tabName, isSystem: isSystem,
                mainColumn: finalMainCol, subColumns: processedCols, columns: processedCols 
            };
        }
        dispatch('save', { type: configType, payload });
    }

    function close() { dispatch('close'); }
</script>

{#if isOpen}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div class="bg-gray-100 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh]">
        
        <div class="bg-white px-5 py-3 border-b flex justify-between items-center shadow-sm z-10 flex-shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div>
                    <h2 class="text-lg font-bold text-gray-800">{editItem ? 'Chỉnh sửa' : 'Tạo mới'} Cấu hình</h2>
                </div>
            </div>
            
            {#if !editItem}
            <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-md border">
                <button on:click={() => configType = 'INDICATOR'} class="px-3 py-1 text-xs font-bold rounded transition-all {configType === 'INDICATOR' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}">Chỉ số / Tỉ lệ %</button>
                <button on:click={() => configType = 'TABLE'} class="px-3 py-1 text-xs font-bold rounded transition-all {configType === 'TABLE' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}">Bảng theo dõi</button>
            </div>
            {/if}

            <button on:click={close} class="p-1.5 text-gray-500 hover:text-red-500 rounded transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>

        <div class="flex-1 flex min-h-0">
            {#if configType === 'INDICATOR'}
                <div class="w-2/5 p-4 overflow-y-auto custom-scrollbar bg-gray-100/50 border-r border-gray-300">
                    <IndicatorBuilder 
                        bind:label={indLabel} bind:type={indType} bind:metricBase={indMetricBase} bind:target={indTarget}
                        bind:activeContext={indActiveContext}
                        numeratorCount={indNumerator.length} denominatorCount={indDenominator.length}
                        on:contextChange={(e) => indActiveContext = e.detail}
                    />
                </div>
                <div class="w-3/5 p-4 bg-white flex flex-col min-h-0">
                    <UniversalCategorySelector bind:mode={rightPanelMode} selectedItems={selectorItems} on:selectionChange={handleSelectionChange} />
                </div>
            {:else}
                <div class="w-1/4 p-3 overflow-y-auto custom-scrollbar bg-gray-50 border-r border-gray-300">
                    <TableBuilder 
                        bind:tableName={tabName} bind:mainColumn={tabMainCol} bind:subColumns={tabSubCols}
                        bind:activeContext={tabActiveContext} bind:activeSubIndex={tabActiveSubIndex}
                        on:contextChange={(e) => { tabActiveContext = e.detail.ctx; tabActiveSubIndex = e.detail.index; }}
                    />
                </div>

                <div class="w-3/4 flex flex-col bg-gray-100 min-h-0">
                    {#if activeColumn}
                        <div class="bg-white px-4 py-2.5 border-b border-gray-200 shadow-sm z-10 flex-shrink-0">
                            <div class="flex items-center gap-3">
                                <div class="flex-1">
                                    <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Tên {tabActiveContext === 'main' ? 'Cột Tổng' : 'Cột'}</label>
                                    <input 
                                        type="text" value={activeColumn.header} on:input={(e) => updateActiveCol('header', e.target.value)}
                                        class="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none" 
                                    />
                                </div>

                                <div class="w-28">
                                    <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Loại Dữ Liệu</label>
                                    <select 
                                        value={activeColumn.type} on:change={(e) => updateActiveCol('type', e.target.value)}
                                        class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                                    >
                                        <option value="DT">Doanh thu</option>
                                        <option value="SL">Số lượng</option>
                                        <option value="DTQD">DT Quy đổi</option>
                                        {#if tabActiveContext !== 'main'}
                                            <option value="PERCENT" class="font-bold text-blue-600">Tỷ lệ %</option>
                                        {/if}
                                    </select>
                                </div>

                                {#if tabActiveContext !== 'main'}
                                    <div class="w-28">
                                        <label class="block text-[9px] font-bold text-orange-500 uppercase mb-0.5">
                                            Mục tiêu {activeColumn.type === 'PERCENT' ? '(%)' : (activeColumn.type === 'SL' ? '' : '(/1000)')}
                                        </label>
                                        <input 
                                            type="number" value={activeColumn.target || 0} on:input={(e) => updateActiveCol('target', parseFloat(e.target.value) || 0)}
                                            class="w-full px-2 py-1 border border-orange-300 rounded text-sm font-bold text-orange-700 bg-orange-50 focus:ring-1 focus:ring-orange-500 outline-none" 
                                        />
                                    </div>

                                    {#if activeColumn.type === 'PERCENT'}
                                        <div class="w-28">
                                            <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Tính theo</label>
                                            <select 
                                                value={activeColumn.percentMetric || 'DT'} on:change={(e) => updateActiveCol('percentMetric', e.target.value)}
                                                class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                                            >
                                                <option value="DT">Doanh thu</option>
                                                <option value="SL">Số lượng</option>
                                                <option value="DTQD">DT Quy đổi</option>
                                            </select>
                                        </div>
                                    {/if}

                                    <div class="w-16">
                                        <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Màu sắc</label>
                                        <div class="relative cursor-pointer w-full h-[28px] rounded border border-gray-300 overflow-hidden shadow-sm">
                                            <input type="color" value={activeColumn.color || '#3b82f6'} on:input={(e) => updateActiveCol('color', e.target.value)} class="absolute -inset-2 w-20 h-20 cursor-pointer opacity-0" />
                                            <div class="w-full h-full pointer-events-none" style="background-color: {activeColumn.color || '#3b82f6'}"></div>
                                        </div>
                                    </div>
                                {/if}

                                {#if activeColumn.type === 'DT' || activeColumn.type === 'DTQD'}
                                <div class="w-24 pl-2 border-l border-gray-200">
                                    <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Hiển thị kép</label>
                                    <label class="flex items-center gap-1.5 cursor-pointer h-[28px]">
                                        <input type="checkbox" checked={activeColumn.showSL} on:change={(e) => updateActiveCol('showSL', e.target.checked)} class="w-4 h-4 text-blue-600 rounded cursor-pointer">
                                        <span class="text-xs font-bold text-gray-700">Hiện SL</span>
                                    </label>
                                </div>
                                {/if}
                            </div>
                        </div>

                        <div class="flex-1 flex flex-col p-3 bg-white min-h-0">
                            <div class="flex items-center gap-3 mb-2 flex-shrink-0">
                                <select class="text-xs font-medium border border-indigo-200 text-indigo-900 rounded bg-indigo-50 px-2 py-1 outline-none cursor-pointer hover:border-indigo-400" on:change={(e) => { handleQuickLoad(e.target.value); e.target.value=''; }}>
                                    <option value="">⚡ Nạp nhanh data từ cột...</option>
                                    {#each tabSubCols as c, i}
                                        {#if tabActiveContext !== 'sub_items' || tabActiveSubIndex !== i}
                                            <option value={i}>Cột: {c.header}</option>
                                        {/if}
                                    {/each}
                                </select>

                                {#if activeColumn.type === 'PERCENT'}
                                    <div class="flex-1 flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                        <button class="flex-1 py-1 rounded text-xs font-bold transition-all {tabActiveContext === 'sub_num' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}" on:click={() => tabActiveContext = 'sub_num'}>
                                            TỬ SỐ ({activeColumn.numerator?.length || 0})
                                        </button>
                                        <span class="px-2 text-gray-400 font-bold">/</span>
                                        <button class="flex-1 py-1 rounded text-xs font-bold transition-all {tabActiveContext === 'sub_den' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}" on:click={() => tabActiveContext = 'sub_den'}>
                                            MẪU SỐ ({activeColumn.denominator?.length || 0})
                                        </button>
                                    </div>
                                {/if}
                            </div>

                            <div class="flex-1 min-h-0 grid grid-cols-2 gap-3">
                                <div class="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-inner min-h-0">
                                    <div class="p-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-between flex-shrink-0">
                                        <span>📦 Phạm vi Ngành / Nhóm hàng:</span>
                                        {#if tabActiveContext !== 'main' && (activeColumn.items || []).length === 0 && activeColumn.type !== 'PERCENT'}
                                            <span class="text-[10px] font-normal text-amber-600 italic">Kế thừa từ Cột Tổng</span>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-h-0">
                                        <UniversalCategorySelector 
                                            bind:mode={rightPanelMode} 
                                            selectedItems={selectorItems} 
                                            on:selectionChange={handleSelectionChange} 
                                        />
                                    </div>
                                </div>

                                <div class="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-inner min-h-0">
                                    <div class="p-2 bg-gray-50 border-b border-gray-200 flex flex-col gap-1.5 flex-shrink-0">
                                        <div class="flex items-center justify-between text-xs font-bold text-purple-800">
                                            <span>🏷️ Danh sách Hãng ({availableBrands.length}):</span>
                                            {#if tabActiveContext !== 'main' && activeColumn.type !== 'PERCENT'}
                                                <div class="flex items-center gap-2 text-[10px] font-normal">
                                                    <button type="button" on:click={selectAllBrands} class="text-blue-600 font-bold hover:underline">Chọn hết</button>
                                                    <span class="text-gray-300">|</span>
                                                    <button type="button" on:click={deselectAllBrands} class="text-red-500 font-bold hover:underline">Bỏ hết</button>
                                                </div>
                                            {/if}
                                        </div>
                                        {#if tabActiveContext !== 'main' && activeColumn.type !== 'PERCENT'}
                                            <div class="flex items-center gap-1.5">
                                                <div class="relative flex-1">
                                                    <input type="text" bind:value={searchBrand} placeholder="🔍 Tìm hãng nhanh..." class="w-full pl-6 pr-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500" />
                                                    <svg class="w-3 h-3 text-gray-400 absolute left-2 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                                </div>
                                                <label class="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer select-none whitespace-nowrap">
                                                    <input type="checkbox" bind:checked={showSelectedBrandOnly} class="rounded text-purple-600" />
                                                    <span>Đã chọn ({(activeColumn.brands || []).length})</span>
                                                </label>
                                            </div>
                                        {/if}
                                    </div>

                                    <div class="flex-1 overflow-y-auto p-1.5 min-h-0 custom-scrollbar">
                                        {#if tabActiveContext === 'main' || activeColumn.type === 'PERCENT'}
                                            <div class="h-full flex items-center justify-center text-center text-gray-400 text-xs p-6">
                                                {tabActiveContext === 'main' ? 'Cột Tổng tự động áp dụng cho toàn bộ các Hãng trong phạm vi Nhóm hàng đã chọn.' : 'Cột Tỷ lệ % áp dụng phép tính trên toàn cấu hình cột phụ được chọn.'}
                                            </div>
                                        {:else}
                                            <div class="grid grid-cols-1 gap-1">
                                                {#each filteredBrands as brand (brand)}
                                                    {@const isSelected = (activeColumn.brands || []).includes(brand)}
                                                    <button type="button" on:click={() => toggleBrandSelection(brand)} class="w-full flex items-center p-1.5 text-left rounded transition-colors text-[11px] {isSelected ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200' : 'hover:bg-gray-100 text-gray-700 border border-transparent'}">
                                                        <div class="mr-2 flex-shrink-0 w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors {isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-400'}">
                                                            {#if isSelected}<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>{/if}
                                                        </div>
                                                        <span class="truncate flex-1">{brand}</span>
                                                    </button>
                                                {:else}
                                                    <div class="text-center text-gray-400 text-xs py-10">Không tìm thấy hãng nào.</div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <div class="bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-3 z-10 flex-shrink-0">
            <button on:click={close} class="px-5 py-2 text-sm bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors">Hủy bỏ</button>
            <button on:click={handleSave} class="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow transition-colors">Lưu Cấu Hình</button>
        </div>
    </div>
</div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>