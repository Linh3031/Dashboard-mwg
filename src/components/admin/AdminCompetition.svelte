<script>
    import { onMount, afterUpdate } from 'svelte';
    import { globalCompetitionConfigs, brandList, categoryStructure } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let isFormOpen = false;
    let editingIndex = -1;
    let isLoading = false;

    // Biến tìm kiếm
    let searchBrand = '';
    let searchGroup = '';

    let formData = { id: '', name: '', brands: [], groups: [], type: 'doanhthu', minPrice: '', maxPrice: '', excludeApple: false };

    $: availableBrands = $brandList || [];
    $: availableGroups = [...new Set(($categoryStructure || []).map(c => c.nhomHang).filter(Boolean))].sort();

    // Lọc danh sách dựa trên từ khóa tìm kiếm
    $: filteredBrands = availableBrands.filter(b => b.toLowerCase().includes(searchBrand.toLowerCase()));
    $: filteredGroups = availableGroups.filter(g => g.toLowerCase().includes(searchGroup.toLowerCase()));

    function resetForm() {
        formData = { id: '', name: '', brands: [], groups: [], type: 'doanhthu', minPrice: '', maxPrice: '', excludeApple: false };
        editingIndex = -1;
        searchBrand = '';
        searchGroup = '';
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
    function toggleSelection(list, item) { return list.includes(item) ? list.filter(i => i !== item) : [...list, item]; }

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
        if (editingIndex >= 0) newConfigs[editingIndex] = configToSave; else newConfigs.push(configToSave);

        // Cập nhật UI ngay lập tức
        globalCompetitionConfigs.set(newConfigs);
        localStorage.setItem('temp_globalCompetitionConfigs', JSON.stringify(newConfigs)); // Backup LocalStorage

        try {
            await adminService.saveGlobalCompetitionConfigs(newConfigs);
        } catch (error) { 
            console.error("Lỗi Cloud:", error);
            alert(`Lưu Cloud thất bại (${error.code}). Dữ liệu đã được lưu vào trình duyệt để bạn test.`);
        } finally { 
            isLoading = false; 
            closeForm();
        }
    }

    async function deleteCompetition(index) {
        if (!confirm("Xóa chương trình này?")) return;
        let newConfigs = [...$globalCompetitionConfigs];
        newConfigs.splice(index, 1);
        
        globalCompetitionConfigs.set(newConfigs);
        localStorage.setItem('temp_globalCompetitionConfigs', JSON.stringify(newConfigs));

        try {
            await adminService.saveGlobalCompetitionConfigs(newConfigs);
        } catch (error) { 
             console.error("Lỗi Cloud:", error);
             // Không alert lỗi xóa để trải nghiệm mượt hơn, vì đã xóa ở local
        }
    }

    onMount(() => {
        if ($globalCompetitionConfigs.length === 0) {
            const backup = localStorage.getItem('temp_globalCompetitionConfigs');
            if (backup) globalCompetitionConfigs.set(JSON.parse(backup));
        }
    });
    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <div class="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <div class="p-2.5 bg-red-50 rounded-lg text-red-600 shadow-sm">
                <i data-feather="flag" class="w-6 h-6"></i>
            </div>
            <div>
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-slate-800 text-lg">Quản lý Thi Đua (Global)</h3>
                    <span class="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide border border-red-200">Quan trọng</span>
                </div>
                <p class="text-sm text-slate-500 mt-0.5">Cấu hình các chương trình thi đua áp dụng cho toàn hệ thống</p>
            </div>
        </div>
    </div>
    
    <div class="p-6 bg-slate-50/30"> 
        {#if !isFormOpen}
            <div class="space-y-3">
                {#if $globalCompetitionConfigs.length === 0}
                    <div class="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p class="text-slate-400 italic mb-4">Chưa có chương trình thi đua nào.</p>
                        <button on:click={openAddForm} class="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:border-blue-500 hover:text-blue-600 font-medium transition shadow-sm">
                            + Tạo chương trình đầu tiên
                        </button>
                    </div>
                {:else}
                    {#each $globalCompetitionConfigs as config, index}
                        <div class="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition group/item">
                            <div>
                                <div class="flex items-center gap-3">
                                    <h4 class="font-bold text-slate-800 text-base">{config.name}</h4>
                                    <span class="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border {config.type === 'doanhthu' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}">
                                        {config.type === 'doanhthu' ? 'Doanh thu' : 'Số lượng'}
                                    </span>
                                </div>
                                <div class="text-xs text-slate-500 mt-1.5 flex items-center gap-4">
                                    <span class="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded"><i data-feather="briefcase" class="w-3 h-3"></i> {config.brands.join(', ')}</span>
                                    <span class="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded"><i data-feather="layers" class="w-3 h-3"></i> {config.groups.length > 0 ? config.groups.join(', ') : 'Tất cả nhóm'}</span>
                                </div>
                            </div>
                            <div class="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                                <button on:click={() => openEditForm(index)} class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Sửa"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                                <button on:click={() => deleteCompetition(index)} class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Xóa"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                    {/each}
                    <button on:click={openAddForm} class="w-full py-3 mt-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 font-semibold transition flex justify-center items-center gap-2">
                        <i data-feather="plus-circle" class="w-5 h-5"></i> Thêm chương trình mới
                    </button>
                {/if}
            </div>
        {:else}
            <div class="bg-white p-6 rounded-xl border border-blue-100 shadow-lg animate-fade-in relative">
                <button on:click={closeForm} class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition">
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

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Hãng sản xuất (Bắt buộc)</label>
                            <input type="text" bind:value={searchBrand} class="w-full mb-2 p-2 border rounded text-xs" placeholder="🔍 Tìm hãng..." />
                            <div class="h-40 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-2 gap-2 custom-scrollbar">
                                {#each filteredBrands as brand}
                                    <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-1.5 rounded-md transition border border-transparent hover:border-slate-200">
                                        <input type="checkbox" checked={formData.brands.includes(brand)} on:change={() => formData.brands = toggleSelection(formData.brands, brand)} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300">
                                        <span class="text-slate-700 truncate" title={brand}>{brand}</span>
                                    </label>
                                {/each}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Nhóm hàng</label>
                            <input type="text" bind:value={searchGroup} class="w-full mb-2 p-2 border rounded text-xs" placeholder="🔍 Tìm nhóm hàng..." />
                            <div class="h-40 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-1 gap-2 custom-scrollbar">
                                {#each filteredGroups as group}
                                    <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-1.5 rounded-md transition border border-transparent hover:border-slate-200">
                                        <input type="checkbox" checked={formData.groups.includes(group)} on:change={() => formData.groups = toggleSelection(formData.groups, group)} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300">
                                        <span class="text-slate-700 truncate" title={group}>{group}</span>
                                    </label>
                                {/each}
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Loại đo lường</label>
                            <select bind:value={formData.type} class="w-full p-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500">
                                <option value="doanhthu">Theo Doanh thu</option>
                                <option value="soluong">Theo Số lượng</option>
                            </select>
                        </div>
                        {#if formData.type === 'soluong'}
                            <div class="animate-fade-in">
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Giá từ (Tr)</label>
                                <input type="number" bind:value={formData.minPrice} class="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" placeholder="VD: 3">
                            </div>
                            <div class="animate-fade-in">
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Giá đến (Tr)</label>
                                <input type="number" bind:value={formData.maxPrice} class="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500" placeholder="VD: 10">
                            </div>
                        {/if}
                    </div>
                    <div class="flex items-center gap-2 pl-1">
                        <input type="checkbox" id="exclude-apple" bind:checked={formData.excludeApple} class="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4">
                        <label for="exclude-apple" class="text-sm text-slate-700 cursor-pointer font-medium select-none">Trừ hãng Apple khỏi dữ liệu</label>
                    </div>
                    <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                        <button on:click={closeForm} class="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium" disabled={isLoading}>Hủy bỏ</button>
                        <button on:click={saveCompetition} class="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-md disabled:opacity-70" disabled={isLoading}>
                            {#if isLoading}<span class="animate-spin">↻</span>{/if}
                            {!isLoading ? 'Lưu Chương trình' : 'Đang lưu...'}
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>