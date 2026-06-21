<script>
    import { modalState, dailyTrendConfigs, selectedWarehouse, efficiencyConfig, warehouseCustomMetrics, ycxData } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';

    // [GIẢI PHÁP PORTAL]: Nhổ Modal khỏi Tab hiện tại, cắm thẳng vào Body để không bị CSS của cha làm lệch vị trí
    function portal(node) {
        if (typeof document !== 'undefined') {
            document.body.appendChild(node);
        }
        return {
            destroy() {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            }
        };
    }

    $: isOpen = $modalState?.activeModal === 'add-daily-trend-modal';

    let editId = null;
    let title = '';
    let dateMode = 'rolling';
    let rollingDays = 5;
    let customStartDate = '';
    let customEndDate = '';
    let viewMode = 'METRIC';
    let metricId = 'TY_LE_QUY_DOI';
    let rawType = 'revenue';
    let showSummaryColumn = true;
    
    // Mảng độc lập chống giật
    let selectedNganh = [];
    let selectedNhom = [];
    let selectedHang = [];
    let selectedSP = [];

    let isSaving = false;
    let searchNganh = ''; let searchNhom = ''; let searchHang = ''; let searchProduct = '';
    let isProcessingData = false;

    const SYSTEM_METRICS = [
        { id: 'DTTL', label: 'Tổng Doanh Thu' }, { id: 'SL', label: 'Tổng Số Lượng' },
        { id: 'TY_LE_QUY_DOI', label: 'Tỷ Lệ Quy Đổi' }, { id: 'TY_LE_TRA_CHAM', label: 'Tỷ Lệ Trả Chậm' }
    ];
    
    $: allMetricsConfig = [...($efficiencyConfig || []), ...($warehouseCustomMetrics || [])];
    $: dynamicMetrics = allMetricsConfig.map(m => ({ id: m.id, label: m.label }));
    $: combinedMetrics = [...SYSTEM_METRICS, ...dynamicMetrics];
    $: formulaDesc = getFormulaDesc(metricId, allMetricsConfig);
    
    function getFormulaDesc(id, configs) {
        if (id === 'DTTL') return "Tính Tổng Doanh Thu Thực Tế (Hệ thống đã tự động loại bỏ các đơn Đổi trả/Hủy).";
        if (id === 'SL') return "Đếm Tổng Số Lượng Sản Phẩm Bán Ra (Đã loại trừ hàng trả/hủy).";
        if (id === 'TY_LE_QUY_DOI') return "(Tổng Doanh Thu Quy Đổi ÷ Tổng Doanh Thu Thực Tế) - 1";
        if (id === 'TY_LE_TRA_CHAM') return "Tổng Doanh Thu Trả Góp & Trả Chậm ÷ Tổng Doanh Thu Thực Tế";
        const cfg = configs.find(m => m.id === id);
        if (!cfg) return "Đang tải cấu hình...";
        const num = (cfg.groupA || []).join(', ');
        const den = (cfg.groupB || []).join(', ');
        const unit = cfg.percentMetric === 'SL' ? 'Số Lượng' : (cfg.percentMetric === 'DTQD' ? 'Doanh Thu Quy Đổi' : 'Doanh Thu Thực');
        return `Tử số: [${num}] \n÷\n Mẫu số: [${den}]\n(Đơn vị tính: ${unit})`;
    }

    let wasOpen = false;
    
    $: if (isOpen && !wasOpen) {
        wasOpen = true;
        if ($modalState?.payload) {
            const p = $modalState.payload;
            editId = p.id;
            title = p.title || '';
            dateMode = p.dateMode || 'rolling';
            rollingDays = p.rollingDays || 5;
            customStartDate = p.customStartDate || '';
            customEndDate = p.customEndDate || '';
            viewMode = p.viewMode || 'METRIC';
            metricId = p.metricId || 'TY_LE_QUY_DOI';
            rawType = p.rawType || 'revenue';
            showSummaryColumn = p.showSummaryColumn !== false;
            
            const f = p.filters || { nganhHang: [], nhomHang: [], nhaSanXuat: [], tenSanPham: [] };
            selectedNganh = f.nganhHang || [];
            selectedNhom = f.nhomHang || [];
            selectedHang = f.nhaSanXuat || [];
            selectedSP = f.tenSanPham || [];
            
            searchNganh = ''; searchNhom = ''; searchHang = ''; searchProduct = '';
        } else {
            resetForm();
        }

        const rawStoreData = $ycxData || [];
        if (rawStoreData.length > 0 && distinctCache.length === 0) {
            isProcessingData = true;
            setTimeout(() => { buildDictionary(rawStoreData); }, 50); 
        } else if (distinctCache.length > 0) {
            triggerUpdateOptions();
        }
    }
    $: if (!isOpen) wasOpen = false;

    let distinctCache = [];
    let listNganhHang = []; let listNhomHang = []; let listHang = []; let listSanPham = [];
    let dispNganh = []; let dispNhom = []; let dispHang = []; let dispSP = [];

    $: setNganh = new Set(selectedNganh);
    $: setNhom = new Set(selectedNhom);
    $: setHang = new Set(selectedHang);
    $: setSP = new Set(selectedSP);

    function toggleSelection(type, item, isChecked) {
        if (type === 'nganh') selectedNganh = isChecked ? [...selectedNganh, item] : selectedNganh.filter(x => x !== item);
        else if (type === 'nhom') selectedNhom = isChecked ? [...selectedNhom, item] : selectedNhom.filter(x => x !== item);
        else if (type === 'hang') selectedHang = isChecked ? [...selectedHang, item] : selectedHang.filter(x => x !== item);
        else if (type === 'sp') selectedSP = isChecked ? [...selectedSP, item] : selectedSP.filter(x => x !== item);
    }

    function buildDictionary(rawData) {
        const uniqueSet = new Set();
        const tempArr = [];
        for (let i = 0; i < rawData.length; i++) {
            const r = rawData[i];
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
        triggerUpdateOptions();
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
            
            updateDisplayNodes();
            isProcessingData = false;
        }, 10);
    }

    $: if (selectedNganh || selectedNhom || selectedHang) {
        if (isOpen && distinctCache.length > 0 && !isProcessingData) triggerUpdateOptions();
    }

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
        if (type === 'nganh') selectedNganh = [];
        if (type === 'nhom') selectedNhom = [];
        if (type === 'hang') selectedHang = [];
        if (type === 'sp') selectedSP = [];
    }

    function resetForm() {
        editId = null; title = ''; dateMode = 'rolling'; rollingDays = 5; customStartDate = ''; customEndDate = '';
        viewMode = 'METRIC'; metricId = 'TY_LE_QUY_DOI'; rawType = 'revenue'; showSummaryColumn = true;
        selectedNganh = []; selectedNhom = []; selectedHang = []; selectedSP = [];
        searchNganh = ''; searchNhom = ''; searchHang = ''; searchProduct = '';
    }

    function close() {
        modalState.update(s => ({ ...(s || {}), activeModal: null, payload: null }));
        resetForm();
    }

    async function handleSave() {
        if (!title.trim()) return alert("Vui lòng nhập tên bảng!");
        if (dateMode === 'custom' && (!customStartDate || !customEndDate)) return alert("Vui lòng chọn đầy đủ mốc ngày bắt đầu và kết thúc!");
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
                id: editId || `trend_${Date.now()}`,
                title: title.trim(), dateMode, rollingDays, customStartDate, customEndDate,
                viewMode, metricId, rawType, showSummaryColumn, filters: packedFilters, visible: true
            };
            
            let updatedConfigs;
            if (editId) {
                updatedConfigs = $dailyTrendConfigs.map(t => t.id === editId ? newTable : t);
            } else {
                updatedConfigs = [...$dailyTrendConfigs, newTable];
            }

            await datasyncService.saveDailyTrendConfigs($selectedWarehouse, updatedConfigs);
            dailyTrendConfigs.set(updatedConfigs);
            close();
        } catch (error) {
            alert("Lỗi khi lưu bảng: " + error.message);
        } finally {
            isSaving = false;
        }
    }
