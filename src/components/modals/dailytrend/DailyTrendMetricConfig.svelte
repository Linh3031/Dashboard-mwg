<script>
    import { warehouseCustomMetrics, selectedWarehouse } from '../../../stores.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    import IndicatorBuilder from '../IndicatorBuilder.svelte';
    import UniversalCategorySelector from '../UniversalCategorySelector.svelte';

    export let metricId = 'TY_LE_QUY_DOI';
    export let metricTarget = 0; // [NEW]: Liên kết mục tiêu
    export let isCreatingMetric = false;
    export let allMetricsConfig = [];
    export let distinctCache = [];

    let indLabel = ''; let indType = 'PERCENT'; let indMetricBase = 'REAL';
    let indTarget = 0;
    let indNumerator = []; let indDenominator = []; let indActiveContext = 'numerator';
    let rightPanelMode = 'group';
    let isSaving = false;

    const SYSTEM_METRICS = [
        { id: 'DTTL', label: 'Tổng Doanh Thu' }, { id: 'SL', label: 'Tổng Số Lượng' },
        { id: 'TY_LE_QUY_DOI', label: 'Tỷ Lệ Quy Đổi' }, { id: 'TY_LE_TRA_CHAM', label: 'Tỷ Lệ Trả Chậm' }
    ];

    $: dynamicMetrics = allMetricsConfig.map(m => ({ id: m.id, label: m.label }));
    $: combinedMetrics = [...SYSTEM_METRICS, ...dynamicMetrics];

    $: formulaDesc = getFormulaDesc(metricId, allMetricsConfig);
    $: detailedFormula = getFormulaDetailedDesc(metricId, allMetricsConfig, distinctCache);

    function getFormulaDesc(id, configs) {
        if (id === 'DTTL') return "Tính Tổng Doanh Thu Thực Tế (Loại bỏ Đổi trả/Hủy).";
        if (id === 'SL') return "Đếm Tổng Số Lượng Sản Phẩm Bán Ra.";
        if (id === 'TY_LE_QUY_DOI') return "(Tổng DT Quy Đổi ÷ Tổng DT Thực Tế) - 1";
        if (id === 'TY_LE_TRA_CHAM') return "Tổng DT Trả Chậm ÷ Tổng DT Thực Tế";
        return "Cấu hình tùy chọn...";
    }

    // [FIX]: Dịch từ "Mã" sang "Mã - Tên đầy đủ" siêu tốc
    function getFormulaDetailedDesc(id, configs, cache) {
        if (['DTTL', 'SL', 'TY_LE_QUY_DOI', 'TY_LE_TRA_CHAM'].includes(id)) return null;
        const cfg = configs.find(m => m.id === id);
        if (!cfg) return null;
        
        const mapIdToName = (targetId) => {
            if (!cache || cache.length === 0) return targetId;
            const strId = String(targetId).trim().toLowerCase();
            
            for (let i = 0; i < cache.length; i++) {
                const nganh = String(cache[i].nganh);
                const nhom = String(cache[i].nhom);
                if (nganh.toLowerCase() === strId || nganh.toLowerCase().startsWith(strId + ' -')) return nganh;
                if (nhom.toLowerCase() === strId || nhom.toLowerCase().startsWith(strId + ' -')) return nhom;
            }
            return `${targetId}`;
        };
        
        return {
            numList: (cfg.groupA || []).map(mapIdToName),
            denList: (cfg.groupB || []).map(mapIdToName),
            unit: cfg.percentMetric === 'SL' ? 'Số Lượng' : (cfg.percentMetric === 'DTQD' ? 'DT Quy Đổi' : 'DT Thực')
        };
    }

    function handleBuilderSelectionChange(e) {
        if (indActiveContext === 'numerator') indNumerator = e.detail;
        else indDenominator = e.detail;
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
            const updated = [...$warehouseCustomMetrics, newMetric];
            if (datasyncService.saveCustomMetrics) await datasyncService.saveCustomMetrics($selectedWarehouse, updated);
            warehouseCustomMetrics.set(updated);
            metricId = newMetric.id; 
            isCreatingMetric = false;
            resetBuilder();
        } catch (error) { alert("Lỗi tạo chỉ số: " + error.message); } finally { isSaving = false; }
    }

    export function resetBuilder() {
        indLabel = ''; indType = 'PERCENT'; indMetricBase = 'REAL'; indTarget = 0;
        indNumerator = []; indDenominator = []; indActiveContext = 'numerator'; rightPanelMode = 'group';
        isCreatingMetric = false;
    }
</script>

<div class="flex flex-col h-full overflow-y-auto p-6 items-center">
    <div class="w-full max-w-4xl bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between gap-4 mb-6">
        <div class="flex-1 flex gap-4 items-end">
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

            {#if !isCreatingMetric}
                <div class="w-32 border-l-2 pl-4 border-gray-100">
                    <label class="block text-[11px] font-bold text-red-500 uppercase mb-1 whitespace-nowrap">Mục tiêu(%)</label>
                    <input type="number" bind:value={metricTarget} min="0" placeholder="VD: 85" class="w-full px-3 py-2 border border-red-300 rounded-md text-sm font-bold text-red-700 bg-red-50 focus:ring-1 focus:ring-red-500 outline-none placeholder-red-300" />
                </div>
            {/if}
        </div>
        
        <div class="w-px h-10 bg-gray-200 ml-2"></div>
        
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

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>