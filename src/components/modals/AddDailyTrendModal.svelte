<script>
    import { modalState, dailyTrendConfigs, selectedWarehouse, efficiencyConfig, warehouseCustomMetrics, ycxData } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';
    
    // Tích hợp các Component Builder có sẵn
    import IndicatorBuilder from './IndicatorBuilder.svelte';
    import UniversalCategorySelector from './UniversalCategorySelector.svelte';

    // [PORTAL]: Chống lỗi CSS Stacking Context
    function portal(node) {
        if (typeof document !== 'undefined') document.body.appendChild(node);
        return { destroy() { if (node.parentNode) node.parentNode.removeChild(node); } };
    }

    $: isOpen = $modalState?.activeModal === 'add-daily-trend-modal';

    // --- STATE: BẢNG XU HƯỚNG ---
    let editId = null;
    let title = '';
    let dateMode = 'rolling'; let rollingDays = 5;
    let customStartDate = ''; let customEndDate = '';
    let viewMode = 'METRIC'; // 'METRIC' | 'RAW' (Điều khiển 2 Tab lớn)
    let metricId = 'TY_LE_QUY_DOI';
    let rawType = 'revenue';
    let showTotalColumn = true; let showAverageColumn = true;
    
    // State dữ liệu thô (RAW)
    let selectedNganh = []; let selectedNhom = []; let selectedHang = []; let selectedSP = [];
    let searchNganh = ''; let searchNhom = ''; let searchHang = ''; let searchProduct = '';
    
    // --- STATE: TẠO CHỈ SỐ MỚI (METRIC BUILDER) ---
    let isCreatingMetric = false; // Bật/Tắt giao diện Builder
    let indLabel = ''; let indType = 'PERCENT'; let indMetricBase = 'REAL'; let indTarget = 0;
    let indNumerator = []; let indDenominator = []; let indActiveContext = 'numerator';
    let rightPanelMode = 'group'; // Chế độ của UniversalCategorySelector

    let isSaving = false;
    let isProcessingData = false;

    // --- SYSTEM DATA ---
    const SYSTEM_METRICS = [
        { id: 'DTTL', label: 'Tổng Doanh Thu' }, { id: 'SL', label: 'Tổng Số Lượng' },
        { id: 'TY_LE_QUY_DOI', label: 'Tỷ Lệ Quy Đổi' }, { id: 'TY_LE_TRA_CHAM', label: 'Tỷ Lệ Trả Chậm' }
    ];
    
    $: allMetricsConfig = [...($efficiencyConfig || []), ...($warehouseCustomMetrics || [])];
    $: dynamicMetrics = allMetricsConfig.map(m => ({ id: m.id, label: m.label }));
    $: combinedMetrics = [...SYSTEM_METRICS, ...dynamicMetrics];
    
    // Dịch thuật Mô phỏng
    $: formulaDesc = getFormulaDesc(metricId, allMetricsConfig);
    $: detailedFormula = getFormulaDetailedDesc(metricId, allMetricsConfig, distinctCache);
    
    function getFormulaDesc(id, configs) {
        if (id === 'DTTL') return "Tính Tổng Doanh Thu Thực Tế (Loại bỏ Đổi trả/Hủy).";
        if (id === 'SL') return "Đếm Tổng Số Lượng Sản Phẩm Bán Ra.";
        if (id === 'TY_LE_QUY_DOI') return "(Tổng DT Quy Đổi ÷ Tổng DT Thực Tế) - 1";
        if (id === 'TY_LE_TRA_CHAM') return "Tổng DT Trả Chậm ÷ Tổng DT Thực Tế";
        return "Cấu hình tùy chọn...";
    }

    function getFormulaDetailedDesc(id, configs, cache) {
        if (['DTTL', 'SL', 'TY_LE_QUY_DOI', 'TY_LE_TRA_CHAM'].includes(id)) return null;
        const cfg = configs.find(m => m.id === id);
        if (!cfg) return null;
        
        const mapIdToName = (targetId) => {
            if (!cache || cache.length === 0) return targetId;
            const strId = String(targetId).trim();
            for (let i = 0; i < cache.length; i++) {
                const nganh = String(cache[i].nganh); const nhom = String(cache[i].nhom);
                if (nganh === strId || nganh.startsWith(strId + '-')) return nganh;
                if (nhom === strId || nhom.startsWith(strId + '-')) return nhom;
            }
            return `${targetId}`;
        };
        return {
            numList: (cfg.groupA || []).map(mapIdToName),
            denList: (cfg.groupB || []).map(mapIdToName),
            unit: cfg.percentMetric === 'SL' ? 'Số Lượng' : (cfg.percentMetric === 'DTQD' ? 'DT Quy Đổi' : 'DT Thực')
        };
    }

    let wasOpen = false;
    $: if (isOpen && !wasOpen) {
        wasOpen = true;
        isCreatingMetric = false;
        if ($modalState?.payload) {
            const p = $modalState.payload;
            editId = p.id; title = p.title || ''; dateMode = p.dateMode || 'rolling'; rollingDays = p.rollingDays || 5;
            customStartDate = p.customStartDate || ''; customEndDate = p.customEndDate || '';
            viewMode = p.viewMode || 'METRIC'; metricId = p.metricId || 'TY_LE_QUY_DOI'; rawType = p.rawType || 'revenue';
            if (p.showSummaryColumn !== undefined) { showTotalColumn = p.showSummaryColumn; showAverageColumn = p.showSummaryColumn; } 
            else { showTotalColumn = p.showTotalColumn !== false; showAverageColumn = p.showAverageColumn !== false; }
            
            const f = p.filters || { nganhHang: [], nhomHang: [], nhaSanXuat: [], tenSanPham: [] };
            selectedNganh = f.nganhHang || []; selectedNhom = f.nhomHang || []; selectedHang = f.nhaSanXuat || []; selectedSP = f.tenSanPham || [];
            searchNganh = ''; searchNhom = ''; searchHang = ''; searchProduct = '';
        } else resetForm();

        const rawStoreData = $ycxData || [];
        if (rawStoreData.length > 0 && distinctCache.length === 0) {
            isProcessingData = true; setTimeout(() => { buildDictionary(rawStoreData); }, 50); 
        } else if (distinctCache.length > 0) triggerUpdateOptions();
    }
    $: if (!isOpen) wasOpen = false;

    // --- LOGIC DICTIONARY & SEARCH (GIỮ NGUYÊN BẢO VỆ HIỆU NĂNG) ---
    let distinctCache = []; let listNganhHang = []; let listNhomHang = []; let listHang = []; let listSanPham = [];
    let dispNganh = []; let dispNhom = []; let dispHang = []; let dispSP = [];
    $: setNganh = new Set(selectedNganh); $: setNhom = new Set(selectedNhom); $: setHang = new Set(selectedHang); $: setSP = new Set(selectedSP);

    function toggleSelection(type, item, isChecked) {
        if (type === 'nganh') selectedNganh = isChecked ? [...selectedNganh, item] : selectedNganh.filter(x => x !== item);
        else if (type === 'nhom') selectedNhom = isChecked ? [...selectedNhom, item] : selectedNhom.filter(x => x !== item);
        else if (type === 'hang') selectedHang = isChecked ? [...selectedHang, item] : selectedHang.filter(x => x !== item);
        else if (type === 'sp') selectedSP = isChecked ? [...selectedSP, item] : selectedSP.filter(x => x !== item);
    }

    function buildDictionary(rawData) {
        const uniqueSet = new Set(); const tempArr = [];
        for (let i = 0; i < rawData.length; i++) {
            const r = rawData[i];
            const nganh = r.nganhHang ? String(r.nganhHang).trim() : ''; const nhom = r.nhomHang ? String(r.nhomHang).trim() : '';
            const hang = r.nhaSanXuat ? String(r.nhaSanXuat).trim() : ''; const sp = r.tenSanPham ? String(r.tenSanPham).trim() : '';
            const hash = nganh + '|' + nhom + '|' + hang + '|' + sp;
            if (!uniqueSet.has(hash)) { uniqueSet.add(hash); tempArr.push({ nganh, nhom, hang, sp }); }
        }
        distinctCache = tempArr; triggerUpdateOptions();
    }

    function triggerUpdateOptions() {
        if (!isOpen || distinctCache.length === 0) return;
        setTimeout(() => {
            const tempNganh = new Set(); const tempNhom = new Set(); const tempHang = new Set(); const tempSP = new Set();
            for (let i = 0; i < distinctCache.length; i++) {
                const r = distinctCache[i];
                if (r.nganh) tempNganh.add(r.nganh);
                const matchNganh = setNganh.size === 0 || setNganh.has(r.nganh);
                if (matchNganh && r.nhom) tempNhom.add(r.nhom);
                const matchNhom = setNhom.size === 0 || setNhom.has(r.nhom);
                if (matchNganh && matchNhom && r.hang) tempHang.add(r.hang);
                const matchHang = setHang.size === 0 || setHang.has(r.hang);
                if (matchNganh && matchNhom && matchHang && r.sp) tempSP.add(r.sp);
            }
            listNganhHang = [...tempNganh].sort(); listNhomHang = [...tempNhom].sort();
            listHang = [...tempHang].sort(); listSanPham = [...tempSP].sort();
            updateDisplayNodes(); isProcessingData = false;
        }, 10);
    }

    $: if (selectedNganh || selectedNhom || selectedHang) { if (isOpen && distinctCache.length > 0 && !isProcessingData) triggerUpdateOptions(); }

    function updateDisplayNodes() {
        dispNganh = listNganhHang.filter(p => p.toLowerCase().includes(searchNganh.toLowerCase())).slice(0, 100);
        dispNhom = listNhomHang.filter(p => p.toLowerCase().includes(searchNhom.toLowerCase())).slice(0, 100);
        dispHang = listHang.filter(p => p.toLowerCase().includes(searchHang.toLowerCase())).slice(0, 100);
        dispSP = listSanPham.filter(p => p.toLowerCase().includes(searchProduct.toLowerCase())).slice(0, 100);
    }
    $: if (searchNganh !== undefined || searchNhom !== undefined || searchHang !== undefined || searchProduct !== undefined) {
        if (isOpen && distinctCache.length > 0 && !isProcessingData) updateDisplayNodes();
    }

    function selectAll(type) {
        if (type === 'nganh') selectedNganh = searchNganh ? [...new Set([...selectedNganh, ...dispNganh])] : [];
        if (type === 'nhom') selectedNhom = searchNhom ? [...new Set([...selectedNhom, ...dispNhom])] : [];
        if (type === 'hang') selectedHang = searchHang ? [...new Set([...selectedHang, ...dispHang])] : [];
        if (type === 'sp') selectedSP = searchProduct ? [...new Set([...selectedSP, ...dispSP])] : [];
    }
    function clearAll(type) {
        if (type === 'nganh') selectedNganh = []; if (type === 'nhom') selectedNhom = [];
        if (type === 'hang') selectedHang = []; if (type === 'sp') selectedSP = [];
    }

    function resetForm() {
        editId = null; title = ''; dateMode = 'rolling'; rollingDays = 5; customStartDate = ''; customEndDate = '';
        viewMode = 'METRIC'; metricId = 'TY_LE_QUY_DOI'; rawType = 'revenue'; showTotalColumn = true; showAverageColumn = true;
        selectedNganh = []; selectedNhom = []; selectedHang = []; selectedSP = []; searchNganh = ''; searchNhom = ''; searchHang = ''; searchProduct = '';
        isCreatingMetric = false; resetBuilder();
    }
    function resetBuilder() {
        indLabel = ''; indType = 'PERCENT'; indMetricBase = 'REAL'; indTarget = 0;
        indNumerator = []; indDenominator = []; indActiveContext = 'numerator'; rightPanelMode = 'group';
    }

    function close() { modalState.update(s => ({ ...(s || {}), activeModal: null, payload: null })); resetForm(); }

    // --- TƯƠNG TÁC BUILDER ---
    function handleBuilderSelectionChange(e) {
        const items = e.detail;
        if (indActiveContext === 'numerator') indNumerator = items;
        else if (indActiveContext === 'denominator') indDenominator = items;
    }

    async function handleSaveCustomMetric() {
        if (!indLabel.trim()) return alert("Vui lòng nhập Tên chỉ số");
        if (indNumerator.length === 0) return alert("Vui lòng chọn ít nhất 1 mục cho Tử số");
        isSaving = true;
        try {
            const newMetric = {
                id: `custom_${Date.now()}`, label: indLabel, type: indType, metricBase: indMetricBase, target: indTarget,
                groupA: indNumerator, groupB: indDenominator, percentMetric: indMetricBase === 'REAL' ? 'DT' : 'DTQD'
            };
            // Lưu vào kho chung để các Tab khác dùng ké (Lựa chọn B)
            const updated = [...$warehouseCustomMetrics, newMetric];
            // Giả định hàm lưu (Nếu tên hàm thật khác, cơ chế store vẫn tự update ui)
            if (datasyncService.saveCustomMetrics) await datasyncService.saveCustomMetrics($selectedWarehouse, updated); 
            warehouseCustomMetrics.set(updated);
            
            metricId = newMetric.id; // Tự động chọn chỉ số vừa tạo
            isCreatingMetric = false; // Đóng giao diện Builder
            resetBuilder();
        } catch (error) { alert("Lỗi tạo chỉ số: " + error.message); } finally { isSaving = false; }
    }

    // --- LƯU BẢNG XU HƯỚNG ---
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
                viewMode, metricId, rawType, showTotalColumn, showAverageColumn, filters: packedFilters, visible: true
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
                    <p class="mt-4 font-bold text-blue-800 text-sm">Đang nạp dữ liệu khổng lồ...</p>
                </div>
            {/if}

            <div class="p-4 border-b flex flex-col md:flex-row justify-between items-center bg-blue-50 flex-shrink-0 gap-4">
                <h3 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    {editId ? 'Sửa Bảng Xu Hướng' : 'Cấu Hình Bảng Mới'}
                </h3>
                
                <div class="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button class="px-5 py-2 text-xs font-bold rounded-md transition-colors {viewMode === 'METRIC' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}" on:click={() => {viewMode = 'METRIC'; isCreatingMetric = false;}}>
                        BẢNG CHỈ SỐ %
                    </button>
                    <button class="px-5 py-2 text-xs font-bold rounded-md transition-colors {viewMode === 'RAW' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}" on:click={() => {viewMode = 'RAW'; isCreatingMetric = false;}}>
                        BẢNG DỮ LIỆU THÔ
                    </button>
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
                                <p class="text-[10px] text-gray-400 mt-2 italic">* Tự động lùi {rollingDays} ngày từ hôm qua.</p>
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
                            <input type="checkbox" bind:checked={showTotalColumn} class="w-4 h-4 text-blue-600 rounded cursor-pointer">
                            <span class="text-sm font-bold text-gray-700">Cột Tổng cộng (Sum)</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" bind:checked={showAverageColumn} class="w-4 h-4 text-blue-600 rounded cursor-pointer">
                            <span class="text-sm font-bold text-gray-700">Cột Trung bình (Avg)</span>
                        </label>
                    </div>
                </div>

                <div class="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
                    
                    {#if viewMode === 'METRIC'}
                        <div class="flex flex-col h-full overflow-y-auto p-6 items-center">
                            
                            <div class="w-full max-w-4xl bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between gap-4 mb-6">
                                <div class="flex-1">
                                    <label class="block text-xs font-bold text-blue-600 uppercase mb-1">Chỉ số phân tích</label>
                                    {#if isCreatingMetric}
                                        <div class="px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-sm font-bold text-orange-800">
                                            Đang ở chế độ tạo chỉ số mới
                                        </div>
                                    {:else}
                                        <select bind:value={metricId} class="w-full px-3 py-2 border border-blue-300 rounded-md text-sm font-bold text-blue-900 bg-blue-50 outline-none cursor-pointer focus:ring-2 focus:ring-blue-400">
                                            {#each combinedMetrics as m}<option value={m.id}>{m.label}</option>{/each}
                                        </select>
                                    {/if}
                                </div>
                                <div class="w-px h-10 bg-gray-200"></div>
                                <div>
                                    {#if isCreatingMetric}
                                        <button class="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition" on:click={() => isCreatingMetric = false}>Trở về chọn có sẵn</button>
                                    {:else}
                                        <button class="px-4 py-2 text-sm font-bold text-white bg-orange-500 rounded-lg shadow-md hover:bg-orange-600 transition flex items-center gap-2" on:click={() => isCreatingMetric = true}>
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                                            Tự tạo chỉ số mới
                                        </button>
                                    {/if}
                                </div>
                            </div>

                            {#if isCreatingMetric}
                                <div class="w-full max-w-5xl flex gap-5 bg-white border border-orange-200 rounded-xl shadow p-5 animate-fade-in">
                                    <div class="w-[300px] flex-shrink-0">
                                        <IndicatorBuilder 
                                            bind:label={indLabel} bind:type={indType} bind:metricBase={indMetricBase} bind:target={indTarget}
                                            bind:activeContext={indActiveContext}
                                            numeratorCount={indNumerator.length} denominatorCount={indDenominator.length}
                                        />
                                        <button on:click={handleSaveCustomMetric} class="mt-4 w-full py-2.5 bg-orange-600 text-white font-bold rounded-lg shadow hover:bg-orange-700 transition" disabled={isSaving}>
                                            Lưu vào Kho Chỉ Số
                                        </button>
                                    </div>
                                    <div class="flex-1 border border-gray-200 rounded-xl overflow-hidden min-h-[400px]">
                                        <UniversalCategorySelector 
                                            bind:mode={rightPanelMode} 
                                            selectedItems={indActiveContext === 'numerator' ? indNumerator : indDenominator} 
                                            on:selectionChange={handleBuilderSelectionChange} 
                                        />
                                    </div>
                                </div>
                            {:else}
                                <div class="w-full max-w-4xl text-center mt-4">
                                    <h4 class="font-bold text-gray-800 text-lg mb-4">Mô phỏng thuật toán</h4>
                                    {#if detailedFormula}
                                        <div class="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-6 text-left relative overflow-hidden">
                                            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-orange-400"></div>
                                            <div class="flex-1 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                <p class="text-[11px] text-blue-600 uppercase font-black tracking-widest mb-2 border-b border-blue-200 pb-2">Tử số (Cộng gộp)</p>
                                                <ul class="list-disc list-inside text-sm font-bold text-gray-700 space-y-1">
                                                    {#each detailedFormula.numList as item}<li>{item}</li>{/each}
                                                </ul>
                                            </div>
                                            <div class="flex flex-col items-center justify-center text-gray-400 font-black text-2xl">÷</div>
                                            <div class="flex-1 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                                                <p class="text-[11px] text-orange-600 uppercase font-black tracking-widest mb-2 border-b border-orange-200 pb-2">Mẫu số (Cộng gộp)</p>
                                                <ul class="list-disc list-inside text-sm font-bold text-gray-700 space-y-1">
                                                    {#each detailedFormula.denList as item}<li>{item}</li>{/each}
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="mt-4 inline-block bg-white px-5 py-2 rounded-full border border-gray-200 shadow-sm text-sm font-bold text-gray-600">Đơn vị: <span class="text-blue-700">{detailedFormula.unit}</span></div>
                                    {:else}
                                        <div class="bg-white border border-gray-200 p-6 rounded-xl shadow-sm inline-block min-w-[400px]">
                                            <p class="text-xs text-blue-500 uppercase font-black tracking-widest mb-3 border-b pb-2">CÔNG THỨC HỆ THỐNG</p>
                                            <p class="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-line">{formulaDesc}</p>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                    {:else}
                        <div class="flex flex-col h-full">
                            <div class="p-4 bg-white border-b border-gray-200 shrink-0">
                                <label class="text-xs font-bold text-orange-600 uppercase mb-2 block">Cấu hình Loại dữ liệu lấy thô</label>
                                <select bind:value={rawType} class="w-[300px] px-3 py-2 border border-orange-300 rounded-md text-sm font-bold text-orange-900 bg-orange-50 outline-none cursor-pointer focus:ring-2 focus:ring-orange-400">
                                    <option value="quantity">Lấy Số Lượng (Sản phẩm)</option>
                                    <option value="revenue">Lấy Doanh Thu Thực (Doanh số)</option>
                                    <option value="revenueQuyDoi">Lấy Doanh Thu Quy Đổi</option>
                                </select>
                                <p class="text-[11px] text-gray-500 mt-2">* Chế độ này sẽ tách bạch dữ liệu theo nhóm bộ lọc mà bạn tích chọn bên dưới.</p>
                            </div>

                            <div class="flex-1 flex overflow-hidden">
                                <div class="w-1/4 flex flex-col border-r border-gray-200 bg-white">
                                    <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                                        <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                            <span>1. Ngành {#if selectedNganh.length > 0}<span class="text-blue-600">({selectedNganh.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                                            <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('nganh')}>✓</button><button class="text-red-400" on:click={() => clearAll('nganh')}>✕</button></div>
                                        </div>
                                        <input type="text" bind:value={searchNganh} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
                                    </div>
                                    <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                        {#each dispNganh as item}
                                            <label class="flex items-start gap-2 p-1.5 hover:bg-blue-50 rounded cursor-pointer group"><input type="checkbox" checked={setNganh.has(item)} on:change={(e) => toggleSelection('nganh', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-700">{item}</span></label>
                                        {/each}
                                    </div>
                                </div>

                                <div class="w-1/4 flex flex-col border-r border-gray-200 bg-white">
                                    <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                                        <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                            <span>2. Nhóm {#if selectedNhom.length > 0}<span class="text-orange-600">({selectedNhom.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                                            <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('nhom')}>✓</button><button class="text-red-400" on:click={() => clearAll('nhom')}>✕</button></div>
                                        </div>
                                        <input type="text" bind:value={searchNhom} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
                                    </div>
                                    <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                        {#each dispNhom as item}
                                            <label class="flex items-start gap-2 p-1.5 hover:bg-orange-50 rounded cursor-pointer group"><input type="checkbox" checked={setNhom.has(item)} on:change={(e) => toggleSelection('nhom', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-700">{item}</span></label>
                                        {/each}
                                    </div>
                                </div>

                                <div class="w-1/4 flex flex-col border-r border-gray-200 bg-white">
                                    <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                                        <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                            <span>3. Hãng {#if selectedHang.length > 0}<span class="text-purple-600">({selectedHang.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                                            <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('hang')}>✓</button><button class="text-red-400" on:click={() => clearAll('hang')}>✕</button></div>
                                        </div>
                                        <input type="text" bind:value={searchHang} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
                                    </div>
                                    <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                        {#each dispHang as item}
                                            <label class="flex items-start gap-2 p-1.5 hover:bg-purple-50 rounded cursor-pointer group"><input type="checkbox" checked={setHang.has(item)} on:change={(e) => toggleSelection('hang', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-700">{item}</span></label>
                                        {/each}
                                    </div>
                                </div>

                                <div class="w-1/4 flex flex-col bg-white">
                                    <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-gray-50">
                                        <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                            <span>4. SP {#if selectedSP.length > 0}<span class="text-emerald-600">({selectedSP.length})</span>{:else}<span class="text-gray-400 lowercase">(tất cả)</span>{/if}</span>
                                            <div class="flex gap-2"><button class="text-blue-500" on:click={() => selectAll('sp')}>✓</button><button class="text-red-400" on:click={() => clearAll('sp')}>✕</button></div>
                                        </div>
                                        <input type="text" bind:value={searchProduct} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white" />
                                    </div>
                                    <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                        {#if dispSP.length === 0}<p class="text-center text-[10px] text-gray-400 mt-5">Trống.</p>
                                        {:else}
                                            {#each dispSP as item}
                                                <label class="flex items-start gap-2 p-1.5 hover:bg-emerald-50 rounded cursor-pointer group border-b border-gray-50 last:border-0"><input type="checkbox" checked={setSP.has(item)} on:change={(e) => toggleSelection('sp', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5"><span class="text-[11px] font-semibold text-gray-800 leading-snug">{item}</span></label>
                                            {/each}
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
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

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>