<script>
    import { createEventDispatcher } from 'svelte';
    export let titleText = '';
    export let titleIcon = '';
    export let titleClass = '';
    export let iconClass = '';
    
    // Binding props
    export let viewMode = 'grid';
    export let showUnexported = false;
    export let sortMode = 'revenue_desc';
    export let searchText = '';
    
    // Filter props
    export let isSettingsOpen = false;
    export let filterSearch = '';
    export let filterList = []; // Array of { key, label, type } [FIX]
    export let hiddenCategories = new Set();
    export let isLoadingConfig = false;

    const dispatch = createEventDispatcher();

    function toggleCategory(key) {
        dispatch('toggleCategory', key);
    }

    function toggleAll(show) {
        dispatch('toggleAll', show);
    }
</script>

<div class="luyke-toolbar" style="flex-wrap: nowrap; gap: 8px;">
    <div class="luyke-toolbar-left" style="flex-grow: 1; min-width: 0;">
        <h3 class="text-base sm:text-lg font-bold uppercase flex items-center gap-2 {titleClass} truncate">
            <i data-feather={titleIcon} class="{iconClass} flex-shrink-0"></i>
            <span class="truncate">{titleText}</span>
        </h3>
    </div>

    <div class="luyke-toolbar-right" style="flex-shrink: 0; display: flex; align-items: center; gap: 8px;">
        
        <div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button class="view-mode-btn {viewMode === 'grid' ? 'active' : ''}" on:click={() => viewMode = 'grid'} title="Thẻ"><i data-feather="grid" class="w-4 h-4"></i></button>
            <button class="view-mode-btn {viewMode === 'chart' ? 'active' : ''}" on:click={() => viewMode = 'chart'} title="Biểu đồ"><i data-feather="pie-chart" class="w-4 h-4"></i></button>
        </div>

        {#if viewMode === 'grid'}
            <div class="toggle-wrapper {showUnexported ? 'active' : ''}" on:click={() => showUnexported = !showUnexported} style="padding: 4px 8px;">
                <div class="toggle-switch" style="width: 28px; height: 16px;"></div>
                <span class="toggle-label text-xs whitespace-nowrap">Chưa xuất</span>
            </div>
        {/if}

        <div class="relative filter-wrapper">
            <button class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen} title="Lọc hiển thị">
                {#if isLoadingConfig}<div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>{:else}<i data-feather="filter" class="w-4 h-4"></i>{/if}
            </button>

            {#if isSettingsOpen}
                <div class="filter-dropdown">
                    <div class="filter-header">
                        <input type="text" class="filter-search" placeholder="Tìm kiếm..." bind:value={filterSearch} />
                    </div>
                    <div class="filter-body custom-scrollbar">
                        {#if filterList.length === 0}
                            <p class="text-xs text-gray-500 text-center p-2">Không tìm thấy.</p>
                        {:else}
                            {#each filterList as group (group.key)}
                                <div class="filter-item" on:click={() => toggleCategory(group.key)}>
                                    <input type="checkbox" checked={!hiddenCategories.has(group.key)} />
                                    {#if group.type === 'macro'}
                                        <label class="text-teal-700 font-bold text-xs flex items-center gap-1 flex-1">
                                            <i data-feather="layers" class="w-3 h-3"></i> {group.label}
                                        </label>
                                    {:else}
                                        <label class="text-gray-700 text-xs flex-1 truncate" title={group.label}>{group.label}</label>
                                    {/if}
                                </div>
                            {/each}
                        {/if}
                    </div>
                    <div class="filter-actions">
                        <button class="filter-btn-link" on:click={() => toggleAll(true)}>Hiện tất cả</button>
                        <button class="filter-btn-link text-red-600" on:click={() => toggleAll(false)}>Ẩn tất cả</button>
                    </div>
                </div>
            {/if}
        </div>

        {#if viewMode === 'grid'}
            <div class="hidden sm:block">
                <input type="text" placeholder="Tìm nhanh..." class="luyke-search-input" style="width: 120px;" bind:value={searchText} />
            </div>
            <select class="p-1.5 border rounded text-xs bg-white outline-none cursor-pointer max-w-[100px]" bind:value={sortMode}>
                <option value="revenue_desc">DT ↓</option>
                <option value="quantity_desc">SL ↓</option>
            </select>
        {/if}
    </div>
</div>