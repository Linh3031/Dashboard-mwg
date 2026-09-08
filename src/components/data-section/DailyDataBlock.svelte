<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { warehouseList, selectedWarehouse, masterReportData } from '../../stores.js';
    import FileInput from '../common/FileInput.svelte';
    import PasteInput from '../common/PasteInput.svelte';
    import BiRevenuePasteInput from './BiRevenuePasteInput.svelte';
    import ThiDuaNvPasteInput from './ThiDuaNvPasteInput.svelte';
    import ThiDuaStPasteInput from './ThiDuaStPasteInput.svelte';
    import { datasyncService } from '../../services/datasync.service.js';

    export let isClusterMode = false;
    export let currentClusterCode = '';
    const dispatch = createEventDispatcher();

    // [MỚI] Công ty đang chặn xuất Excel ở trang BI — chuyển mặc định sang ô dán. Vẫn giữ nguyên
    // ô Excel cũ trong code, chỉ ẩn UI, phòng trường hợp công ty mở lại export Excel.
    let showBiExcelFallback = false;
    let showThiDuaNvExcelFallback = false;
    let showThiDuaStExcelFallback = false;

    let syncState = 'idle'; 
    let syncProgress = 0;
    let syncTotal = 0;
    let syncMessage = '';

    async function handleDeepSync() {
        if (syncState === 'syncing') return;
        syncState = 'syncing'; syncProgress = 0; syncTotal = 0; syncMessage = 'Đang khởi động trạm tổng hợp dữ liệu...';
        await datasyncService.deepSyncToMobile((current, total, status, msg) => {
            syncProgress = current; syncTotal = total; syncMessage = msg;
            if (status === 'success') {
                syncState = 'success';
                setTimeout(() => { syncState = 'idle'; }, 3000);
            } else if (status === 'error') { syncState = 'error'; }
        });
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
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
                        {syncState === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100' : syncState === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200' : !$masterReportData || !$masterReportData.sknv || $masterReportData.sknv.length === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed shadow-none' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow active:scale-95'}"
                >
                    {#if syncState === 'success'}<i data-feather="check-circle" class="w-4 h-4"></i><span>ĐÃ ĐỒNG BỘ</span>
                    {:else if syncState === 'error'}<i data-feather="x-circle" class="w-4 h-4"></i><span>LỖI ĐỒNG BỘ</span>
                    {:else}<i data-feather="upload-cloud" class="w-4 h-4"></i><span>ĐỒNG BỘ APP NHÂN VIÊN</span>{/if}
                </button>
            {/if}
        </div>
    </h3>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mt-1">
        
        <!-- 1. Yêu cầu xuất lũy kế -->
        <div class="flex flex-col gap-2 overflow-hidden" data-tour="input-ycx">
             <!-- [PHẪU THUẬT LOGIC]: Nâng cấp Header 1 -->
             <div class="flex justify-between items-center px-1 pb-1 border-b border-blue-100/50">
                 <span class="text-[12px] font-extrabold text-blue-900 uppercase tracking-wide">Excel Lũy Kế</span>
                 <button on:click={() => dispatch('openTutorial', 'ycx-luy-ke')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                     <span class="relative flex h-2 w-2">
                       <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                       <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                     </span>
                     <span>HƯỚNG DẪN</span>
                     <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                 </button>
             </div>
             <div class="h-fit w-full mt-1">
                <FileInput label="Yêu cầu xuất lũy kế" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx" isMultiMode={true} />
            </div>
        </div>

        <!-- 2. Doanh thu BI -->
        <div class="flex flex-col gap-2 overflow-hidden" data-tour="input-doanhthu-bi">
            <!-- [PHẪU THUẬT LOGIC]: Nâng cấp Header 2 -->
            <div class="flex justify-between items-center px-1 pb-1 border-b border-blue-100/50">
                 <span class="text-[12px] font-extrabold text-blue-900 uppercase tracking-wide">Báo Cáo BI</span>
                 <button on:click={() => dispatch('openTutorial', 'doanh-thu-bi')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                     <span class="relative flex h-2 w-2">
                       <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                       <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                     </span>
                     <span>HƯỚNG DẪN</span>
                     <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                 </button>
            </div>
            <!-- [MỚI] Công ty chặn xuất Excel ở trang BI — chuyển sang ô dán trực tiếp, tự trích
                 xuất nhiều siêu thị/mã kho trong 1 lần dán. Ô Excel cũ giữ nguyên, ẩn mặc định. -->
            <div class="h-fit w-full overflow-hidden mt-1">
                <BiRevenuePasteInput />
            </div>
            {#if showBiExcelFallback}
                <div class="h-fit w-full overflow-hidden mt-1">
                    <FileInput label="Doanh thu BI (Excel)" icon="bar-chart-2" link="https://baocao.dienmayxanh.com/dashboard/revenue-consolidated" saveKey="saved_doanhthu_bi" showWarehouseTags={true} />
                </div>
            {/if}
        </div>

        <!-- 3. Thi đua nhân viên -->
        <div class="flex flex-col gap-2 overflow-hidden" data-tour="input-thidua-nv">
            <!-- [PHẪU THUẬT LOGIC]: Nâng cấp Header 3 -->
            <div class="flex justify-between items-center px-1 pb-1 border-b border-blue-100/50">
                 <span class="text-[12px] font-extrabold text-blue-900 uppercase tracking-wide">Thi đua cá nhân</span>
                 <button on:click={() => dispatch('openTutorial', 'thi-dua-nv')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                     <span class="relative flex h-2 w-2">
                       <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                       <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                     </span>
                     <span>HƯỚNG DẪN</span>
                     <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                 </button>
            </div>
            <!-- [MỚI] Công ty chặn xuất Excel ở trang BI — chuyển sang ô dán trực tiếp theo từng
                 kho, tự so khớp MSNV với DSNV để cảnh báo nếu dán nhầm dữ liệu kho khác. Ô Excel
                 cũ giữ nguyên, ẩn hẳn (bật lại bằng cách sửa showThiDuaNvExcelFallback trong code). -->
            {#if $selectedWarehouse === 'ALL'}
                {#each $warehouseList as kho}
                    {#if kho !== 'ALL'}
                        <div class="h-fit animate-fade-in w-full overflow-hidden mt-1">
                            <ThiDuaNvPasteInput targetKho={kho} />
                        </div>
                        {#if showThiDuaNvExcelFallback}
                            <div class="h-fit w-full overflow-hidden mt-1">
                                <FileInput label={`Thi đua nhân viên (${kho}, Excel)`} icon="file-text" link="https://baocao.dienmayxanh.com/dashboard/thi-dua" saveKey={`saved_thiduanv_excel_${kho}`} />
                            </div>
                        {/if}
                    {/if}
                {/each}
            {:else}
                <div class="h-fit w-full overflow-hidden mt-1">
                    <ThiDuaNvPasteInput targetKho={$selectedWarehouse} />
                </div>
                {#if showThiDuaNvExcelFallback}
                    <div class="h-fit w-full overflow-hidden mt-1">
                        <FileInput label={`Thi đua nhân viên (${$selectedWarehouse}, Excel)`} icon="file-text" link="https://baocao.dienmayxanh.com/dashboard/thi-dua" saveKey={`saved_thiduanv_excel_${$selectedWarehouse}`} />
                    </div>
                {/if}
            {/if}
        </div>

        <!-- 4. Lũy kế -->
        <div class="flex flex-col gap-2 overflow-hidden" data-tour="input-data-lk">
            <!-- [PHẪU THUẬT LOGIC]: Nâng cấp Header 4 -->
            <div class="flex justify-between items-center px-1 pb-1 border-b border-blue-100/50">
                 <span class="text-[12px] font-extrabold text-blue-900 uppercase tracking-wide">Thi đua ST Lũy Kế</span>
                 <button on:click={() => dispatch('openTutorial', 'data-luy-ke')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                     <span class="relative flex h-2 w-2">
                       <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                       <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                     </span>
                     <span>HƯỚNG DẪN</span>
                     <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                 </button>
            </div>
            {#if $selectedWarehouse !== 'ALL' && isClusterMode}
                <div class="animate-fade-in p-3 bg-indigo-50 border border-indigo-200 rounded-lg relative w-full overflow-hidden mb-4 mt-2">
                    <div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">MỚI</div>
                    <PasteInput label="Thi đua siêu thị lũy kế" icon="layers" link="#" placeholder="Paste dữ liệu thi đua cụm..." saveKeyPaste={`cluster_paste_comp_${currentClusterCode}`} on:paste={(e) => dispatch('pasteCompetition', e.detail)} />
                    <p class="text-xs text-indigo-600 mt-2 flex items-center gap-1"><i data-feather="info" class="w-3 h-3"></i>Dành cho quản lý Cụm {currentClusterCode}</p>
                </div>
            {/if}
            <!-- [MỚI] Công ty chặn xuất Excel ở trang BI — chuyển sang ô dán trực tiếp, tự trích
                 xuất nhiều siêu thị/mã kho trong 1 lần dán qua so khớp "Tên Kho" trong DSNV. Ô
                 Excel cũ giữ nguyên, ẩn hẳn (bật lại bằng cách sửa showThiDuaStExcelFallback). -->
            <div class="h-fit w-full overflow-hidden mt-1">
                <ThiDuaStPasteInput />
            </div>
            {#if showThiDuaStExcelFallback}
                <div class="h-fit w-full overflow-hidden mt-1">
                    <FileInput label="Thi đua ST (Excel)" icon="file-text" link="https://baocao.dienmayxanh.com/dashboard/thi-dua" saveKey="saved_thidua_st_excel" showWarehouseTags={true} />
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .progress-shimmer { position: relative; overflow: hidden; }
    .progress-shimmer::after {
        content: ''; position: absolute; top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%);
        transform: translateX(-100%); animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
</style>