</script>

{#if isOpen}
    <div use:portal class="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-[1400px] flex flex-col relative max-h-[90vh] overflow-hidden">
            
            {#if isProcessingData}
                <div class="absolute inset-0 z-[1300] bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin shadow-md"></div>
                    <p class="mt-4 font-bold text-blue-800 text-sm">Đang nạp dữ liệu khổng lồ...</p>
                </div>
            {/if}

            <div class="p-4 border-b flex justify-between items-center bg-blue-50 flex-shrink-0">
                <h3 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    {editId ? 'Chỉnh sửa Bảng Xu Hướng' : 'Cấu Hình Bảng Xu Hướng Ngày'}
                </h3>
                <button class="text-gray-500 hover:text-red-500 text-2xl leading-none" on:click={close} disabled={isSaving}>&times;</button>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col xl:flex-row p-4 gap-5 bg-gray-50">
                
                <div class="w-full xl:w-[400px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 flex-shrink-0">
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tiêu đề bảng <span class="text-red-500">*</span></label>
                            <input type="text" bind:value={title} placeholder="VD: Xu hướng SIM 7 ngày..." class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900" />
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Thời gian lấy dữ liệu</label>
                            <div class="flex border rounded-md overflow-hidden mb-3">
                                <button class="flex-1 py-1.5 text-xs font-bold {dateMode === 'rolling' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}" on:click={() => dateMode = 'rolling'}>Trượt tự động</button>
                                <button class="flex-1 py-1.5 text-xs font-bold {dateMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}" on:click={() => dateMode = 'custom'}>Tùy chọn ngày</button>
                            </div>

                            {#if dateMode === 'rolling'}
                                <div class="flex flex-wrap gap-2">
                                    {#each [3, 5, 7, 10, 15] as days}
                                        <button class="flex-1 py-1.5 text-sm font-bold rounded-md border transition-all {rollingDays === days ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}" on:click={() => rollingDays = days}>{days}</button>
                                    {/each}
                                </div>
                                <p class="text-[11px] text-gray-400 mt-2 italic">* Tự động lùi {rollingDays} ngày (Bỏ qua hôm nay).</p>
                            {:else}
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="text-[10px] text-gray-500 uppercase font-bold">Từ ngày</label>
                                        <input type="date" bind:value={customStartDate} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-gray-500 uppercase font-bold">Đến ngày</label>
                                        <input type="date" bind:value={customEndDate} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            {/if}
                        </div>
                        
                        <div class="pt-3 border-t border-gray-100">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" bind:checked={showSummaryColumn} class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer">
                                <span class="text-sm font-bold text-gray-700 group-hover:text-blue-800 transition-colors">Hiển thị cột Tổng / Trung bình</span>
                            </label>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Chế độ xem</label>
                            <select bind:value={viewMode} class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-800 outline-none cursor-pointer">
                                <option value="METRIC">Tỷ lệ & Chỉ số %</option>
                                <option value="RAW">Dữ liệu Hàng Hóa Thô</option>
                            </select>
                        </div>

                        {#if viewMode === 'METRIC'}
                            <div class="space-y-2">
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Chỉ Số Hiển Thị</label>
                                <select bind:value={metricId} class="w-full px-3 py-2 border border-blue-300 rounded-md text-sm font-bold text-blue-900 bg-blue-50 outline-none cursor-pointer">
                                    {#each combinedMetrics as m}<option value={m.id}>{m.label}</option>{/each}
                                </select>
                            </div>
                        {:else}
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Loại Dữ Liệu</label>
                                <select bind:value={rawType} class="w-full px-3 py-2 border border-orange-300 rounded-md text-sm font-bold text-orange-900 bg-orange-50 outline-none cursor-pointer">
                                    <option value="quantity">Số Lượng</option>
                                    <option value="revenue">Doanh Thu Thực</option>
                                    <option value="revenueQuyDoi">Doanh Thu Quy Đổi</option>
                                </select>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-inner overflow-hidden relative min-h-[400px]">
                    
                    {#if viewMode === 'METRIC'}
                        <div class="flex-1 flex flex-col items-center justify-center p-10 text-center bg-slate-50/50">
                            <div class="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-200">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <h4 class="font-bold text-gray-800 text-xl mb-4">Mô phỏng thuật toán tính toán</h4>
                            
                            <div class="bg-white border border-gray-200 p-6 rounded-xl w-full max-w-2xl shadow-sm">
                                <p class="text-xs text-blue-500 uppercase font-black tracking-widest mb-3 border-b pb-2">CÔNG THỨC GỐC</p>
                                <p class="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-line">{formulaDesc}</p>
                            </div>
                            
                            <p class="text-[13px] font-medium text-gray-500 mt-6 max-w-lg">Hệ thống sẽ tự động quét và áp dụng đúng logic của chỉ số này cho từng ngày. Bạn không cần phải chọn tay bộ lọc.</p>
                        </div>
                    {:else}
                        <div class="flex-1 flex overflow-hidden">
                            <div class="w-1/4 flex flex-col border-r border-gray-200 bg-slate-50">
                                <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-white">
                                    <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                        <span>1. Ngành {#if selectedNganh.length > 0}<span class="text-blue-600">({selectedNganh.length})</span>{:else}<span class="text-gray-400 font-normal lowercase">(tất cả)</span>{/if}</span>
                                        <div class="flex gap-2">
                                            <button class="text-blue-500 hover:text-blue-700 font-black" on:click={() => selectAll('nganh')} title="Chọn tất cả">✓</button>
                                            <button class="text-red-400 hover:text-red-600 font-black" on:click={() => clearAll('nganh')} title="Bỏ chọn tất cả">✕</button>
                                        </div>
                                    </div>
                                    <input type="text" bind:value={searchNganh} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded outline-none bg-gray-50" />
                                </div>
                                <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                    {#each dispNganh as item}
                                        <label class="flex items-start gap-2 p-1.5 hover:bg-blue-100 rounded cursor-pointer group">
                                            <input type="checkbox" checked={setNganh.has(item)} on:change={(e) => toggleSelection('nganh', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5 rounded text-blue-600 shrink-0 cursor-pointer">
                                            <span class="text-[11px] font-semibold text-gray-700 group-hover:text-blue-900 leading-tight break-words">{item}</span>
                                        </label>
                                    {/each}
                                    {#if listNganhHang.length > 100}
                                        <div class="text-center text-[10px] text-gray-400 py-2 border-t border-gray-100 bg-gray-50">+ Các mục khác (Vui lòng tìm kiếm)</div>
                                    {/if}
                                </div>
                            </div>

                            <div class="w-1/4 flex flex-col border-r border-gray-200 bg-slate-50">
                                <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-white">
                                    <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                        <span>2. Nhóm {#if selectedNhom.length > 0}<span class="text-orange-600">({selectedNhom.length})</span>{:else}<span class="text-gray-400 font-normal lowercase">(tất cả)</span>{/if}</span>
                                        <div class="flex gap-2">
                                            <button class="text-blue-500 hover:text-blue-700 font-black" on:click={() => selectAll('nhom')} title="Chọn tất cả">✓</button>
                                            <button class="text-red-400 hover:text-red-600 font-black" on:click={() => clearAll('nhom')} title="Bỏ chọn tất cả">✕</button>
                                        </div>
                                    </div>
                                    <input type="text" bind:value={searchNhom} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded outline-none bg-gray-50" />
                                </div>
                                <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                    {#each dispNhom as item}
                                        <label class="flex items-start gap-2 p-1.5 hover:bg-orange-100 rounded cursor-pointer group">
                                            <input type="checkbox" checked={setNhom.has(item)} on:change={(e) => toggleSelection('nhom', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5 rounded text-orange-500 shrink-0 cursor-pointer">
                                            <span class="text-[11px] font-semibold text-gray-700 group-hover:text-orange-900 leading-tight break-words">{item}</span>
                                        </label>
                                    {/each}
                                    {#if listNhomHang.length > 100}
                                        <div class="text-center text-[10px] text-gray-400 py-2 border-t border-gray-100 bg-gray-50">+ Các mục khác (Vui lòng tìm kiếm)</div>
                                    {/if}
                                </div>
                            </div>

                            <div class="w-1/4 flex flex-col border-r border-gray-200 bg-slate-50">
                                <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-white">
                                    <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                        <span>3. Hãng {#if selectedHang.length > 0}<span class="text-purple-600">({selectedHang.length})</span>{:else}<span class="text-gray-400 font-normal lowercase">(tất cả)</span>{/if}</span>
                                        <div class="flex gap-2">
                                            <button class="text-blue-500 hover:text-blue-700 font-black" on:click={() => selectAll('hang')} title="Chọn tất cả">✓</button>
                                            <button class="text-red-400 hover:text-red-600 font-black" on:click={() => clearAll('hang')} title="Bỏ chọn tất cả">✕</button>
                                        </div>
                                    </div>
                                    <input type="text" bind:value={searchHang} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-gray-300 rounded outline-none bg-gray-50" />
                                </div>
                                <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                                    {#each dispHang as item}
                                        <label class="flex items-start gap-2 p-1.5 hover:bg-purple-100 rounded cursor-pointer group">
                                            <input type="checkbox" checked={setHang.has(item)} on:change={(e) => toggleSelection('hang', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5 rounded text-purple-600 shrink-0 cursor-pointer">
                                            <span class="text-[11px] font-semibold text-gray-700 group-hover:text-purple-900 leading-tight break-words">{item}</span>
                                        </label>
                                    {/each}
                                    {#if listHang.length > 100}
                                        <div class="text-center text-[10px] text-gray-400 py-2 border-t border-gray-100 bg-gray-50">+ Các mục khác (Vui lòng tìm kiếm)</div>
                                    {/if}
                                </div>
                            </div>

                            <div class="w-1/4 flex flex-col bg-slate-50">
                                <div class="px-2 py-2 border-b flex flex-col gap-1 shrink-0 bg-white">
                                    <div class="font-bold text-[11px] text-gray-600 uppercase flex justify-between items-center">
                                        <span>4. Sản Phẩm {#if selectedSP.length > 0}<span class="text-emerald-600">({selectedSP.length})</span>{:else}<span class="text-gray-400 font-normal lowercase">(tất cả)</span>{/if}</span>
                                        <div class="flex gap-2">
                                            <button class="text-blue-500 hover:text-blue-700 font-black" on:click={() => selectAll('sp')} title="Chọn tất cả">✓</button>
                                            <button class="text-red-400 hover:text-red-600 font-black" on:click={() => clearAll('sp')} title="Bỏ chọn tất cả">✕</button>
                                        </div>
                                    </div>
                                    <input type="text" bind:value={searchProduct} placeholder="Tìm..." class="w-full px-2 py-1 text-xs border border-emerald-300 rounded outline-none focus:border-emerald-500 bg-emerald-50" />
                                </div>
                                <div class="flex-1 overflow-y-auto p-1.5 custom-scrollbar bg-white">
                                    {#if dispSP.length === 0}
                                        <p class="text-center text-[10px] text-gray-400 mt-5">Trống.</p>
                                    {:else}
                                        {#each dispSP as item}
                                            <label class="flex items-start gap-2 p-1.5 hover:bg-emerald-50 rounded cursor-pointer group border-b border-gray-50 last:border-0">
                                                <input type="checkbox" checked={setSP.has(item)} on:change={(e) => toggleSelection('sp', item, e.target.checked)} class="mt-0.5 w-3.5 h-3.5 rounded text-emerald-600 shrink-0 cursor-pointer">
                                                <span class="text-[11px] font-semibold text-gray-800 group-hover:text-emerald-900 leading-snug break-words">{item}</span>
                                            </label>
                                        {/each}
                                        {#if listSanPham.length > 100}
                                            <div class="text-center text-[10px] text-gray-400 py-2 border-t border-gray-100 bg-gray-50">+ Các mục khác (Vui lòng tìm kiếm)</div>
                                        {/if}
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="p-4 border-t bg-white flex justify-end gap-3 flex-shrink-0">
                <button class="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors" on:click={close} disabled={isSaving}>Hủy</button>
                <button class="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2" on:click={handleSave} disabled={isSaving}>
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
</style>