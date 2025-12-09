<script>
    import { onMount } from 'svelte';
    import { categoryStructure, macroProductGroupConfig } from '../../../stores.js';
    import { adminService } from '../../../services/admin.service.js';
    import { cleanCategoryName } from '../../../utils.js';

    let localConfigs = []; 
    let isSaving = false;
    let editingId = null; 
    let itemSearch = '';

    // [MỚI] Lấy danh sách Nhóm Hàng (Product Group) để tick chọn
    $: rawProductGroups = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))].sort();
    
    $: if ($macroProductGroupConfig) {
        localConfigs = JSON.parse(JSON.stringify($macroProductGroupConfig));
    }

    function addGroup() {
        const name = prompt("Nhập tên Nhóm Hàng Lớn (VD: Điện thoại & Laptop, Gia dụng lớn...):");
        if (name && name.trim()) {
            const id = 'macro_pg_' + Date.now();
            localConfigs = [...localConfigs, { id, name: name.trim(), items: [] }];
            editingId = id; 
        }
    }

    function removeGroup(id) {
        if (!confirm("Bạn có chắc muốn xóa nhóm này?")) return;
        localConfigs = localConfigs.filter(g => g.id !== id);
    }

    function toggleItem(groupId, itemName) {
        const groupIndex = localConfigs.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        const currentItems = new Set(localConfigs[groupIndex].items || []);
        if (currentItems.has(itemName)) {
            currentItems.delete(itemName);
        } else {
            currentItems.add(itemName);
        }
        localConfigs[groupIndex].items = [...currentItems];
    }

    async function handleSave() {
        isSaving = true;
        try {
            await adminService.saveMacroProductGroupConfig(localConfigs);
            macroProductGroupConfig.set(localConfigs);
        } catch (e) {
            alert(e.message);
        } finally {
            isSaving = false;
        }
    }

    // Filter items cho việc chọn
    $: filteredRawGroups = rawProductGroups.filter(g => g.toLowerCase().includes(itemSearch.toLowerCase()));
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center mb-4">
        <p class="text-sm text-gray-500">
            Định nghĩa các nhóm hàng lớn (VD: Gom "Nồi cơm", "Bếp ga" vào nhóm "Gia dụng nhà bếp").
            <br><span class="text-xs text-orange-600 font-semibold">* Lưu ý: Danh sách dưới đây là các Nhóm Hàng (Product Group).</span>
        </p>
        <div class="flex gap-2">
            <button 
                class="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition"
                on:click={addGroup}
            >
                + Thêm Nhóm Hàng Lớn
            </button>
            <button 
                class="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                on:click={handleSave}
                disabled={isSaving}
            >
                {#if isSaving}Lưu...{:else}Lưu Cấu Hình{/if}
            </button>
        </div>
    </div>

    {#if localConfigs.length === 0}
        <div class="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <p class="text-gray-400">Chưa có nhóm nào. Hãy bấm "Thêm Nhóm Hàng Lớn".</p>
        </div>
    {:else}
        <div class="grid gap-4">
            {#each localConfigs as group (group.id)}
                <div class="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                    <div 
                        class="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
                        on:click={() => editingId = (editingId === group.id ? null : group.id)}
                    >
                        <div class="flex items-center gap-2">
                            <span class="transform transition-transform {editingId === group.id ? 'rotate-90' : ''}">▶</span>
                            <h4 class="font-bold text-slate-700">{group.name}</h4>
                            <span class="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                {group.items?.length || 0} mục
                            </span>
                        </div>
                        <button 
                            class="text-red-500 hover:text-red-700 p-1"
                            on:click|stopPropagation={() => removeGroup(group.id)}
                            title="Xóa nhóm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>

                    {#if editingId === group.id}
                        <div class="p-4 border-t border-gray-200 bg-white animate-fade-in">
                            <div class="mb-2">
                                <input 
                                    type="text" 
                                    class="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition outline-none focus:ring-1 focus:ring-teal-500" 
                                    placeholder="🔍 Tìm kiếm nhóm hàng..." 
                                    bind:value={itemSearch}
                                />
                            </div>
                            
                            <div class="max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 custom-scrollbar">
                                {#each filteredRawGroups as rawItem}
                                    {@const isChecked = group.items.includes(rawItem)}
                                    <label class="flex items-center gap-2 p-1.5 rounded border {isChecked ? 'bg-teal-50 border-teal-200' : 'border-transparent hover:bg-gray-50'} cursor-pointer transition">
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            on:change={() => toggleItem(group.id, rawItem)}
                                            class="rounded text-teal-600 focus:ring-teal-500"
                                        />
                                        <span class="text-xs text-gray-700 truncate" title={rawItem}>
                                            {rawItem}
                                        </span>
                                    </label>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>