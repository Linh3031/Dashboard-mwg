<script>
    import { afterUpdate } from 'svelte';
    import { competitionData, danhSachNhanVien, selectedWarehouse } from '../../stores.js';
    import { formatters } from '../../utils/formatters.js';

    import ThiDuaCompletionView from './sub/ThiDuaCompletionView.svelte';
    import ThiDuaSummaryView from './sub/ThiDuaSummaryView.svelte';
    import ThiDuaPersonalView from './sub/ThiDuaPersonalView.svelte';

    let viewType = 'completion'; // 'completion' | 'summary' | 'personal_target'
    let sortedData = [];
    let summary = {
        total: 0, achieved: 0, revenueTotal: 0, revenueAchieved: 0, quantityTotal: 0, quantityAchieved: 0, overallRate: 0
    };

    // --- TÍNH TỔNG NHÂN VIÊN ---
    let totalEmployees = 1;
    $: {
        let emps = $danhSachNhanVien || [];
        if ($selectedWarehouse) {
            emps = emps.filter(e => String(e.maKho) === String($selectedWarehouse) || String(e.MAKHO) === String($selectedWarehouse));
        }
        totalEmployees = emps.length > 0 ? emps.length : 1;
    }

    $: {
        const data = ($competitionData || []).map(item => { 
            const hoanThanhValue = (parseFloat(String(item.hoanThanh).replace('%','')) || 0); 
            return { ...item, hoanThanhValue: hoanThanhValue }; 
        });

        summary = data.reduce((acc, d) => {
            acc.total++;
            if (d.hoanThanhValue >= 100) acc.achieved++;
            if (d.type === 'doanhThu') { acc.revenueTotal++; if (d.hoanThanhValue >= 100) acc.revenueAchieved++; }
            if (d.type === 'soLuong') { acc.quantityTotal++; if (d.hoanThanhValue >= 100) acc.quantityAchieved++; }
            return acc;
        }, { total: 0, achieved: 0, revenueTotal: 0, revenueAchieved: 0, quantityTotal: 0, quantityAchieved: 0 });

        summary.overallRate = summary.total > 0 ? (summary.achieved / summary.total) * 100 : 0;
        sortedData = data;
    }

    function setViewType(newType) { viewType = newType; }

    function getRateColor(rate) {
        if (rate >= 80) return 'text-green-600';
        if (rate >= 50) return 'text-yellow-600';
        return 'text-red-600';
    }

    $: rateStyle = getRateColor(summary.overallRate);

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

