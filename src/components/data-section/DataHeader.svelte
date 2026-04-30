<script>
    import { createEventDispatcher } from 'svelte';
    import { warehouseList, selectedWarehouse } from '../../stores.js';
    import { showVersionDetails } from '../common/VersionManager.svelte';
    
    export let isClusterMode = false;
    export let isSyncing = false;
    export let tickerStatus = 'none';
    export let latestVersion = '';
    export let hasSeenTour = true;

    const dispatch = createEventDispatcher();

    function onWarehouseSelect(event) {
        dispatch('warehouseChange', event.target.value);
    }
</script>

<div class="page-header">
    <div class="flex flex-wrap items-center gap-4 w-full">
        <div class="flex items-center gap-x-3">
            <h2 class="page-header__title">Cập nhật dữ liệu</h2>
            
            <div class="relative flex items-center">
                <button class="page-header__help-btn relative hover:bg-blue-100 hover:text-blue-700 transition-colors z-10" on:click={() => dispatch('startTour')} title="Xem hướng dẫn">
                    <i data-feather="help-circle" class="feather"></i>
                    
                    <span class="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-sm"></span>
                    </span>
                </button>

                {#if !hasSeenTour}
                    <div class="absolute left-full ml-3 whitespace-nowrap bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg animate-bounce z-20 flex items-center pointer-events-none">
                        <div class="absolute w-2 h-2 bg-blue-600 transform -rotate-45 -left-1"></div>
                        Hướng dẫn sử dụng
                    </div>
                {/if}
            </div>
        </div>
        
        <div id="data-warehouse-selector-container" class="flex-shrink-0 flex items-center gap-2">
            <label for="data-warehouse-selector" class="text-sm font-semibold text-gray-700">
                {isClusterMode ? 'Cụm/Kho:' : 'Kho:'}
            </label>
            
            <div class="relative">
                <select id="data-warehouse-selector" class="p-2 border rounded-lg text-sm shadow-sm min-w-[200px] font-semibold text-indigo-800 bg-indigo-50 border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50" disabled={$warehouseList.length === 0 || isSyncing} value={$selectedWarehouse || 'ALL'} on:change={onWarehouseSelect}>
                    {#if $warehouseList.length === 0}
                        <option>Vui lòng tải file DSNV...</option>
                    {:else}
                        <option value="ALL">Tất cả các kho</option>
                        
                        {#each $warehouseList as kho}
                            <option value={kho}>{kho}</option>
                        {/each}
                    {/if}
                </select>
                {#if isSyncing}
                    <div class="absolute right-8 top-1/2 -translate-y-1/2">
                        <svg class="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                {/if}
            </div>
        </div>

        {#if tickerStatus !== 'none'}
            <div id="version-marquee-container" class="flex-grow min-w-[200px] rounded-lg px-4 py-2 cursor-pointer shadow-sm border transition-all flex items-center overflow-hidden relative group {tickerStatus === 'new' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}" on:click={() => showVersionDetails.set(true)} role="button" tabindex="0">
                <div class="marquee-content whitespace-nowrap text-sm flex items-center gap-4">
                    {#if tickerStatus === 'new'}
                        <span class="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider animate-pulse border border-red-200">
                            <i data-feather="zap" class="w-3 h-3"></i> Mới
                        </span>
                        <span class="text-red-900 font-bold">
                            Đã có phiên bản <span class="bg-red-200 text-red-800 px-1.5 rounded font-bold mx-1">{latestVersion}</span> - Bấm cập nhật ngay!
                        </span>
                    {:else}
                        <span class="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-green-200">
                            <i data-feather="check-circle" class="w-3 h-3"></i> Đã cập nhật
                        </span>
                        <span class="text-indigo-900 font-bold flex items-center gap-1">
                            Hệ thống đang chạy phiên bản 
                            <span class="text-base font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">{latestVersion}</span>
                        </span>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .marquee-content { animation: marquee 12s linear infinite; }
    .group:hover .marquee-content { animation-play-state: paused; }
    @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
</style>