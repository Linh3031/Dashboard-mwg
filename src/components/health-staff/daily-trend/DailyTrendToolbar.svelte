<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure, brandList, modalState } from '../../../stores.js';
    import LuykeCategoryFilterBar from '../../luyke/sub/LuykeCategoryFilterBar.svelte';

    export let settings = {};
    export let allMetricsConfig = [];
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    const SYSTEM_METRICS = [
        { id: 'DTTL', label: 'Tổng Doanh Thu' }, { id: 'SL', label: 'Tổng Số Lượng' },
        { id: 'TY_LE_QUY_DOI', label: 'Tỷ Lệ Quy Đổi' }, { id: 'TY_LE_TRA_CHAM', label: 'Tỷ Lệ Trả Chậm' }
    ];

    $: dynamicMetrics = allMetricsConfig.map(m => ({ id: m.id, label: m.label }));
    $: combinedMetrics = [...SYSTEM_METRICS, ...dynamicMetrics];

    // Tạo Data cho Filter Component xịn của dự án
    const AVAILABLE_DIMENSIONS = [
        { id: 'nganhHang', label: 'Ngành hàng' },
        { id: 'nhomHang', label: 'Nhóm hàng' },
        { id: 'nhaSanXuat', label: 'Hãng (NSX)' }
    ];
    let activeDimensionIds = ['nganhHang', 'nhomHang', 'nhaSanXuat'];
    
    $: filterOptions = {
        nganhHang: [...new Set(($categoryStructure || []).map(c => c.nganhHang).filter(Boolean))].sort(),
        nhomHang: [...new Set(($categoryStructure || []).map(c => c.nhomHang).filter(Boolean))].sort(),
        nhaSanXuat: [...new Set(($brandList || []).map(b => b.name || b.nhaSanXuat).filter(Boolean))].sort()
    };

    let activeDays = 7; 
    
    function setQuickDays(days) {
        activeDays = days;
        const to = new Date(); const from = new Date();
        from.setDate(to.getDate() - days + 1);
        settings.startDate = from.toISOString().split('T')[0];
        settings.endDate = to.toISOString().split('T')[0];
    }

    function handleFilterChange(event) {
        const { key, selected } = event.detail;
        if (selected === undefined) { 
            const newFilters = { ...settings.filters }; delete newFilters[key]; settings.filters = newFilters; 
        } else {
            settings.filters = { ...settings.filters, [key]: selected };
        }
    }
</script>

<div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-4">
    <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
            <div class="p-2 bg-blue-100 rounded-lg text-blue-600"><i data-feather="trending-up" class="w-5 h-5"></i></div>
            <div>
                <h3 class="font-bold text-gray-800 text-lg uppercase">Phân tích Xu hướng ngày</h3>
                <p class="text-xs text-gray-500">Giám sát sự biến động của Doanh thu, Tỷ lệ hoặc Hàng hóa theo thời gian</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <button class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2" on:click={() => dispatch('generate')} disabled={isLoading}>
                {#if isLoading}
                    <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    Đang tính toán...
                {:else}
                    <i data-feather="play" class="w-4 h-4"></i> Tạo Bảng
                {/if}
            </button>
        </div>
    </div>

    <div class="flex flex-wrap items-end gap-5 bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative z-20">
        <div>
            <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Từ ngày</label>
            <input type="date" bind:value={settings.startDate} on:change={() => activeDays = null} class="px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 font-semibold text-gray-700" />
        </div>
        <div>
            <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Đến ngày</label>
            <input type="date" bind:value={settings.endDate} on:change={() => activeDays = null} class="px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500 font-semibold text-gray-700" />
        </div>
        
        <div class="flex gap-1 mb-1">
            {#each [3, 5, 7, 10] as day}
                <button 
                    class="px-3 py-1 text-xs font-semibold rounded border transition-colors {activeDays === day ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}" 
                    on:click={() => setQuickDays(day)}
                >
                    {day} ngày
                </button>
            {/each}
        </div>

        <div class="border-l border-gray-300 h-8 mx-2"></div>

        <div>
            <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Chế độ xem</label>
            <select bind:value={settings.viewMode} class="px-3 py-1.5 border border-gray-300 rounded text-sm font-bold bg-slate-50 text-slate-800 outline-none cursor-pointer">
                <option value="METRIC">Tỷ lệ & Chỉ số tổng</option>
                <option value="RAW">Theo dõi Hàng hóa (RAW)</option>
            </select>
        </div>

        {#if settings.viewMode === 'METRIC'}
            <div class="flex-1 min-w-[250px]">
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex justify-between">
                    <span>Chọn Chỉ Số</span>
                </label>
                <select bind:value={settings.metricId} class="w-full px-3 py-1.5 border border-blue-300 rounded text-sm bg-blue-50 font-bold text-blue-900 outline-none cursor-pointer">
                    {#each combinedMetrics as m}<option value={m.id}>{m.label}</option>{/each}
                </select>
            </div>
        {:else}
            <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Hiển thị</label>
                <select bind:value={settings.rawType} class="px-3 py-1.5 border border-orange-300 rounded text-sm bg-orange-50 font-bold text-orange-900 outline-none cursor-pointer">
                    <option value="quantity">Số Lượng</option>
                    <option value="revenue">Doanh Thu</option>
                </select>
            </div>
            
            <div class="flex-1 flex items-end gap-3 z-30 relative">
                <LuykeCategoryFilterBar 
                    allDimensions={AVAILABLE_DIMENSIONS} 
                    activeIds={activeDimensionIds} 
                    {filterOptions} 
                    currentFilters={settings.filters} 
                    on:filterChange={handleFilterChange} 
                />
                
                <div class="min-w-[150px]">
                    <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tên SP (Từ khóa)</label>
                    <input type="text" bind:value={settings.filters.tenSanPham} placeholder="Gõ tìm..." class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded outline-none focus:border-blue-500 font-medium" />
                </div>
            </div>
        {/if}
    </div>
</div>