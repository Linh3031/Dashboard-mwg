<script>
    import { onMount, afterUpdate } from 'svelte';
    import { globalCompetitionConfigs, brandList, categoryStructure } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let isFormOpen = false;
    let editingIndex = -1;
    let isLoading = false;

    let formData = {
        id: '', name: '', brands: [], groups: [], type: 'doanhthu',
        minPrice: '', maxPrice: '', excludeApple: false
    };

    $: availableBrands = $brandList || [];
    $: availableGroups = [...new Set(($categoryStructure || []).map(c => c.nhomHang).filter(Boolean))].sort();

    function resetForm() {
        formData = { id: '', name: '', brands: [], groups: [], type: 'doanhthu', minPrice: '', maxPrice: '', excludeApple: false };
        editingIndex = -1;
    }

    function openAddForm() { resetForm(); isFormOpen = true; }
    
    function openEditForm(index) {
        const config = $globalCompetitionConfigs[index];
        editingIndex = index;
        formData = {
            id: config.id, name: config.name, brands: [...(config.brands || [])], groups: [...(config.groups || [])],
            type: config.type || 'doanhthu',
            minPrice: config.minPrice ? config.minPrice / 1000000 : '',
            maxPrice: config.maxPrice ? config.maxPrice / 1000000 : '',
            excludeApple: config.excludeApple || false
        };
        isFormOpen = true;
    }

    function closeForm() { isFormOpen = false; resetForm(); }

    function toggleSelection(list, item) {
        return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    }

    async function saveCompetition() {
        if (!formData.name) return alert("Vui lòng nhập tên chương trình!");
        if (formData.brands.length === 0) return alert("Vui lòng chọn ít nhất một Hãng!");

        isLoading = true;
        const configToSave = {
            id: formData.id || `comp_${Date.now()}`,
            name: formData.name, brands: formData.brands, groups: formData.groups,
            type: formData.type,
            minPrice: formData.minPrice ? parseFloat(formData.minPrice) * 1000000 : 0,
            maxPrice: formData.maxPrice ? parseFloat(formData.maxPrice) * 1000000 : 0,
            excludeApple: formData.excludeApple
        };

        let newConfigs = [...$globalCompetitionConfigs];
        if (editingIndex >= 0) newConfigs[editingIndex] = configToSave;
        else newConfigs.push(configToSave);

        try {
            await adminService.saveGlobalCompetitionConfigs(newConfigs);
            globalCompetitionConfigs.set(newConfigs);
            // BACKUP TO LOCALSTORAGE (TEST MODE)
            localStorage.setItem('temp_globalCompetitionConfigs', JSON.stringify(newConfigs));
            closeForm();
        } catch (error) {
            alert("Lỗi khi lưu: " + error.message);
        } finally { isLoading = false; }
    }

    async function deleteCompetition(index) {
        if (!confirm("Bạn có chắc chắn muốn xóa chương trình này?")) return;
        let newConfigs = [...$globalCompetitionConfigs];
        newConfigs.splice(index, 1);
        try {
            await adminService.saveGlobalCompetitionConfigs(newConfigs);
            globalCompetitionConfigs.set(newConfigs);
             // BACKUP TO LOCALSTORAGE
             localStorage.setItem('temp_globalCompetitionConfigs', JSON.stringify(newConfigs));
        } catch (error) { alert("Lỗi khi xóa: " + error.message); }
    }

    // Load backup for testing
    onMount(() => {
        if ($globalCompetitionConfigs.length === 0) {
            const backup = localStorage.getItem('temp_globalCompetitionConfigs');
            if (backup) globalCompetitionConfigs.set(JSON.parse(backup));
        }
    });

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group" open> 
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-red-50 rounded-lg text-red-600">
                    <i data-feather="flag"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="font-bold text-slate-700 text-lg">Quản lý Thi Đua (Global)</h3>
                        <span class="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Quan trọng</span>
                    </div>
                    <p class="text-xs text-slate-500">Cấu hình các chương trình thi đua áp dụng toàn hệ thống</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary> 
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/30"> 
            
            {#if !isFormOpen}
                <div class="space-y-3">
                    {#if $globalCompetitionConfigs.length === 0}
                        <div class="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                            <p class="text-slate-400 italic mb-3">Chưa có chương trình nào.</p>
                            <button on:click={openAddForm} class="text-sm text-blue-600 font-semibold hover:underline">
                                + Tạo chương trình đầu tiên
                            </button>
                        </div>
                    {:else}
                        {#each $globalCompetitionConfigs as config, index}
                            <div class="flex justify-between items-start p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition group/item">
                                <div>
                                    <h4 class="font-bold text-slate-800 text-base flex items-center gap-2">
                                        {config.name}
                                        <span class="text-[10px] uppercase px-1.5 py-0.5 rounded border {config.type === 'doanhthu' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}">
                                            {config.type === 'doanhthu' ? 'Doanh thu' : 'Số lượng'}
                                        </span>
                                    </h4>
                                    <div class="text-xs text-slate-500 mt-2 space-y-1">
                                        <p class="flex items-center gap-1"><i data-feather="briefcase" class="w-3 h-3"></i> <span class="font-semibold">Hãng:</span> {config.brands.join(', ')}</p>
                                        <p class="flex items-center gap-1"><i data-feather="layers" class="w-3 h-3"></i> <span class="font-semibold">Nhóm:</span> {config.groups.length > 0 ? config.groups.join(', ') : 'Tất cả'}</p>
                                    </div>
                                </div>
                                <div class="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button on:click={() => openEditForm(index)} class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Sửa">
                                        <i data-feather="edit-2" class="w-4 h-4"></i>
                                    </button>
                                    <button on:click={() => deleteCompetition(index)} class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Xóa">
                                        <i data-feather="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        {/each}
                        
                        <button on:click={openAddForm} class="w-full py-3 mt-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 font-semibold transition flex justify-center items-center gap-2">
                            <i data-feather="plus-circle" class="w-4 h-4"></i> Thêm chương trình mới
                        </button>
                    {/if}
                </div>
            {:else}
                <div class="bg-white p-6 rounded-xl border border-blue-100 shadow-lg animate-fade-in relative">
                    <button on:click={closeForm} class="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <i data-feather="x" class="w-5 h-5"></i>
                    </button>

                    <h3 class="font-bold text-lg mb-6 text-slate-800 flex items-center gap-2">
                        <span class="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><i data-feather={editingIndex >= 0 ? "edit" : "plus"} class="w-4 h-4"></i></span>
                        {editingIndex >= 0 ? 'Chỉnh sửa chương trình' : 'Thêm chương trình mới'}
                    </h3>
                    
                    <div class="space-y-5">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-1">Tên chương trình</label>
                            <input type="text" bind:value={formData.name} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="VD: Thi đua Tivi Sony T9...">
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Hãng sản xuất (Bắt buộc)</label>
                            <div class="max-h-40 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {#each availableBrands as brand}
                                    <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition">
                                        <input type="checkbox" 
                                            checked={formData.brands.includes(brand)} 
                                            on:change={() => formData.brands = toggleSelection(formData.brands, brand)}
                                            class="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                        >
                                        <span class="text-slate-700">{brand}</span>
                                    </label>
                                {/each}
                                {#if availableBrands.length === 0}
                                    <p class="col-span-3 text-slate-400 text-xs italic text-center">Vui lòng upload file Cấu trúc ngành hàng trước.</p>
                                {/if}
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Nhóm hàng áp dụng</label>
                            <div class="max-h-40 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {#each availableGroups as group}
                                    <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition">
                                        <input type="checkbox" 
                                            checked={formData.groups.includes(group)} 
                                            on:change={() => formData.groups = toggleSelection(formData.groups, group)}
                                            class="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                        >
                                        <span class="text-slate-700">{group}</span>
                                    </label>
                                {/each}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Loại đo lường</label>
                                <select bind:value={formData.type} class="w-full p-2 border border-slate-300 rounded-md text-sm bg-white">
                                    <option value="doanhthu">Theo Doanh thu</option>
                                    <option value="soluong">Theo Số lượng</option>
                                </select>
                            </div>
                            {#if formData.type === 'soluong'}
                                <div class="animate-fade-in">
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Giá từ (Triệu)</label>
                                    <input type="number" bind:value={formData.minPrice} class="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="VD: 3">
                                </div>
                                <div class="animate-fade-in">
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Giá đến (Triệu)</label>
                                    <input type="number" bind:value={formData.maxPrice} class="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="VD: 10">
                                </div>
                            {/if}
                        </div>

                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="exclude-apple" bind:checked={formData.excludeApple} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4">
                            <label for="exclude-apple" class="text-sm text-slate-700 cursor-pointer font-medium">Trừ hãng Apple khỏi dữ liệu</label>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                        <button on:click={closeForm} class="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium" disabled={isLoading}>Hủy bỏ</button>
                        <button on:click={saveCompetition} class="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-md disabled:opacity-70" disabled={isLoading}>
                            {#if isLoading}<span class="animate-spin">↻</span>{/if}
                            {!isLoading ? 'Lưu Chương trình' : 'Đang lưu...'}
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </details>
</div>