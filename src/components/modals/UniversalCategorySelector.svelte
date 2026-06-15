<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure, macroCategoryConfig, macroProductGroupConfig } from '../../stores.js';
    import { parseIdentity } from '../../utils.js';

    export let selectedItems = []; 
    export let mode = 'group'; 

    const dispatch = createEventDispatcher();
    let search = '';
    let showSelectedOnly = false;

    $: allAvailableItems = (() => {
        const list = [];
        const seenIds = new Set();

        if (mode === 'category') {
            ($categoryStructure || []).forEach(c => {
                if (!c.nganhHang) return;
                const parsed = parseIdentity(c.nganhHang);
                if (parsed.id && parsed.id !== 'unknown' && !seenIds.has(parsed.id)) {
                    seenIds.add(parsed.id);
                    list.push({ id: parsed.id, name: parsed.name, type: 'CATEGORY', display: `${parsed.id} - ${parsed.name}` });
                }
            });
        } else {
            ($macroProductGroupConfig || []).forEach(m => {
                if (m.name && !seenIds.has(m.name)) {
                    seenIds.add(m.name);
                    list.push({ id: m.name, name: m.name, type: 'MACRO', display: m.name });
                }
            });
            ($categoryStructure || []).forEach(c => {
                if (!c.nhomHang) return;
                const parsed = parseIdentity(c.nhomHang);
                if (parsed.id && parsed.id !== 'unknown' && !seenIds.has(parsed.id)) {
                    seenIds.add(parsed.id);
                    list.push({ id: parsed.id, name: parsed.name, type: 'GROUP', display: `${parsed.id} - ${parsed.name}` });
                }
            });
        }
        return list;
    })();

    $: filteredItems = allAvailableItems.filter(item => {
        const matchSearch = item.display.toLowerCase().includes(search.toLowerCase());
        const matchSelected = !showSelectedOnly || selectedItems.includes(item.id);
        return matchSearch && matchSelected;
    }).sort((a, b) => {
        const aSelected = selectedItems.includes(a.id);
        const bSelected = selectedItems.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return a.display.localeCompare(b.display);
    });

    function updateParent(newArray) {
        selectedItems = newArray;
        dispatch('selectionChange', [...selectedItems]);
    }

    function toggleItem(id) {
        if (selectedItems.includes(id)) {
            updateParent(selectedItems.filter(x => x !== id));
        } else {
            updateParent([...selectedItems, id]);
        }
    }

    function selectAll() {
        const currentFilteredIds = filteredItems.map(i => i.id);
        updateParent([...new Set([...selectedItems, ...currentFilteredIds])]);
    }

    function deselectAll() {
        const currentFilteredIds = filteredItems.map(i => i.id);
        updateParent(selectedItems.filter(id => !currentFilteredIds.includes(id)));
    }
</script>

<div class="flex flex-col h-full bg-white flex-1 min-h-0">
    <div class="p-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
        
        <div class="flex bg-white p-0.5 rounded border shadow-sm flex-shrink-0">
            <button class="px-3 py-1 text-xs font-bold rounded transition-all {mode === 'group' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}" on:click={() => mode = 'group'}>Nhóm</button>
            <button class="px-3 py-1 text-xs font-bold rounded transition-all {mode === 'category' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}" on:click={() => mode = 'category'}>Ngành</button>
        </div>

        <div class="relative flex-1">
            <input 
                type="text" bind:value={search} placeholder="Tìm kiếm..." 
                class="w-full pl-7 pr-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <div class="flex items-center gap-2 text-[10px] flex-shrink-0">
            <label class="flex items-center gap-1 text-gray-600 cursor-pointer select-none">
                <input type="checkbox" bind:checked={showSelectedOnly} class="rounded text-blue-600" />
                <span>Đã chọn ({selectedItems.length})</span>
            </label>
            <button on:click={selectAll} class="text-blue-600 font-bold hover:underline ml-1">Chọn hết</button>
            <span class="text-gray-300">|</span>
            <button on:click={deselectAll} class="text-red-500 font-bold hover:underline">Bỏ hết</button>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto p-1.5 min-h-0 custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
            {#each filteredItems as item (item.id)}
                {@const isSelected = selectedItems.includes(item.id)}
                <button on:click={() => toggleItem(item.id)} class="w-full flex items-center p-1.5 text-left rounded transition-colors text-[11px] {isSelected ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'hover:bg-gray-100 text-gray-700 border border-transparent'}">
                    <div class="mr-2 flex-shrink-0 w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors {isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}">
                        {#if isSelected}<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>{/if}
                    </div>
                    <span class="truncate flex-1">{item.display}</span>
                    {#if item.type === 'MACRO'}<span class="text-[8px] px-1 py-0.5 bg-purple-200 text-purple-800 rounded font-bold uppercase ml-1">Gộp</span>{/if}
                </button>
            {:else}
                <div class="col-span-full text-center text-gray-400 text-xs py-10">Không tìm thấy dữ liệu.</div>
            {/each}
        </div>
    </div>
</div>