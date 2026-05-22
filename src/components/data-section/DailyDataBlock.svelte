<script>
    import { createEventDispatcher } from 'svelte';
    import { warehouseList, selectedWarehouse } from '../../stores.js';
    import FileInput from '../common/FileInput.svelte';
    import PasteInput from '../common/PasteInput.svelte';

    export let isClusterMode = false;
    export let currentClusterCode = '';
    const dispatch = createEventDispatcher();
</script>

<div class="content-card data-card--blue flex flex-col gap-4 !mb-3" data-tour="block-blue"> 
    <h3 class="content-card__header data-header--blue flex items-center">
        <i data-feather="zap" class="h-5 w-5 feather mr-2"></i>
        <span>SỬ DỤNG NHANH MỖI NGÀY</span>
        <span class="ml-2 text-sm font-normal italic opacity-100 pt-0">(Đủ 90% dữ liệu cần thiết)</span>
    </h3>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <div class="flex flex-col gap-4 overflow-hidden">
            <div class="h-fit w-full" data-tour="input-ycx">
                <FileInput 
                    label="Yêu cầu xuất lũy kế" 
                    icon="file-text" 
                    link="https://report.mwgroup.vn/home/dashboard/077" 
                    saveKey="saved_ycx" 
                    isMultiMode={true} 
                />
            </div>
            
            {#if $selectedWarehouse === 'ALL'}
                <div class="h-fit animate-fade-in border border-blue-200 rounded-lg bg-blue-50/50 p-2 overflow-hidden flex flex-col w-full max-w-full">
                    <h4 class="text-sm font-bold text-blue-800 mb-2 px-1 flex items-center gap-2">
                        <i data-feather="pie-chart" class="w-4 h-4"></i> BC Tổng Hợp Cụm
                    </h4>
                    <div class="w-full overflow-hidden">
                        <PasteInput 
                            label="Dán Báo cáo Cụm" 
                            icon="clipboard" 
                            link="#" 
                            saveKeyPaste={isClusterMode && currentClusterCode ? `cluster_summary_data_CLUSTER_${currentClusterCode}` : "cluster_summary_data_CLUSTER_UNKNOWN"}
                            on:paste={(e) => dispatch('pasteClusterSummary', e.detail)} 
                        />
                    </div>
                </div>
            {/if}
        </div>

        <div class="flex flex-col gap-4 overflow-hidden" data-tour="input-data-lk">
            {#if $selectedWarehouse === 'ALL'}
                {#each $warehouseList as kho}
                    <div class="h-fit animate-fade-in w-full overflow-hidden">
                        <PasteInput 
                            label={`Data Lũy kế (${kho})`} 
                            icon="clipboard" 
                            link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1" 
                            saveKeyPaste={`daily_paste_luyke_${kho}`} 
                            on:paste={(e) => dispatch('pasteCumulative', { text: e.detail, kho: kho })} 
                        />
                    </div>
                {/each}
            {:else}
                <div class="h-fit w-full overflow-hidden">
                    <PasteInput 
                        label={isClusterMode ? `Data Lũy kế (Cụm ${currentClusterCode})` : `Data lũy kế (${$selectedWarehouse})`} 
                        icon="clipboard" 
                        link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1" 
                        saveKeyPaste={isClusterMode ? `cluster_paste_luyke_${currentClusterCode}` : `daily_paste_luyke_${$selectedWarehouse}`} 
                        on:paste={(e) => dispatch('pasteCumulative', { text: e.detail, kho: $selectedWarehouse })} 
                    />
                </div>
            {/if}
        </div>

        <div class="flex flex-col gap-4 overflow-hidden" data-tour="input-thidua-nv">
            {#if $selectedWarehouse === 'ALL'}
                {#each $warehouseList as kho}
                    <div class="h-fit animate-fade-in w-full overflow-hidden">
                        <PasteInput 
                            label={`Thi đua nhân viên (${kho})`} 
                            icon="clipboard" 
                            link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=bcdtnv&rt=2&dm=1" 
                            saveKeyPaste={`daily_paste_thiduanv_${kho}`} 
                            saveKeyRaw={`raw_paste_thiduanv_${kho}`} 
                            saveKeyProcessed={`daily_paste_thiduanv_${kho}`}
                        />
                    </div>
                {/each}
            {:else}
                {#if isClusterMode}
                    <div class="animate-fade-in p-3 bg-indigo-50 border border-indigo-200 rounded-lg relative w-full overflow-hidden">
                        <div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">MỚI</div>
                        <PasteInput 
                            label="Thi đua siêu thị lũy kế" 
                            icon="layers" 
                            link="#" 
                            placeholder="Paste dữ liệu thi đua cụm..." 
                            saveKeyPaste={`cluster_paste_comp_${currentClusterCode}`} 
                            on:paste={(e) => dispatch('pasteCompetition', e.detail)} 
                        />
                        <p class="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                            <i data-feather="info" class="w-3 h-3"></i>Dành cho quản lý Cụm {currentClusterCode}
                        </p>
                    </div>
                {/if}

                <div class="h-fit w-full overflow-hidden">
                    <PasteInput 
                        label={`Thi đua nhân viên (${$selectedWarehouse})`} 
                        icon="clipboard" 
                        link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=bcdtnv&rt=2&dm=1" 
                        saveKeyPaste={`daily_paste_thiduanv_${$selectedWarehouse}`} 
                        saveKeyRaw={`raw_paste_thiduanv_${$selectedWarehouse}`} 
                        saveKeyProcessed={`daily_paste_thiduanv_${$selectedWarehouse}`}
                    />
                </div>
            {/if}
        </div>
        
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>