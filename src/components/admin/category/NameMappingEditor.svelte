<script>
    import { onMount } from 'svelte';
    import { categoryStructure, categoryNameMapping, groupNameMapping, brandNameMapping } from '../../../stores.js';
    import { adminService } from '../../../services/admin.service.js';
    // [FIX] Import hàm cleanNameRaw
    import { cleanNameRaw } from '../../../utils.js';

    export let type = 'category'; // 'category' | 'group' | 'brand'

    let searchText = '';
    let isSaving = false;
    let localMapping = {}; 

    $: sourceData = $categoryStructure || [];
    
    let mappingStore, rawKey;
    
    $: if (type === 'category') {
        mappingStore = categoryNameMapping;
        rawKey = 'nganhHang';
    } else if (type === 'group') {
        mappingStore = groupNameMapping;
        rawKey = 'nhomHang';
    } else { // brand
        mappingStore = brandNameMapping;
        rawKey = 'nhaSanXuat';
    }
    
    $: uniqueRawNames = [...new Set(sourceData.map(item => item[rawKey]).filter(Boolean))].sort();

    $: {
        localMapping = { ...$mappingStore };
    }

    $: filteredList = uniqueRawNames.filter(name => 
        name.toLowerCase().includes(searchText.toLowerCase()) || 
        (localMapping[name] || '').toLowerCase().includes(searchText.toLowerCase())
    );

    // Hàm lấy tên gợi ý hiển thị trên giao diện (cột giữa)
    function getSuggestedName(rawName) {
        return cleanNameRaw(rawName);
    }

    async function handleSave() {
        isSaving = true;
        try {
            await adminService.saveNameMapping(type, localMapping);
            mappingStore.set(localMapping);
        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            isSaving = false;
        }
    }

    // [FIX] Hàm điền tự động giờ sẽ dùng logic làm sạch xịn
    function autoFillAll() {
        if (!confirm("Hành động này sẽ điền tên gợi ý (đã làm sạch) vào tất cả các ô trống. Tiếp tục?")) return;
        uniqueRawNames.forEach(raw => {
            if (!localMapping[raw]) {
                localMapping[raw] = cleanNameRaw(raw);
            }
        });
        localMapping = { ...localMapping };
    }
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
        <input 
            type="text" 
            placeholder="🔍 Tìm tên gốc hoặc tên hiển thị..." 
            class="flex-grow p-2 text-sm outline-none"
            bind:value={searchText}
        />
        <div class="flex gap-2">
            <button 
                class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                on:click={autoFillAll}
            >
                ✨ Điền tự động
            </button>
            <button 
                class="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm flex items-center gap-1 disabled:opacity-50"
                on:click={handleSave}
                disabled={isSaving}
            >
                {#if isSaving}Lưu...{:else}Lưu Cấu Hình{/if}
            </button>
        </div>
    </div>

    {#if uniqueRawNames.length === 0}
        <div class="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <p class="text-gray-500">Chưa có dữ liệu gốc. Vui lòng tải file Excel ở mục trên trước.</p>
        </div>
    {:else}
        <div class="border rounded-lg overflow-hidden bg-white shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
            <table class="w-full text-sm">
                <thead class="bg-gray-100 text-xs uppercase font-bold text-gray-600 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-4 py-3 text-left w-1/3">Tên Gốc (Trong Excel)</th>
                        <th class="px-4 py-3 text-left w-1/3 text-gray-400">Tên Gợi Ý (Auto)</th>
                        <th class="px-4 py-3 text-left w-1/3 text-indigo-700">Tên Hiển Thị (Chỉnh sửa)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each filteredList as rawName}
                        {@const suggested = getSuggestedName(rawName)}
                        <tr class="hover:bg-slate-50 transition-colors group">
                            <td class="px-4 py-2 font-mono text-xs text-gray-600 select-all">{rawName}</td>
                            <td class="px-4 py-2 text-gray-400 italic text-xs select-all">{suggested}</td>
                            <td class="px-4 py-1">
                                <input 
                                    type="text" 
                                    class="w-full p-1.5 border border-gray-200 rounded text-sm font-medium text-indigo-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-300"
                                    placeholder={suggested}
                                    bind:value={localMapping[rawName]}
                                />
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <p class="text-xs text-gray-500 mt-2 italic text-right">
            * Các ô để trống sẽ tự động hiển thị theo "Tên Gợi Ý".
        </p>
    {/if}
</div>