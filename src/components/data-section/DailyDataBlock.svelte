<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { warehouseList, selectedWarehouse, masterReportData } from '../../stores.js';
    import FileInput from '../common/FileInput.svelte';
    import PasteInput from '../common/PasteInput.svelte';
    import { datasyncService } from '../../services/datasync.service.js';

    export let isClusterMode = false;
    export let currentClusterCode = '';
    const dispatch = createEventDispatcher();

    // --- TRẠNG THÁI LUỒNG ĐỒNG BỘ CHI TIẾT ---
    let syncState = 'idle'; // idle | syncing | success | error
    let syncProgress = 0;
    let syncTotal = 0;
    let syncMessage = '';

    async function handleDeepSync() {
        if (syncState === 'syncing') return;
        
        syncState = 'syncing';
        syncProgress = 0;
        syncTotal = 0;
        syncMessage = 'Đang khởi động trạm tổng hợp dữ liệu...';

        await datasyncService.deepSyncToMobile((current, total, status, msg) => {
            syncProgress = current;
            syncTotal = total;
            syncMessage = msg;
            
            if (status === 'success') {
                syncState = 'success';
                // Reset nút về trạng thái bình thường sau 3 giây
                setTimeout(() => { syncState = 'idle'; }, 3000);
            } else if (status === 'error') {
                syncState = 'error';
            }
        });
    }

    // [QUAN TRỌNG] Đảm bảo icon Feather được render nét căng mỗi khi trạng thái nút thay đổi
    afterUpdate(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    });
</script>

<div class="content-card data-card--blue flex flex-col gap-4 !mb-3" data-tour="block-blue"> 
    <h3 class="content-card__header data-header--blue flex items-center w-full">
        <i data-feather="zap" class="h-5 w-5 feather mr-2"></i>
        <span>SỬ DỤNG NHANH MỖI NGÀY</span>
        <span class="ml-2 text-sm font-normal italic opacity-80 pt-0 hidden sm:inline">(Đủ 90% dữ liệu cần thiết)</span>

        <div class="ml-auto flex items-center gap-3">
            {#if syncState === 'syncing'}
                <div class="flex flex-col items-end gap-1.5 min-w-[180px] sm:min-w-[240px]">
                    <div class="w-full bg-slate-200 rounded-full h-2.5 shadow-inner overflow-hidden relative border border-slate-300">
                        <div class="h-full transition-all duration-300 progress-shimmer bg-gradient-to-r from-blue-600 to-cyan-400" 
                           style="width: {syncTotal > 0 ? (syncProgress / syncTotal) * 100 : 0}%"></div>
                    </div>
                    <span class="text-[10px] font-bold text-blue-700 truncate max-w-[180px] sm:max-w-[240px] tracking-wide">{syncMessage}</span>
                </div>
            {:else}
                <button 
                    type="button"
                    on:click={handleDeepSync}
                    disabled={!$masterReportData || !$masterReportData.sknv || $masterReportData.sknv.length === 0}
                    class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-300 shadow-sm border select-none
                        {syncState === 'success' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100' 
                            : syncState === 'error'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : !$masterReportData || !$masterReportData.sknv || $masterReportData.sknv.length === 0
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed shadow-none'
                            : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow active:scale-95'}"
                >
                    {#if syncState === 'success'}
                        <i data-feather="check-circle" class="w-4 h-4"></i>
                        <span>ĐÃ ĐỒNG BỘ</span>
                    {:else if syncState === 'error'}
                        <i data-feather="x-circle" class="w-4 h-4"></i>
                        <span>LỖI ĐỒNG BỘ</span>
                    {:else}
                        <i data-feather="upload-cloud" class="w-4 h-4"></i>
                        <span>ĐỒNG BỘ APP NHÂN VIÊN</span>
                    {/if}
                </button>
            {/if}
        </div>
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
                        <PasteInput label={`Data Lũy kế (${kho})`} icon="clipboard" link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1" saveKeyPaste={`daily_paste_luyke_${kho}`} on:paste={(e) => dispatch('pasteCumulative', { text: e.detail, kho: kho })} />
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
                        <PasteInput label={`Thi đua nhân viên (${kho})`} icon="clipboard" link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=bcdtnv&rt=2&dm=1" saveKeyPaste={`daily_paste_thiduanv_${kho}`} saveKeyRaw={`raw_paste_thiduanv_${kho}`} saveKeyProcessed={`daily_paste_thiduanv_${kho}`} />
                    </div>
                {/each}
            {:else}
                {#if isClusterMode}
                    <div class="animate-fade-in p-3 bg-indigo-50 border border-indigo-200 rounded-lg relative w-full overflow-hidden">
                        <div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">MỚI</div>
                        <PasteInput label="Thi đua siêu thị lũy kế" icon="layers" link="#" placeholder="Paste dữ liệu thi đua cụm..." saveKeyPaste={`cluster_paste_comp_${currentClusterCode}`} on:paste={(e) => dispatch('pasteCompetition', e.detail)} />
                        <p class="text-xs text-indigo-600 mt-2 flex items-center gap-1"><i data-feather="info" class="w-3 h-3"></i>Dành cho quản lý Cụm {currentClusterCode}</p>
                    </div>
                {/if}

                <div class="h-fit w-full overflow-hidden">
                    <PasteInput label={`Thi đua nhân viên (${$selectedWarehouse})`} icon="clipboard" link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=bcdtnv&rt=2&dm=1" saveKeyPaste={`daily_paste_thiduanv_${$selectedWarehouse}`} saveKeyRaw={`raw_paste_thiduanv_${$selectedWarehouse}`} saveKeyProcessed={`daily_paste_thiduanv_${$selectedWarehouse}`} />
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Hiệu ứng tia sáng chạy dọc thanh Progress Bar */
    .progress-shimmer {
        position: relative;
        overflow: hidden;
    }
    .progress-shimmer::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
        );
        transform: translateX(-100%);
        animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
        100% {
            transform: translateX(100%);
        }
    }
</style>