<script>
    import { modalState, dailyTrendConfigs, selectedWarehouse, efficiencyConfig, warehouseCustomMetrics, ycxData } from '../../../stores.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    
    import DailyTrendRawFilter from './DailyTrendRawFilter.svelte';
    import DailyTrendMetricConfig from './DailyTrendMetricConfig.svelte';

    function portal(node) {
        if (typeof document !== 'undefined') document.body.appendChild(node);
        return { destroy() { if (node.parentNode) node.parentNode.removeChild(node); } };
    }

    $: isOpen = $modalState?.activeModal === 'add-daily-trend-modal';
    let metricConfigRef;

    let editId = null; let title = '';
    let dateMode = 'rolling'; let rollingDays = 5;
    let customStartDate = ''; let customEndDate = '';
    let viewMode = 'METRIC';
    let showTotalColumn = true; let showAverageColumn = true;
    
    let metricId = 'TY_LE_QUY_DOI';
    let metricTarget = 0; // [NEW]: Lưu mục tiêu
    let isCreatingMetric = false;
    
    let rawType = 'revenue';
    let selectedNganh = []; let selectedNhom = []; let selectedHang = []; let selectedSP = [];
    let listNganhHang = []; let listNhomHang = []; let listHang = []; let listSanPham = [];
    let distinctCache = [];
    
    let isChildProcessing = false;
    $: isProcessingData = isChildProcessing;
    let isSaving = false;

    $: allMetricsConfig = [...($efficiencyConfig || []), ...($warehouseCustomMetrics || [])];

    // [FIX]: Trích xuất mã sang Tên đầy đủ - Dùng chung cho 2 tệp con
    $: if (isOpen && $ycxData && $ycxData.length > 0 && distinctCache.length === 0) {
        isChildProcessing = true;
        setTimeout(() => {
            const uniqueSet = new Set();
            const tempArr = [];
            for (let i = 0; i < $ycxData.length; i++) {
                const r = $ycxData[i];
                const nganh = r.nganhHang ? String(r.nganhHang).trim() : '';
                const nhom = r.nhomHang ? String(r.nhomHang).trim() : '';
                const hang = r.nhaSanXuat ? String(r.nhaSanXuat).trim() : '';
                const sp = r.tenSanPham ? String(r.tenSanPham).trim() : '';
                const hash = nganh + '|' + nhom + '|' + hang + '|' + sp;
                if (!uniqueSet.has(hash)) {
                    uniqueSet.add(hash);
                    tempArr.push({ nganh, nhom, hang, sp });
                }
            }
            distinctCache = tempArr;
            isChildProcessing = false;
        }, 50);
    }

    let wasOpen = false;
    $: if (isOpen && !wasOpen) {
        wasOpen = true;
        if ($modalState?.payload) {
            const p = $modalState.payload;
            editId = p.id; title = p.title || ''; dateMode = p.dateMode || 'rolling'; rollingDays = p.rollingDays || 5;
            customStartDate = p.customStartDate || ''; customEndDate = p.customEndDate || '';
            viewMode = p.viewMode || 'METRIC'; metricId = p.metricId || 'TY_LE_QUY_DOI';
            metricTarget = p.targetConfig || 0; // Tải mục tiêu cũ
            rawType = p.rawType || 'revenue';
            if (p.showSummaryColumn !== undefined) { showTotalColumn = p.showSummaryColumn; showAverageColumn = p.showSummaryColumn; } 
            else { showTotalColumn = p.showTotalColumn !== false; showAverageColumn = p.showAverageColumn !== false; }
            
            const f = p.filters || { nganhHang: [], nhomHang: [], nhaSanXuat: [], tenSanPham: [] };
            selectedNganh = f.nganhHang || []; selectedNhom = f.nhomHang || [];
            selectedHang = f.nhaSanXuat || []; selectedSP = f.tenSanPham || [];
        } else resetForm();
    }
    $: if (!isOpen) wasOpen = false;

    function resetForm() {
        editId = null; title = ''; dateMode = 'rolling'; rollingDays = 5; customStartDate = ''; customEndDate = '';
        viewMode = 'METRIC'; metricId = 'TY_LE_QUY_DOI'; metricTarget = 0; rawType = 'revenue'; showTotalColumn = true; showAverageColumn = true;
        selectedNganh = []; selectedNhom = []; selectedHang = []; selectedSP = [];
        if (metricConfigRef) metricConfigRef.resetBuilder();
    }

    function close() { 
        modalState.update(s => ({ ...(s || {}), activeModal: null, payload: null }));
        resetForm(); 
    }

    async function handleSave() {
        if (!title.trim()) return alert("Vui lòng nhập tên bảng!");
        if (dateMode === 'custom' && (!customStartDate || !customEndDate)) return alert("Vui lòng chọn mốc ngày bắt đầu và kết thúc!");
        if (!$selectedWarehouse) return alert("Vui lòng chọn kho trước khi lưu!");
        
        isSaving = true;
        try {
            const packedFilters = {
                nganhHang: selectedNganh.length >= listNganhHang.length ? [] : selectedNganh,
                nhomHang: selectedNhom.length >= listNhomHang.length ? [] : selectedNhom,
                nhaSanXuat: selectedHang.length >= listHang.length ? [] : selectedHang,
                tenSanPham: (selectedSP.length >= listSanPham.length || selectedSP.length > 5000) ? [] : selectedSP
            };
            const newTable = {
                id: editId || `trend_${Date.now()}`, title: title.trim(), dateMode, rollingDays, customStartDate, customEndDate,
                viewMode, metricId, rawType, showTotalColumn, showAverageColumn, filters: packedFilters, visible: true,
                targetConfig: metricTarget // [NEW]: Lưu mục tiêu vào CSDL
            };
            let updatedConfigs;
            if (editId) updatedConfigs = $dailyTrendConfigs.map(t => t.id === editId ? newTable : t);
            else updatedConfigs = [...$dailyTrendConfigs, newTable];
            
            await datasyncService.saveDailyTrendConfigs($selectedWarehouse, updatedConfigs);
            dailyTrendConfigs.set(updatedConfigs);
            close();
        } catch (error) { alert("Lỗi khi lưu bảng: " + error.message); } finally { isSaving = false; }
    }
