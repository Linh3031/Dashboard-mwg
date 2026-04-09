<script>
    export let node;
    export let selectedId = '';
    export let onSelect = (n) => {};
    // Mặc định Cấp 0, 1 mở sẵn. Cấp 2,3,4 gập lại cho gọn.
    let isOpen = node.level < 2;
    $: isSelected = selectedId === node.id;
    $: hasChildren = node.children && Object.keys(node.children).length > 0;
    
    function toggleOpen(e) {
        e.stopPropagation();
        isOpen = !isOpen;
    }

    function handleClick(e) {
        e.stopPropagation();
        onSelect(node);
    }

    // Tree hiển thị gọn, giữ nguyên tròn số
    function formatDT(num) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num / 1000000));
    }
</script>

<div 
    class="flex items-center p-1.5 border-b border-gray-50 cursor-pointer transition hover:bg-blue-50 {isSelected ? 'bg-blue-100 border-l-4 border-l-blue-600 font-bold' : 'border-l-4 border-l-transparent'}"
    style="padding-left: {node.level * 1.5 + 0.5}rem"
    on:click={handleClick}
>
    <div class="w-6 flex items-center justify-center">
        {#if hasChildren}
            <button class="text-gray-400 hover:text-blue-600 focus:outline-none" on:click={toggleOpen}>
                {isOpen ? '▼' : '▶'}
            </button>
        {/if}
    </div>
    
    <div class="flex-1 flex justify-between items-center text-sm ml-1 pr-2 truncate">
        <span class="truncate {node.id === 'empty' ? 'text-red-500 italic' : 'text-gray-700'}">{node.name}</span>
        <span class="text-xs ml-2 text-green-700 bg-green-50 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">DT: {formatDT(node.doanhThu)} Tr</span>
    </div>
</div>

{#if isOpen && hasChildren}
    <div>
        {#each Object.values(node.children).sort((a,b) => b.doanhThu - a.doanhThu) as childNode}
            <svelte:self node={childNode} {selectedId} {onSelect} />
        {/each}
    </div>
{/if}