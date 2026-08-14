<script>
    export let node;
    export let selectedId = '';
    export let onSelect = (n) => {};
    
    // [PHẪU THUẬT LOGIC]: Mặc định chỉ mở Cấp 0 (Root). Cấp 1 (Tỉnh) trở xuống gập lại.
    let isOpen = node.level < 1;
    let isLoading = false;
    
    $: isSelected = selectedId === node.id;
    $: hasChildren = node.children && Object.keys(node.children).length > 0;
    
    function handleToggle(e) {
        e.stopPropagation();
        if (!isOpen) {
            isLoading = true;
            // Nhường luồng chính 50ms để Svelte kịp vẽ vòng xoay loading lên UI
            setTimeout(() => {
                isOpen = true;
                isLoading = false;
            }, 50);
        } else {
            isOpen = false;
        }
    }

    function handleClick(e) {
        e.stopPropagation();
        onSelect(node);
    }

    function formatDT(num) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num / 1000000));
    }
</script>

<div 
    class="flex items-center p-1.5 border-b border-gray-50 cursor-pointer transition hover:bg-blue-50 {isSelected ? 'bg-blue-100 border-l-4 border-l-blue-600 font-bold' : 'border-l-4 border-l-transparent'}"
    style="padding-left: {node.level * 1.5 + 0.5}rem"
    on:click={handleClick}
>
    <div class="w-6 flex items-center justify-center shrink-0">
        {#if hasChildren}
            <button class="text-gray-400 hover:text-blue-600 focus:outline-none" on:click={handleToggle}>
                {#if isLoading}
                    <svg class="animate-spin h-3.5 w-3.5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {:else}
                    {isOpen ? '▼' : '▶'}
                {/if}
            </button>
        {/if}
    </div>
    
    <div class="flex-1 flex justify-between items-center text-sm ml-1 pr-2 truncate">
        <span class="truncate {node.id === 'empty' ? 'text-red-500 italic' : 'text-gray-700'}">{node.name}</span>
        
        <div class="flex items-center gap-1 shrink-0">
            <span class="text-[10px] sm:text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap border border-gray-200">SL: {new Intl.NumberFormat('vi-VN').format(Math.round(node.soLuong))}</span>
            <span class="text-[10px] sm:text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap border border-green-100">DT: {formatDT(node.doanhThu)} Tr</span>
        </div>
    </div>
</div>

{#if isOpen && hasChildren}
    <div>
        {#each Object.values(node.children).sort((a,b) => b.doanhThu - a.doanhThu) as childNode (childNode.id)}
            <svelte:self node={childNode} {selectedId} {onSelect} />
        {/each}
    </div>
{/if}