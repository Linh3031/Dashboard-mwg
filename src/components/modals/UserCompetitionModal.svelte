<script>
    import { 
        modalState, 
        localCompetitionConfigs, 
        categoryStructure,
        brandList,
        specialProductList,
        selectedWarehouse
    } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';
    import TableBuilder from './TableBuilder.svelte';
    import UniversalCategorySelector from './UniversalCategorySelector.svelte';

    $: isOpen = $modalState.activeModal === 'user-competition-modal';

    let editingIndex = -1;
    let isLoading = false;
    let rightPanelMode = 'group';

    let formData = { 
        id: '', 
        name: '', 
        groups: [], 
        type: 'doanhthu', 
        minPrice: '', 
        maxPrice: '', 
        excludeApple: false,
        mainColumn: { id: 'mainValue', header: 'Tổng Nhóm Hàng', show: true, items: [], type: 'DT', showSL: false },
        subColumns: []
    };

    let searchBrand = '';
    let showSelectedBrandOnly = false;

    let tabActiveContext = 'main';
    let tabActiveSubIndex = 0;
    $: activeColumn = tabActiveContext === 'main' ? formData.mainColumn : formData.subColumns[tabActiveSubIndex];

    // [QUY TẮC 3]: Logic lọc Hãng thông minh dựa theo Ngành/Nhóm đang tick bên trái
    $: availableBrands = (() => {
        const allBrands = $brandList || [];
        if (!activeColumn || tabActiveContext === 'main') return allBrands;
        
        const selectedGroups = activeColumn.items || [];
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
        const matchSelected = !showSelectedBrandOnly || (activeColumn.brands || []).includes(b);
        return matchSearch && matchSelected;
    }).sort((a, b) => {
        const aSel = (activeColumn.brands || []).includes(a);
        const bSel = (activeColumn.brands || []).includes(b);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return a.localeCompare(b);
    });

    $: if (isOpen) {
        if ($modalState.editingIndex !== undefined && $modalState.editingIndex !== -1) {
            openEditForm($modalState.editingIndex);
        } else if ($modalState.editingIndex === -1) {
            resetForm();
        }
    }

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, editingIndex: -1 }));
        resetForm();
    }

    function resetForm() {
        formData = { 
            id: '', name: '', groups: [], type: 'doanhthu', minPrice: '', maxPrice: '', excludeApple: false,
            mainColumn: { id: 'mainValue', header: 'Tổng Nhóm Hàng', show: true, items: [], type: 'DT', showSL: false },
            subColumns: []
        };
        editingIndex = -1;
        searchBrand = '';
        showSelectedBrandOnly = false;
        tabActiveContext = 'main'; tabActiveSubIndex = 0;
        rightPanelMode = 'group';
    }

    function openEditForm(index) {
        const config = $localCompetitionConfigs[index];
        if (!config) return;
        editingIndex = index;
        formData = {
            id: config.id,
            name: config.name,
            groups: [...(config.groups || [])],
            type: config.type || 'doanhthu',
            minPrice: config.minPrice ? config.minPrice / 1000000 : '', 
            maxPrice: config.maxPrice ? config.maxPrice / 1000000 : '',
            excludeApple: config.excludeApple || false,
            mainColumn: config.mainColumn || { id: 'mainValue', header: 'Tổng Nhóm Hàng', show: true, items: [...(config.groups || [])], type: 'DT', showSL: false },
            subColumns: config.subColumns || (config.brands || []).map((b, i) => ({
                id: `col_${i}`, header: b, brands: [b], items: [], type: 'DT', color: '#3b82f6', showSL: false
            }))
        };
    }

    function toggleSelection(list, item) {
        return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    }

    function handleSelectionChange(event) {
        const newArray = event.detail;
        if (tabActiveContext === 'main') {
            formData.mainColumn.items = newArray;
            formData.groups = newArray;
        } else if (formData.subColumns[tabActiveSubIndex]) {
            formData.subColumns[tabActiveSubIndex].items = newArray;
        }
        formData = { ...formData };
    }

    function updateActiveCol(key, value) {
        if (tabActiveContext === 'main') {
            formData.mainColumn[key] = value;
            if (key === 'type' && value === 'SL') formData.mainColumn.showSL = false;
            formData = { ...formData };
        } else if (formData.subColumns[tabActiveSubIndex]) {
            formData.subColumns[tabActiveSubIndex][key] = value;
            if (key === 'type' && value === 'SL') formData.subColumns[tabActiveSubIndex].showSL = false;
            formData.subColumns = [...formData.subColumns];
        }
    }

    function selectAllBrands() {
        if (tabActiveContext === 'main') return;
        const current = activeColumn.brands || [];
        const toAdd = filteredBrands.filter(b => !current.includes(b));
        updateActiveCol('brands', [...current, ...toAdd]);
    }

    function deselectAllBrands() {
        if (tabActiveContext === 'main') return;
        const current = activeColumn.brands || [];
        updateActiveCol('brands', current.filter(b => !filteredBrands.includes(b)));
    }

    async function saveProgram() {
        if (!$selectedWarehouse) return alert("Vui lòng chọn Kho trước!");
        if (!formData.name) return alert("Vui lòng nhập tên chương trình!");
        if (formData.subColumns.length === 0) return alert("Vui lòng tạo ít nhất một cột Hãng/Nhóm!");
        
        isLoading = true;
        const allSelectedBrands = [...new Set(formData.subColumns.flatMap(c => c.brands || []))];
        const configToSave = {
            id: formData.id || `comp_${Date.now()}`,
            name: formData.name,
            groups: formData.mainColumn.items || [],
            brands: allSelectedBrands,
            type: formData.mainColumn.type === 'SL' ? 'soluong' : (formData.mainColumn.type === 'DTQD' ? 'dtqd' : 'doanhthu'),
            minPrice: formData.minPrice ? parseFloat(formData.minPrice) * 1000000 : 0,
            maxPrice: formData.maxPrice ? parseFloat(formData.maxPrice) * 1000000 : 0,
            excludeApple: formData.excludeApple,
            mainColumn: formData.mainColumn,
            subColumns: formData.subColumns,
            target: 0
        };

        let newConfigs = [...$localCompetitionConfigs];
        if (editingIndex >= 0) newConfigs[editingIndex] = configToSave;
        else newConfigs.push(configToSave);

        localCompetitionConfigs.set(newConfigs);

        try {
            await datasyncService.saveCompetitionConfigs($selectedWarehouse, newConfigs);
            close(); 
        } catch (error) {
            console.error(error);
            alert(`Lỗi lưu: ${error.message}`);
        } finally { 
            isLoading = false;
        }
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1100] backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 flex flex-col h-[92vh]" on:click|stopPropagation>
     
            <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-blue-50 rounded-t-xl flex-shrink-0">
                <div>
                    <h3 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                        <i data-feather="award"></i> 
                        {editingIndex >= 0 ? 'Chỉnh sửa Bảng Thi Đua' : 'Tạo Bảng Thi Đua Mới'}
                    </h3>
                    {#if $selectedWarehouse}
                        <p class="text-xs text-blue-600 mt-0.5">Kho đang áp dụng: <span class="font-bold">{$selectedWarehouse}</span></p>
                    {/if}
                </div>
                <button class="text-gray-500 hover:text-red-500 text-2xl leading-none" on:click={close}>&times;</button>
            </div>
            
            <div class="flex-1 overflow-hidden bg-slate-50/30 flex flex-col min-h-0">
                {#if !$selectedWarehouse}
                    <div class="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg m-6">
                        <p class="text-yellow-700 font-semibold">Vui lòng chọn Kho ở tab "Cập nhật dữ liệu" trước.</p>
                    </div>
                {:else}
                    <div class="flex-1 flex min-h-0">
                        <!-- Cột Trái (25%): Table Builder -->
                        <div class="w-1/4 p-3 overflow-y-auto custom-scrollbar bg-gray-50 border-r border-gray-300">
                            <TableBuilder 
                                bind:tableName={formData.name} 
                                bind:mainColumn={formData.mainColumn} 
                                bind:subColumns={formData.subColumns}
                                bind:activeContext={tabActiveContext} 
                                bind:activeSubIndex={tabActiveSubIndex}
                                on:contextChange={(e) => { 
                                    tabActiveContext = e.detail.ctx; 
                                    tabActiveSubIndex = e.detail.index;
                                    rightPanelMode = 'group'; 
                                }}
                            />
                        </div>

                        <!-- Cột Phải (75%): Cấu hình chi tiết & Lưới 50/50 Ngành/Nhóm - Hãng -->
                        <div class="w-3/4 flex flex-col bg-gray-100 min-h-0">
                            {#if activeColumn}
                                <div class="bg-white px-4 py-2.5 border-b border-gray-200 shadow-sm z-10 flex-shrink-0">
                                    <div class="flex items-center gap-3">
                                        <div class="flex-1">
                                            <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Tên Cột Hiển Thị</label>
                                            <input type="text" value={activeColumn.header} on:input={(e) => updateActiveCol('header', e.target.value)} class="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                        <div class="w-32">
                                            <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Loại Dữ Liệu</label>
                                            <select value={activeColumn.type} on:change={(e) => updateActiveCol('type', e.target.value)} class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-sm font-medium">
                                                <option value="DT">Doanh thu</option>
                                                <option value="SL">Số lượng</option>
                                                <option value="DTQD">DT Quy đổi</option>
                                            </select>
                                        </div>
                                        {#if tabActiveContext !== 'main'}
                                            <div class="w-20">
                                                <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Màu Sắc</label>
                                                <input type="color" value={activeColumn.color || '#3b82f6'} on:input={(e) => updateActiveCol('color', e.target.value)} class="w-full h-[28px] rounded border cursor-pointer p-0" />
                                            </div>
                                        {/if}
                                        <!-- [QUY TẮC 4]: Ẩn tùy chọn Hiện SL nếu Loại dữ liệu đã là Số lượng -->
                                        {#if activeColumn.type !== 'SL'}
                                            <div class="w-24 pl-2 border-l border-gray-200">
                                                <label class="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Hiển thị kép</label>
                                                <label class="flex items-center gap-1 cursor-pointer h-[28px]">
                                                    <input type="checkbox" checked={activeColumn.showSL} on:change={(e) => updateActiveCol('showSL', e.target.checked)} class="w-4 h-4 text-blue-600 rounded">
                                                    <span class="text-xs font-bold text-gray-700">Hiện SL</span>
                                                </label>
                                            </div>
                                        {/if}
                                    </div>
                                </div>

                                <!-- [QUY TẮC 3]: Lưới 50/50 trực quan, chia đều không gian cho Nhóm hàng và Hãng -->
                                <div class="flex-1 p-3 min-h-0 grid grid-cols-2 gap-3">
                                    <!-- NỬA TRÁI (50%): UniversalCategorySelector chuyên trách Ngành / Nhóm -->
                                    <div class="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-inner min-h-0">
                                        <div class="p-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-between flex-shrink-0">
                                            <span>📦 Phạm vi Ngành / Nhóm hàng:</span>
                                            {#if tabActiveContext !== 'main' && (activeColumn.items || []).length === 0}
                                                <span class="text-[10px] font-normal text-amber-600 italic">Kế thừa từ Cột Tổng</span>
                                            {/if}
                                        </div>
                                        <div class="flex-1 min-h-0">
                                            <UniversalCategorySelector 
                                                bind:mode={rightPanelMode} 
                                                selectedItems={activeColumn.items || []} 
                                                on:selectionChange={handleSelectionChange} 
                                            />
                                        </div>
                                    </div>

                                    <!-- NỬA PHẢI (50%): Danh sách Hãng xếp dọc trượt, lọc theo Ngành/Nhóm -->
                                    <div class="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-inner min-h-0">
                                        <div class="p-2 bg-gray-50 border-b border-gray-200 flex flex-col gap-1.5 flex-shrink-0">
                                            <div class="flex items-center justify-between text-xs font-bold text-purple-800">
                                                <span>🏷️ Danh sách Hãng ({availableBrands.length}):</span>
                                                {#if tabActiveContext !== 'main'}
                                                    <div class="flex items-center gap-2 text-[10px] font-normal">
                                                        <button type="button" on:click={selectAllBrands} class="text-blue-600 font-bold hover:underline">Chọn hết</button>
                                                        <span class="text-gray-300">|</span>
                                                        <button type="button" on:click={deselectAllBrands} class="text-red-500 font-bold hover:underline">Bỏ hết</button>
                                                    </div>
                                                {/if}
                                            </div>
                                            {#if tabActiveContext !== 'main'}
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
                                            {#if tabActiveContext === 'main'}
                                                <div class="h-full flex items-center justify-center text-center text-gray-400 text-xs p-6">
                                                    Cột Tổng Nhóm tự động bao quát toàn bộ các Hãng trong phạm vi Nhóm hàng đã chọn bên trái.
                                                </div>
                                            {:else}
                                                <div class="grid grid-cols-1 gap-1">
                                                    {#each filteredBrands as brand (brand)}
                                                        {@const isSelected = (activeColumn.brands || []).includes(brand)}
                                                        <button type="button" on:click={() => {
                                                            const current = activeColumn.brands || [];
                                                            updateActiveCol('brands', toggleSelection(current, brand));
                                                        }} class="w-full flex items-center p-1.5 text-left rounded transition-colors text-[11px] {isSelected ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200' : 'hover:bg-gray-100 text-gray-700 border border-transparent'}">
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
                            {/if}
                        </div>
                    </div>

                    <div class="bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-3 z-10 flex-shrink-0">
                        <button on:click={close} class="px-5 py-2 text-sm bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100">Hủy bỏ</button>
                        <button on:click={saveProgram} class="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu Chương Trình'}</button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>