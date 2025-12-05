<script>
    import { onMount } from 'svelte';
    import { 
        modalState, 
        globalSpecialPrograms, // Dùng chung store này nhưng lưu theo kho
        categoryStructure,
        selectedWarehouse
    } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';

    $: isOpen = $modalState.activeModal === 'user-special-program-modal';

    let isFormOpen = false;
    let editingIndex = -1;
    let isLoading = false;
    
    let formData = { id: '', name: '', groups: [] };
    let searchGroup = '';

    // Lấy danh sách nhóm hàng
    $: availableGroups = [...new Set(($categoryStructure || []).map(c => c.nhomHang).filter(Boolean))].sort();
    $: filteredGroups = availableGroups.filter(g => g.toLowerCase().includes(searchGroup.toLowerCase()));

    // Tải config khi mở modal và đã chọn kho
    $: if (isOpen && $selectedWarehouse) {
        loadConfigs();
    }

    async function loadConfigs() {
        // (Logic tải từ cloud sẽ được bổ sung vào datasyncService sau, tạm thời dùng store local)
        // Để đơn giản cho user, ta dùng chung biến globalSpecialPrograms nhưng cơ chế lưu sẽ là theo Kho
    }

    function close() {
        modalState.update(s => ({ ...s, activeModal: null }));
        closeForm();
    }

    function resetForm() {
        formData = { id: '', name: '', groups: [] };
        editingIndex = -1;
        searchGroup = '';
    }

    function openAddForm() { resetForm(); isFormOpen = true; }

    function openEditForm(index) {
        const config = $globalSpecialPrograms[index];
        editingIndex = index;
        formData = {
            id: config.id,
            name: config.name,
            groups: [...(config.groups || [])]
        };
        isFormOpen = true;
    }

    function closeForm() { isFormOpen = false; resetForm(); }

    function toggleSelection(list, item) {
        return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    }

    async function saveProgram() {
        if (!$selectedWarehouse) return alert("Vui lòng chọn Kho ở tab Cập nhật dữ liệu trước!");
        if (!formData.name) return alert("Vui lòng nhập tên chương trình!");
        if (formData.groups.length === 0) return alert("Vui lòng chọn ít nhất một Nhóm hàng!");

        isLoading = true;
        const configToSave = {
            id: formData.id || `sp_${Date.now()}`,
            name: formData.name,
            groups: formData.groups
        };

        let newConfigs = [...$globalSpecialPrograms];
        if (editingIndex >= 0) newConfigs[editingIndex] = configToSave;
        else newConfigs.push(configToSave);

        // Cập nhật UI
        globalSpecialPrograms.set(newConfigs);

        // Lưu Cloud (Datasync)
        try {
            // Ta sẽ dùng chung hàm saveCompetitionConfigs nhưng lưu vào key khác (ví dụ 'specialPrograms')
            // Để đơn giản, ở đây tạm thời lưu vào local, bước sau tôi sẽ update datasync
            await datasyncService.saveSpecialPrograms($selectedWarehouse, newConfigs); 
            closeForm();
        } catch (error) {
            console.error(error);
            alert(`Lỗi lưu Cloud (${error.message}). Đã lưu tạm vào trình duyệt.`);
        } finally { isLoading = false; }
    }

    async function deleteProgram(index) {
        if (!confirm("Xóa chương trình này?")) return;
        let newConfigs = [...$globalSpecialPrograms];
        newConfigs.splice(index, 1);
        globalSpecialPrograms.set(newConfigs);
        
        try {
            await datasyncService.saveSpecialPrograms($selectedWarehouse, newConfigs); 
        } catch(e) { console.error(e); }
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1100] backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]" on:click|stopPropagation>
            <div class="p-5 border-b border-gray-200 flex justify-between items-center bg-purple-50 rounded-t-xl">
                <div>
                    <h3 class="text-lg font-bold text-purple-800 flex items-center gap-2">
                        <i data-feather="star"></i> Quản lý SP Đặc Quyền (User)
                    </h3>
                    <p class="text-xs text-purple-600 mt-1">Dữ liệu đồng bộ cho kho: <span class="font-bold">{$selectedWarehouse || '(Chưa chọn kho)'}</span></p>
                </div>
                <button class="text-gray-500 hover:text-red-500 text-2xl leading-none" on:click={close}>&times;</button>
            </div>
            
            <div class="p-6 overflow-y-auto">
                {#if !$selectedWarehouse}
                    <div class="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-yellow-700 font-semibold">Vui lòng chọn Kho ở tab "Cập nhật dữ liệu" để sử dụng tính năng này.</p>
                    </div>
                {:else if !isFormOpen}
                    <div class="space-y-3">
                        {#if $globalSpecialPrograms.length === 0}
                            <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <p class="text-gray-500 mb-2">Chưa có chương trình SPĐQ nào.</p>
                                <button on:click={openAddForm} class="text-purple-600 font-bold hover:underline">+ Tạo chương trình đầu tiên</button>
                            </div>
                        {:else}
                            {#each $globalSpecialPrograms as config, index}
                                <div class="flex justify-between items-start p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                                    <div>
                                        <h4 class="font-bold text-gray-800 text-lg">{config.name}</h4>
                                        <div class="text-sm text-gray-600 mt-1">
                                            <p><strong>Nhóm hàng:</strong> {config.groups.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button on:click={() => openEditForm(index)} class="p-2 text-blue-600 hover:bg-blue-50 rounded"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                                        <button on:click={() => deleteProgram(index)} class="p-2 text-red-600 hover:bg-red-50 rounded"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                                    </div>
                                </div>
                            {/each}
                             <button on:click={openAddForm} class="w-full py-3 mt-2 border-2 border-dashed border-purple-200 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition flex justify-center items-center gap-2">
                                <i data-feather="plus-circle" class="w-4 h-4"></i> Thêm chương trình SPĐQ
                            </button>
                        {/if}
                    </div>
                {:else}
                    <div class="bg-slate-50 p-5 rounded-lg border border-slate-200">
                        <h3 class="font-bold text-lg mb-4 text-slate-700">{editingIndex >= 0 ? 'Chỉnh sửa' : 'Thêm mới'}</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Tên chương trình</label>
                                <input type="text" bind:value={formData.name} class="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none" placeholder="VD: Tivi Đặc Quyền...">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">Chọn Nhóm hàng</label>
                                <input type="text" bind:value={searchGroup} class="w-full mb-2 p-2 border rounded text-xs" placeholder="🔍 Tìm nhóm hàng..." />
                                <div class="h-48 overflow-y-auto p-2 border rounded bg-white grid grid-cols-1 gap-1 custom-scrollbar">
                                    {#each filteredGroups as group}
                                        <label class="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" checked={formData.groups.includes(group)} on:change={() => formData.groups = toggleSelection(formData.groups, group)} class="rounded text-purple-600 focus:ring-purple-500 border-slate-300"><span>{group}</span></label>
                                    {/each}
                                </div>
                            </div>
                            <div class="flex justify-end gap-3 pt-4">
                                <button on:click={closeForm} class="px-4 py-2 text-gray-600 bg-white border rounded hover:bg-gray-50">Hủy</button>
                                <button on:click={saveProgram} class="px-4 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 disabled:opacity-50" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu'}</button>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}