</script>

{#if isOpen}
    <div use:portal class="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-[1400px] flex flex-col relative h-[90vh] overflow-hidden">
            {#if isProcessingData}
                <div class="absolute inset-0 z-[1300] bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin shadow-md"></div>
                    <p class="mt-4 font-bold text-blue-800 text-sm">Đang quét danh mục thông minh...</p>
                </div>
            {/if}

            <div class="p-4 border-b flex flex-col md:flex-row justify-between items-center bg-blue-50 flex-shrink-0 gap-4">
                <h3 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    {editId ? 'Sửa Bảng Xu Hướng' : 'Cấu Hình Bảng Mới'}
                </h3>
                
                <div class="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button class="px-5 py-2 text-xs font-bold rounded-md transition-colors {viewMode === 'METRIC' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}" on:click={() => {viewMode = 'METRIC';}}>BẢNG CHỈ SỐ %</button>
                    <button class="px-5 py-2 text-xs font-bold rounded-md transition-colors {viewMode === 'RAW' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}" on:click={() => {viewMode = 'RAW';}}>BẢNG DỮ LIỆU THÔ</button>
                </div>

                <button class="text-gray-500 hover:text-red-500 text-2xl leading-none absolute right-4 top-4 md:static" on:click={close} disabled={isSaving}>&times;</button>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col xl:flex-row bg-gray-50">
                <div class="w-full xl:w-[350px] flex flex-col gap-4 p-4 border-r border-gray-200 bg-white z-10 flex-shrink-0 overflow-y-auto">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tiêu đề bảng <span class="text-red-500">*</span></label>
                            <input type="text" bind:value={title} placeholder="VD: Xu hướng SIM..." class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Thời gian dữ liệu</label>
                            <div class="flex border rounded-md overflow-hidden mb-3">
                                <button class="flex-1 py-1.5 text-xs font-bold {dateMode === 'rolling' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}" on:click={() => dateMode = 'rolling'}>Trượt tự động</button>
                                <button class="flex-1 py-1.5 text-xs font-bold {dateMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}" on:click={() => dateMode = 'custom'}>Tùy chọn</button>
                            </div>

                            {#if dateMode === 'rolling'}
                                <div class="grid grid-cols-5 gap-1.5">
                                    {#each [3, 5, 7, 10, 15] as days}
                                        <button class="py-1.5 text-xs font-bold rounded border transition-all {rollingDays === days ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}" on:click={() => rollingDays = days}>{days}</button>
                                    {/each}
                                </div>
                            {:else}
                                <div class="grid grid-cols-2 gap-2">
                                    <div><label class="text-[10px] font-bold text-gray-500">Từ ngày</label><input type="date" bind:value={customStartDate} class="w-full px-2 py-1.5 text-xs border rounded-md" /></div>
                                    <div><label class="text-[10px] font-bold text-gray-500">Đến ngày</label><input type="date" bind:value={customEndDate} class="w-full px-2 py-1.5 text-xs border rounded-md" /></div>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div class="border-t pt-4 space-y-3">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Tùy chọn hiển thị Cột</label>
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" bind:checked={showTotalColumn} class="w-4 h-4 text-orange-500 rounded cursor-pointer accent-orange-500">
                            <span class="text-sm font-bold text-gray-700 group-hover:text-orange-600 transition-colors">Hiện cột Tổng</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" bind:checked={showAverageColumn} class="w-4 h-4 text-indigo-500 rounded cursor-pointer accent-indigo-500">
                            <span class="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Hiện cột Trung bình</span>
                        </label>
                    </div>
                </div>

                <div class="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
                    {#if viewMode === 'METRIC'}
                        <DailyTrendMetricConfig 
                            bind:this={metricConfigRef}
                            bind:metricId
                            bind:metricTarget
                            bind:isCreatingMetric
                            {allMetricsConfig}
                            {distinctCache}
                        />
                    {:else}
                        <DailyTrendRawFilter 
                            {isOpen}
                            bind:rawType
                            bind:selectedNganh bind:selectedNhom bind:selectedHang bind:selectedSP
                            {distinctCache}
                            bind:listNganhHang bind:listNhomHang bind:listHang bind:listSanPham
                            on:processing={(e) => isChildProcessing = e.detail}
                        />
                    {/if}
                </div>
            </div>

            <div class="p-4 border-t bg-white flex justify-end gap-3 flex-shrink-0 z-10">
                <button class="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors" on:click={close} disabled={isSaving || isCreatingMetric}>Hủy</button>
                <button class="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2" on:click={handleSave} disabled={isSaving || isCreatingMetric}>
                    {#if isSaving}
                        <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        Đang lưu...
                    {:else}
                        Lưu Bảng
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}
