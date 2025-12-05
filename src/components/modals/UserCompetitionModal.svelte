<script>
    import { 
        modalState, 
        localCompetitionConfigs, // [QUAN TRỌNG] Dùng biến local thay vì global
        categoryStructure,
        brandList,
        selectedWarehouse
    } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';

    $: isOpen = $modalState.activeModal === 'user-competition-modal';

    // --- STATE VIEW ---
    let currentView = 'menu'; 
    let editingIndex = -1;
    let isLoading = false;
    
    // Form data chuẩn thiết kế cũ
    let formData = { 
        id: '', name: '', groups: [], brands: [], 
        type: 'doanhthu', minPrice: '', maxPrice: '', excludeApple: false 
    };

    // Search
    let searchGroup = '';
    let searchBrand = '';

    // Data Sources
    $: availableGroups = [...new Set(($categoryStructure || []).map(c => c.nhomHang).filter(Boolean))].sort();
    $: filteredGroups = availableGroups.filter(g => g.toLowerCase().includes(searchGroup.toLowerCase()));
    
    $: availableBrands = $brandList || [];
    $: filteredBrands = availableBrands.filter(b => b.toLowerCase().includes(searchBrand.toLowerCase()));

    // Reset khi mở modal
    $: if (isOpen) {
        if ($selectedWarehouse) {
            currentView = 'menu';
        }
    }

    function close() {
        modalState.update(s => ({ ...s, activeModal: null }));
        resetForm();
        currentView = 'menu';
    }

    // --- NAVIGATION ---
    function goToSpecialProgram() {
        modalState.update(s => ({ ...s, activeModal: 'user-special-program-modal' }));
    }

    function goToBrandCompetition() {
        // Nếu chưa có chương trình nào, vào thẳng form tạo mới
        if ($localCompetitionConfigs.length === 0) {
            openAddForm();
        } else {
            currentView = 'list';
        }
    }

    function backToMenu() { currentView = 'menu'; }
    function backToList() { currentView = 'list'; resetForm(); }

    // --- LOGIC FORM ---
    function resetForm() {
        formData = { 
            id: '', name: '', groups: [], brands: [], 
            type: 'doanhthu', minPrice: '', maxPrice: '', excludeApple: false 
        };
        editingIndex = -1;
        searchGroup = ''; searchBrand = '';
    }

    function openAddForm() { 
        resetForm(); 
        currentView = 'form';
    }

    function openEditForm(index) {
        // [FIX] Lấy từ localCompetitionConfigs
        const config = $localCompetitionConfigs[index];
        if (!config) return;
        
        editingIndex = index;
        formData = {
            id: config.id,
            name: config.name,
            groups: [...(config.groups || [])],
            brands: [...(config.brands || [])],
            type: config.type || 'doanhthu',
            minPrice: config.minPrice ? config.minPrice / 1000000 : '', 
            maxPrice: config.maxPrice ? config.maxPrice / 1000000 : '',
            excludeApple: config.excludeApple || false
        };
        currentView = 'form';
    }

    function toggleSelection(list, item) {
        return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    }

    async function saveProgram() {
        if (!$selectedWarehouse) return alert("Vui lòng chọn Kho trước!");
        if (!formData.name) return alert("Vui lòng nhập tên chương trình!");
        if (formData.brands.length === 0) return alert("Vui lòng chọn ít nhất một Hãng!");
        
        isLoading = true;
        
        const configToSave = {
            id: formData.id || `comp_${Date.now()}`,
            name: formData.name,
            groups: formData.groups,
            brands: formData.brands,
            type: formData.type,
            minPrice: formData.minPrice ? parseFloat(formData.minPrice) * 1000000 : 0,
            maxPrice: formData.maxPrice ? parseFloat(formData.maxPrice) * 1000000 : 0,
            excludeApple: formData.excludeApple,
            target: 0
        };

        // [FIX] Cập nhật vào localCompetitionConfigs
        let newConfigs = [...$localCompetitionConfigs];
        if (editingIndex >= 0) newConfigs[editingIndex] = configToSave;
        else newConfigs.push(configToSave);

        localCompetitionConfigs.set(newConfigs); // Update Store UI ngay lập tức

        try {
            // [FIX] Lưu vào Document của Kho (WarehouseData) thay vì Global Declarations
            await datasyncService.saveCompetitionConfigs($selectedWarehouse, newConfigs);
            if (currentView === 'form') backToList();
        } catch (error) {
            console.error(error);
            alert(`Lỗi lưu: ${error.message}`);
        } finally { 
            isLoading = false;
        }
    }

    async function deleteProgram(index) {
        if (!confirm("Xóa chương trình này?")) return;
        
        // [FIX] Xóa từ localCompetitionConfigs
        let newConfigs = [...$localCompetitionConfigs];
        newConfigs.splice(index, 1);
        localCompetitionConfigs.set(newConfigs);
        
        try {
            await datasyncService.saveCompetitionConfigs($selectedWarehouse, newConfigs);
        } catch(e) { console.error(e); }
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1100] backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]" on:click|stopPropagation>
            
            <div class="p-5 border-b border-gray-200 flex justify-between items-center bg-blue-50 rounded-t-xl">
                <div>
                    <h3 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                        <i data-feather="award"></i> 
                        {#if currentView === 'menu'}
                            Tạo chương trình thi đua
                        {:else if currentView === 'list'}
                            Danh sách Thi đua (Hãng)
                        {:else}
                            {editingIndex >= 0 ? 'Sửa chương trình' : 'Thêm chương trình mới'}
                        {/if}
                    </h3>
                    {#if $selectedWarehouse}
                        <p class="text-xs text-blue-600 mt-1">Kho đang chọn: <span class="font-bold">{$selectedWarehouse}</span></p>
                    {/if}
                </div>
                <button class="text-gray-500 hover:text-red-500 text-2xl leading-none" on:click={close}>&times;</button>
            </div>
            
            <div class="p-6 overflow-y-auto bg-slate-50/30 flex-grow">
                {#if !$selectedWarehouse}
                    <div class="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-yellow-700 font-semibold">Vui lòng chọn Kho ở tab "Cập nhật dữ liệu" trước.</p>
                    </div>

                {:else if currentView === 'menu'}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <button 
                            class="flex flex-col items-center justify-center p-8 bg-white border-2 border-blue-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-500 hover:bg-blue-50 transition group"
                            on:click={goToBrandCompetition}
                        >
                            <div class="p-4 bg-blue-100 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <i data-feather="briefcase" class="w-8 h-8"></i>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800 group-hover:text-blue-700">Thi đua theo Hãng</h4>
                            <p class="text-sm text-gray-500 text-center mt-2">Tạo thi đua dựa trên doanh số của các Hãng (Apple, Samsung...).</p>
                        </button>

                        <button 
                            class="flex flex-col items-center justify-center p-8 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:shadow-md hover:border-purple-500 hover:bg-purple-50 transition group"
                            on:click={goToSpecialProgram}
                        >
                            <div class="p-4 bg-purple-100 rounded-full text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <i data-feather="star" class="w-8 h-8"></i>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800 group-hover:text-purple-700">Thi đua Đặc Quyền</h4>
                            <p class="text-sm text-gray-500 text-center mt-2">Theo dõi các sản phẩm trọng tâm (SPĐQ) được chỉ định riêng.</p>
                        </button>
                    </div>

                {:else if currentView === 'list'}
                    <div class="mb-4">
                        <button on:click={backToMenu} class="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4">
                            <i data-feather="arrow-left" class="w-4 h-4"></i> Quay lại chọn loại
                        </button>
                    </div>

                    <div class="space-y-3">
                        {#if $localCompetitionConfigs.length === 0}
                            <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <p class="text-gray-500 mb-2">Chưa có chương trình nào.</p>
                                <button on:click={openAddForm} class="text-blue-600 font-bold hover:underline">+ Tạo mới ngay</button>
                            </div>
                        {:else}
                            {#each $localCompetitionConfigs as config, index}
                                <div class="flex justify-between items-start p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition group/item">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h4 class="font-bold text-gray-800 text-base">{config.name}</h4>
                                            <span class="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border {config.type === 'doanhthu' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}">
                                                {config.type === 'doanhthu' ? 'Doanh thu' : 'Số lượng'}
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1.5 flex flex-wrap gap-y-1 gap-x-4">
                                            <span><strong>Hãng:</strong> {config.brands.join(', ')}</span>
                                            {#if config.groups.length > 0}
                                                <span><strong>Nhóm:</strong> {config.groups.join(', ')}</span>
                                            {/if}
                                            {#if config.excludeApple}
                                                <span class="text-red-500 font-medium">No Apple</span>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button on:click={() => openEditForm(index)} class="p-2 text-blue-600 hover:bg-blue-50 rounded"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                                        <button on:click={() => deleteProgram(index)} class="p-2 text-red-600 hover:bg-red-50 rounded"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                                    </div>
                                </div>
                            {/each}
                             <button on:click={openAddForm} class="w-full py-3 mt-2 border-2 border-dashed border-blue-200 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition flex justify-center items-center gap-2">
                                <i data-feather="plus-circle" class="w-4 h-4"></i> Thêm chương trình mới
                            </button>
                        {/if}
                    </div>

                {:else if currentView === 'form'}
                    <div class="bg-white p-5 rounded-lg border border-blue-100 shadow-sm">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-bold text-lg text-slate-700">{editingIndex >= 0 ? 'Chỉnh sửa' : 'Thêm mới'}</h3>
                            <button on:click={backToList} class="text-sm text-gray-500 hover:underline">Hủy bỏ</button>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Tên chương trình</label>
                                <input type="text" bind:value={formData.name} class="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Thi đua Tivi Sony...">
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 mb-1">Hãng sản xuất <span class="text-red-500">*</span></label>
                                    <input type="text" bind:value={searchBrand} class="w-full mb-2 p-2 border rounded text-xs" placeholder="🔍 Tìm hãng..." />
                                    <div class="h-40 overflow-y-auto p-2 border rounded bg-slate-50 grid grid-cols-1 gap-1 custom-scrollbar">
                                        {#each filteredBrands as brand}
                                            <label class="flex items-center space-x-2 text-xs cursor-pointer hover:bg-white p-1 rounded border border-transparent hover:border-gray-200">
                                                <input type="checkbox" checked={formData.brands.includes(brand)} on:change={() => formData.brands = toggleSelection(formData.brands, brand)} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300">
                                                <span class="text-slate-700 truncate" title={brand}>{brand}</span>
                                            </label>
                                        {/each}
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 mb-1">Nhóm hàng (Tùy chọn)</label>
                                    <input type="text" bind:value={searchGroup} class="w-full mb-2 p-2 border rounded text-xs" placeholder="🔍 Tìm nhóm hàng..." />
                                    <div class="h-40 overflow-y-auto p-2 border rounded bg-slate-50 grid grid-cols-1 gap-1 custom-scrollbar">
                                        {#each filteredGroups as group}
                                            <label class="flex items-center space-x-2 text-xs cursor-pointer hover:bg-white p-1 rounded border border-transparent hover:border-gray-200">
                                                <input type="checkbox" checked={formData.groups.includes(group)} on:change={() => formData.groups = toggleSelection(formData.groups, group)} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300">
                                                <span class="text-slate-700 truncate" title={group}>{group}</span>
                                            </label>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Loại đo lường</label>
                                    <select bind:value={formData.type} class="w-full p-2 border border-slate-300 rounded-md text-sm bg-white">
                                        <option value="doanhthu">Theo Doanh thu</option>
                                        <option value="soluong">Theo Số lượng</option>
                                    </select>
                                </div>
                                {#if formData.type === 'soluong'}
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Giá từ (Tr)</label>
                                        <input type="number" bind:value={formData.minPrice} class="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="VD: 3">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Giá đến (Tr)</label>
                                        <input type="number" bind:value={formData.maxPrice} class="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="VD: 10">
                                    </div>
                                {/if}
                            </div>

                            <div class="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="exclude-apple" bind:checked={formData.excludeApple} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4">
                                <label for="exclude-apple" class="text-sm text-slate-700 cursor-pointer select-none">Trừ hãng Apple khỏi dữ liệu so sánh</label>
                            </div>

                            <div class="flex justify-end gap-3 pt-4 border-t mt-4">
                                <button on:click={backToList} class="px-4 py-2 text-gray-600 bg-white border rounded hover:bg-gray-50">Hủy</button>
                                <button on:click={saveProgram} class="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu'}</button>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}