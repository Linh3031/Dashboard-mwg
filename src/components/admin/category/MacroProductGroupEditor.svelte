<script>
    import { onMount } from 'svelte';
    import { categoryStructure, macroProductGroupConfig, virtualProductList } from '../../../stores.js';
    import { adminService } from '../../../services/admin.service.js';
    import { categoryService } from '../../../services/declarations/category.service.js';
    import { parseIdentity } from '../../../utils.js';

    let localConfigs = []; 
    let isSaving = false;
    let editingId = null; 
    let itemSearch = '';
    let selectorMode = 'group'; // 'group' | 'product'

    onMount(async () => {
        if (!$virtualProductList || $virtualProductList.length === 0) {
            const list = await categoryService.loadVirtualProductList();
            virtualProductList.set(list);
        }
    });

    $: rawProductGroupsWithId = (() => {
        const map = new Map();
        ($categoryStructure || []).forEach(c => {
            if(!c.nhomHang) return;
            const parsed = parseIdentity(c.nhomHang);
            if (parsed.id && parsed.id !== 'unknown') {
                map.set(parsed.id, { 
                    id: parsed.id, 
                    display: `${parsed.id} - ${parsed.name}` 
                });
            }
        });
        return Array.from(map.values()).sort((a,b) => a.display.localeCompare(b.display));
    })();
    
    $: if ($macroProductGroupConfig) {
        localConfigs = JSON.parse(JSON.stringify($macroProductGroupConfig));
    }

    function addGroup() {
        const name = prompt("Nhập tên Nhóm Hàng Lớn (VD: Bảo dưỡng MLN, Gia dụng lớn...):");
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

    function toggleItem(groupId, itemId) {
        const groupIndex = localConfigs.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        const currentItems = new Set(localConfigs[groupIndex].items || []);
        if (currentItems.has(itemId)) {
            currentItems.delete(itemId);
        } else {
            currentItems.add(itemId);
        }
        localConfigs[groupIndex].items = [...currentItems];
    }

    // --- TÍNH NĂNG CHỌN / BỎ CHỌN NHANH ---
    function selectAllFiltered(groupId) {
        const groupIndex = localConfigs.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;
        const currentItems = new Set(localConfigs[groupIndex].items || []);
        filteredRawGroups.forEach(item => currentItems.add(item.id));
        localConfigs[groupIndex].items = [...currentItems];
    }

    function deselectAllFiltered(groupId) {
        const groupIndex = localConfigs.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;
        const currentItems = new Set(localConfigs[groupIndex].items || []);
        filteredRawGroups.forEach(item => currentItems.delete(item.id));
        localConfigs[groupIndex].items = [...currentItems];
    }

    function clearSelection(groupId) {
        const groupIndex = localConfigs.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;
        
        if (confirm(`Bạn muốn xóa sạch TẤT CẢ danh sách chọn của nhóm "${localConfigs[groupIndex].name}"?`)) {
            localConfigs[groupIndex].items = [];
        }
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

    $: filteredRawGroups = (() => {
        const term = itemSearch.toLowerCase();
        if (selectorMode === 'group') {
            return rawProductGroupsWithId.filter(g => g.display.toLowerCase().includes(term));
        } else {
            return ($virtualProductList || [])
                .filter(p => p.display.toLowerCase().includes(term))
                .map(p => ({ id: p.maSanPham, display: p.display }));
        }
    })();
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center mb-4">
        <p class="text-sm text-gray-500">
            Định nghĩa các nhóm hàng lớn (VD: Gom "Nồi cơm", "Bếp ga" vào nhóm "Gia dụng nhà bếp").
            <br><span class="text-xs text-orange-600 font-semibold">* Lưu ý: Tick chọn theo Mã Định Danh (ID).</span>
        </p>
        <div class="flex gap-2">
            <button class="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition" on:click={addGroup}>
                + Thêm Nhóm Hàng Lớn
            </button>
            <button class="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm disabled:opacity-50" on:click={handleSave} disabled={isSaving}>
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
                    <div class="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition" on:click={() => editingId = (editingId === group.id ? null : group.id)}>
                        <div class="flex items-center gap-2">
                            <span class="transform transition-transform {editingId === group.id ? 'rotate-90' : ''}">▶</span>
                            <h4 class="font-bold text-slate-700">{group.name}</h4>
                            <span class="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                {group.items?.length || 0} mục
                            </span>
                        </div>
                        <button class="text-red-500 hover:text-red-700 p-1" on:click|stopPropagation={() => removeGroup(group.id)} title="Xóa nhóm">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>

                    {#if editingId === group.id}
                        <div class="p-4 border-t border-gray-200 bg-white animate-fade-in">
                            <div class="mb-3 flex flex-col xl:flex-row xl:items-center gap-3 justify-between bg-slate-50 p-2 rounded border border-slate-100">
                                <div class="flex gap-2 bg-slate-200 p-1 rounded w-fit flex-shrink-0">
                                    <button class="px-3 py-1.5 text-xs font-bold rounded transition-colors {selectorMode === 'group' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}" on:click={() => selectorMode = 'group'}>Tìm Nhóm Hàng</button>
                                    <button class="px-3 py-1.5 text-xs font-bold rounded transition-colors {selectorMode === 'product' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}" on:click={() => selectorMode = 'product'}>Tìm SP Đặc Thù</button>
                                </div>
                                <div class="flex gap-2 w-full xl:w-auto">
                                    <input type="text" class="flex-1 min-w-[200px] p-2 border rounded text-xs bg-white focus:bg-white transition outline-none focus:ring-1 focus:ring-teal-500" placeholder="🔍 Gõ để lọc nhanh..." bind:value={itemSearch} />
                                    <button class="px-3 py-1 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 whitespace-nowrap transition-colors" on:click={() => selectAllFiltered(group.id)}>
                                        Chọn lọc
                                    </button>
                                    <button class="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded text-xs font-bold hover:bg-orange-200 whitespace-nowrap transition-colors" on:click={() => deselectAllFiltered(group.id)}>
                                        Bỏ lọc
                                    </button>
                                    <button class="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold hover:bg-red-100 whitespace-nowrap flex items-center gap-1 transition-colors ml-2" on:click={() => clearSelection(group.id)} title="Xóa sạch toàn bộ mục đã chọn">
                                        Làm sạch All
                                    </button>
                                </div>
                            </div>
                            
                            <div class="max-h-80 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-2 custom-scrollbar p-1">
                                {#each filteredRawGroups as item}
                                    {@const isChecked = group.items.includes(item.id)}
                                    <label class="flex items-start gap-3 p-2 rounded-lg border {isChecked ? 'bg-teal-50 border-teal-300 shadow-sm' : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50'} cursor-pointer transition-all">
                                        <input type="checkbox" checked={isChecked} on:change={() => toggleItem(group.id, item.id)} class="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer" />
                                        <span class="text-xs text-slate-700 break-words font-medium line-clamp-2 leading-relaxed" title={item.display}>{item.display}</span>
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