{#snippet flatKpiCard(title, value, subText, icon, colorClass, barPercent = 0)}
    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex items-stretch justify-between relative overflow-hidden group">
        <div class="flex flex-col justify-between items-start z-10 mr-4 flex-grow">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 group-hover:bg-white group-hover:{colorClass} transition-colors">
                    <i data-feather={icon} class="w-4 h-4"></i>
                </div>
                <span class="text-xs font-extrabold uppercase text-gray-600 tracking-wider leading-tight">{title}</span>
            </div>
            <div class="w-full mt-auto pt-3">
                {#if barPercent > 0}
                    <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2 max-w-[100px]">
                        <div class="h-1.5 rounded-full {colorClass.replace('text-', 'bg-')}" style="width: {Math.min(barPercent, 100)}%"></div>
                    </div>
                {/if}
                <div class="text-[11px] font-semibold text-gray-400 leading-snug">{@html subText}</div>
            </div>
        </div>
        <div class="flex items-center justify-end z-10 flex-shrink-0">
            <span class="text-5xl font-black {colorClass} tracking-tighter leading-none drop-shadow-sm">{value}</span>
        </div>
    </div>
{/snippet}

<div class="luyke-dashboard-container" data-capture-group="kpi-thidua">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {@render flatKpiCard('Tổng Chương trình', summary.total, `DT: <strong class="text-blue-600">${summary.revenueTotal}</strong> • SL: <strong class="text-orange-600">${summary.quantityTotal}</strong>`, 'layers', 'text-gray-700')}
        {@render flatKpiCard('Tỷ lệ Đạt', formatters.formatPercentage(summary.overallRate / 100), `Đã đạt: <strong class="${getRateColor(summary.overallRate)}">${summary.achieved}</strong> / ${summary.total}`, 'target', getRateColor(summary.overallRate), summary.overallRate)}
        {@render flatKpiCard('Thi đua Doanh thu', `${summary.revenueAchieved}/${summary.revenueTotal}`, `Tỷ lệ đạt: <strong>${summary.revenueTotal > 0 ? formatters.formatPercentage(summary.revenueAchieved / summary.revenueTotal) : '0%'}</strong>`, 'dollar-sign', 'text-blue-600', summary.revenueTotal > 0 ? (summary.revenueAchieved / summary.revenueTotal) * 100 : 0)}
        {@render flatKpiCard('Thi đua Số lượng', `${summary.quantityAchieved}/${summary.quantityTotal}`, `Tỷ lệ đạt: <strong>${summary.quantityTotal > 0 ? formatters.formatPercentage(summary.quantityAchieved / summary.quantityTotal) : '0%'}</strong>`, 'box', 'text-orange-600', summary.quantityTotal > 0 ? (summary.quantityAchieved / summary.quantityTotal) * 100 : 0)}
    </div>

    <div class="luyke-tier-2-container">
        <div class="luyke-toolbar">
            <div class="luyke-toolbar-left">
                <div class="text-lg font-bold uppercase flex items-center gap-2 text-gray-700">
                    {#if viewType === 'personal_target'}
                        <span class="flex items-center"><i data-feather="target" class="text-indigo-600"></i></span> Target Cá Nhân ({summary.total})
                    {:else}
                        <span class="flex items-center"><i data-feather="list" class="text-blue-600"></i></span> Chi tiết ({summary.total})
                        <span class="text-[11px] text-red-500 font-normal normal-case italic ml-2 mt-1">* bấm vào ngành hàng để xem theo nhân viên</span>
                    {/if}
                </div>
            </div>
            
            <div class="luyke-toolbar-right flex items-center gap-2">
                <div class="inline-flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button class="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-colors {viewType === 'completion' ? 'bg-white text-blue-600 shadow-sm pointer-events-none' : 'text-gray-500 hover:text-gray-900'}" on:click={() => setViewType('completion')}>
                        <i data-feather="check-circle" class="w-4 h-4 mr-1.5"></i><span class="hidden sm:inline">Tiến độ</span>
                    </button>
                    <button class="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-colors {viewType === 'summary' ? 'bg-white text-blue-600 shadow-sm pointer-events-none' : 'text-gray-500 hover:text-gray-900'}" on:click={() => setViewType('summary')}>
                        <i data-feather="grid" class="w-4 h-4 mr-1.5"></i><span class="hidden sm:inline">Theo Loại</span>
                    </button>
                    <button class="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-colors {viewType === 'personal_target' ? 'bg-indigo-600 text-white shadow-sm pointer-events-none' : 'text-gray-500 hover:text-gray-900'}" on:click={() => setViewType('personal_target')}>
                        <i data-feather="target" class="w-4 h-4 mr-1.5"></i><span class="hidden sm:inline">Target NV</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl min-h-[400px]">
            {#if sortedData.length === 0}
                <div class="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p class="text-gray-500 font-bold mb-2">Chưa có dữ liệu hiển thị.</p>
                    <p class="text-xs text-gray-400">Vui lòng dán "Data lũy kế" ở tab Cập nhật dữ liệu.</p>
                </div>
            {:else}
                <div class="flex flex-col gap-8">
                    {#if viewType === 'summary'}
                        <ThiDuaSummaryView {sortedData} />
                    {:else if viewType === 'completion'}
                        <ThiDuaCompletionView {sortedData} />
                    {:else if viewType === 'personal_target'}
                        <ThiDuaPersonalView {sortedData} {totalEmployees} />
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Tổng quan container khi capture */
    :global(.capture-container .luyke-dashboard-container) { width: 1100px !important; min-width: 1100px !important; background-color: white; padding: 20px !important; }
    
    /* Lưới của 2 mode cũ - ĐÃ KHÓA SCOPE VÀO .luyke-dashboard-container */
    :global(.capture-container .luyke-dashboard-container .grid:not(.personal-target-grid)) { 
        display: grid !important; 
        grid-template-columns: repeat(4, 1fr) !important; 
        gap: 16px !important; 
    }
    
    /* ÉP LƯỚI CHO MODE GIAO VIỆC - ĐÃ KHÓA SCOPE VÀO .luyke-dashboard-container */
    :global(.capture-container .luyke-dashboard-container .personal-target-grid) {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        width: 100% !important;
        gap: 16px !important;
    }
    :global(.capture-container .luyke-dashboard-container .personal-target-grid > div) { page-break-inside: avoid; }
    
    /* Xử lý font chống rớt chữ khi chụp ảnh chung */
    /* [CODEGENESIS] PHẪU THUẬT LOGIC 3A: Tăng line-height và padding-bottom cho tên ngành hàng để không mất chân */
    :global(.capture-container .capture-pt-title) { 
        font-size: 17px !important;
        line-height: 1.4 !important; 
        padding-bottom: 4px !important;
    }
    
    /* [CODEGENESIS] PHẪU THUẬT LOGIC 3B: Tăng line-height và padding-bottom cho giá trị target để không mất chân */
    :global(.capture-container .capture-pt-value) { 
        font-size: 34px !important;
        line-height: 1.2 !important; 
        padding-bottom: 6px !important;
    }
    
    :global(.capture-container h4) { font-size: 16px !important; }
    :global(.capture-container .luyke-toolbar-right) { display: none !important; }

    /* --- FIX LỖI RỚT ICON VÀ TEXT TRONG HEADER CỦA CHẾ ĐỘ GIAO TARGET --- */
    :global(.capture-container .capture-target-header-left) { 
        align-items: flex-start !important;
        padding-top: 4px !important; 
    }
    :global(.capture-container .capture-target-icon-box) { 
        display: flex !important;
        align-items: flex-start !important; 
        padding-top: 8px !important; 
        justify-content: center !important;
    }
    :global(.capture-container .capture-target-text-group) { 
        display: block !important;
    }
    :global(.capture-container .capture-target-title) { 
        line-height: 1.2 !important;
        margin-bottom: 2px !important; 
    }
    :global(.capture-container .capture-target-sub) { 
        line-height: 1.2 !important;
        display: block !important; 
        height: auto !important; 
        overflow: visible !important; 
    }

    /* --- [CODEGENESIS] FIX LỖI MẤT CHÂN CHỮ TÊN NGÀNH HÀNG & GIÁ TRỊ TRONG Ô DỮ LIỆU --- */
    :global(.capture-container .capture-pt-target-name) { 
        align-items: flex-start !important;
        justify-content: flex-start !important;
    }

    :global(.capture-container .capture-pt-value-right) { 
        align-items: flex-start !important;
        justify-content: flex-start !important;
        padding-top: 10px !important; 
    }

    :global(.capture-container .capture-pt-value-right .capture-pt-value) {
        text-align: right !important;
        width: 100% !important;
    }
</style>