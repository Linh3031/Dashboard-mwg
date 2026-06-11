<script>
    import { afterUpdate } from 'svelte';
    import { competitionData, danhSachNhanVien, clusterSummaryData, luykeNameMappings } from '../../stores.js';
    import { formatters } from '../../utils/formatters.js';

    // --- CƠ CHẾ ĐỊNH DANH TÊN SIÊU THỊ NHƯ CỤM DOANH THU ---
    function getWarehouseDisplayName(maKho) {
        if ($clusterSummaryData && $clusterSummaryData.chiTietKho) {
            const found = $clusterSummaryData.chiTietKho.find(k => String(k.maKho || k.storeId || '').trim() === String(maKho).trim());
            if (found && found.tenKho) return found.tenKho;
        }
        if ($danhSachNhanVien && $danhSachNhanVien.length > 0) {
            const found = $danhSachNhanVien.find(e => String(e.maKho || e.ma_kho || '').trim() === String(maKho).trim());
            if (found && found.tenKho) return found.tenKho;
            if (found && found.storeName) return found.storeName;
        }
        return "Siêu thị " + maKho;
    }

    // --- HÀM CHUẨN HÓA TÊN NGẮN ---
    function getShortName(item) {
        const mappingData = $luykeNameMappings && $luykeNameMappings[item.name];
        return (typeof mappingData === 'object' && mappingData !== null) ? (mappingData.shortName || item.name) : (mappingData || item.name);
    }

    // Mảng lưu danh sách kho và bản đồ dữ liệu phân rã
    let uniqueWarehouses = [];
    let warehouseDataMap = {};

    $: {
        const rawData = ($competitionData || []).map(item => { 
            const hoanThanhValue = (parseFloat(String(item.hoanThanh).replace('%','')) || 0); 
            return { ...item, hoanThanhValue: hoanThanhValue }; 
        });

        // --- CHẾ ĐỘ ALL KHO: PHÂN NHÓM VÀ TẠO THẺ ---
        const codes = [...new Set(rawData.map(item => String(item.maKho || 'N/A').trim()))].filter(c => c && c !== 'ALL' && c !== 'N/A');
        uniqueWarehouses = codes.sort();

        const tempMap = {};
        uniqueWarehouses.forEach(kho => {
            const khoItems = rawData.filter(item => String(item.maKho || '').trim() === kho);
            
            // TUYỆT ĐỐI KHÔNG CỘNG DỒN - LẤY SẴN SỐ LIỆU TỪ BI ĐỂ SẮP XẾP CAO XUỐNG THẤP
            const sortedKhoItems = [...khoItems].sort((a, b) => b.hoanThanhValue - a.hoanThanhValue);

            const khoSummary = sortedKhoItems.reduce((acc, d) => {
                acc.total++;
                if (d.hoanThanhValue >= 100) acc.achieved++;
                if (d.type === 'doanhThu') { acc.revenueTotal++; if (d.hoanThanhValue >= 100) acc.revenueAchieved++; }
                if (d.type === 'soLuong') { acc.quantityTotal++; if (d.hoanThanhValue >= 100) acc.quantityAchieved++; }
                return acc;
            }, { total: 0, achieved: 0, revenueTotal: 0, revenueAchieved: 0, quantityTotal: 0, quantityAchieved: 0 });
            khoSummary.overallRate = khoSummary.total > 0 ? (khoSummary.achieved / khoSummary.total) * 100 : 0;

            const groupDaDat = sortedKhoItems.filter(i => i.hoanThanhValue >= 100);
            const groupButToc = sortedKhoItems.filter(i => i.hoanThanhValue >= 70 && i.hoanThanhValue < 100);
            const groupBaoDong = sortedKhoItems.filter(i => i.hoanThanhValue < 70);

            tempMap[kho] = {
                items: sortedKhoItems,
                groups: { daDat: groupDaDat, butToc: groupButToc, baoDong: groupBaoDong },
                summary: khoSummary
            };
        });
        warehouseDataMap = tempMap;
    }

    function getRateColor(rate) {
        if (rate >= 100) return 'text-green-600';
        if (rate >= 70) return 'text-yellow-600';
        return 'text-red-600';
    }

    function getBadgeBg(rate) {
        if (rate >= 100) return 'bg-green-50 border-green-200';
        if (rate >= 70) return 'bg-yellow-50 border-yellow-200';
        return 'bg-red-50 border-red-200';
    }

    afterUpdate(() => { 
        if (typeof feather !== 'undefined') feather.replace(); 
        
        // Cố định tên fallback cho cả cụm dashboard nếu cần
        const captureContainer = document.querySelector('.luyke-dashboard-container');
        if (captureContainer) {
            captureContainer.setAttribute('data-capture-filename', 'Luy_Ke_Thi_Dua_Cum');
        }
    });
</script>

{#snippet miniKpiCard(title, value, subText, valueColor, bgClass, titleColor, subColor)}
    <div class="{bgClass} border rounded-xl p-3 flex items-center justify-between shadow-sm hover:shadow transition-shadow h-full min-h-[68px]">
        <div class="flex flex-col justify-center min-w-0 pr-2">
            <span class="text-[11px] md:text-xs font-black uppercase tracking-wider {titleColor} leading-none whitespace-nowrap">{title}</span>
            <span class="text-[9.5px] md:text-[10px] font-bold {subColor} opacity-80 mt-1.5 block whitespace-nowrap leading-none">{subText}</span>
        </div>
        <span class="text-2xl md:text-3xl font-black {valueColor} tracking-tighter leading-none whitespace-nowrap drop-shadow-sm flex-shrink-0">{value}</span>
    </div>
{/snippet}

{#snippet categoryBadge(item)}
    <div class="flex flex-col items-center justify-center p-1.5 rounded-md border shadow-sm {getBadgeBg(item.hoanThanhValue)} hover:shadow transition-shadow relative overflow-hidden group">
        <span class="text-[9px] font-bold text-gray-700 leading-tight w-full text-center line-clamp-2 h-6" title={item.name}>
            {getShortName(item)}
        </span>
        <span class="text-[13px] font-black mt-1 tracking-tighter {getRateColor(item.hoanThanhValue)} drop-shadow-sm">
            {item.hoanThanh || '0%'}
        </span>
    </div>
{/snippet}

<div class="grid gap-4 w-full items-stretch luyke-thidua-multi-columns" style="grid-template-columns: repeat({uniqueWarehouses.length || 1}, minmax(0, 1fr));">
    {#each uniqueWarehouses as kho}
        {@const khoData = warehouseDataMap[kho] || { items: [], groups: {daDat:[], butToc:[], baoDong:[]}, summary: { total:0, achieved:0, revenueTotal:0, revenueAchieved:0, quantityTotal:0, quantityAchieved:0, overallRate:0 } }}
        
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-w-[280px] luyke-thi-dua-kho-card"
             data-capture-group="competition-program"
             data-capture-filename="Luy_Ke_Thi_Dua_Kho_{kho}">
            
            <div class="bg-indigo-900 border-b border-indigo-950 p-2.5 flex items-center justify-between shadow-sm">
                <span class="font-bold text-white text-[13px] flex items-center gap-1 uppercase tracking-wide truncate max-w-[80%] drop-shadow-sm">
                    <i data-feather="map-pin" class="w-4 h-4 text-indigo-300"></i>
                    {getWarehouseDisplayName(kho)}
                </span>
                <span class="text-[10px] font-black bg-indigo-700 text-white px-2 py-0.5 rounded-full shadow-inner tracking-wider">{kho}</span>
            </div>

            <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 border-b border-gray-200" style="grid-template-columns: repeat(2, minmax(0, 1fr)) !important;">
                {@render miniKpiCard('Tổng', khoData.summary.total, `DT: ${khoData.summary.revenueTotal} • SL: ${khoData.summary.quantityTotal}`, 'text-blue-700', 'bg-blue-50 border-blue-200', 'text-blue-900', 'text-blue-700')}
                
                {@render miniKpiCard('% Đạt', formatters.formatPercentage(khoData.summary.overallRate / 100), `Đạt ${khoData.summary.achieved}/${khoData.summary.total}`, getRateColor(khoData.summary.overallRate), 'bg-green-50 border-green-200', 'text-green-900', 'text-green-700')}
                
                {@render miniKpiCard('ĐT DT', `${khoData.summary.revenueAchieved}/${khoData.summary.revenueTotal}`, `Tỷ lệ: ${khoData.summary.revenueTotal > 0 ? formatters.formatPercentage(khoData.summary.revenueAchieved / khoData.summary.revenueTotal) : '0%'}`, 'text-purple-700', 'bg-purple-50 border-purple-200', 'text-purple-900', 'text-purple-700')}
                
                {@render miniKpiCard('ĐT SL', `${khoData.summary.quantityAchieved}/${khoData.summary.quantityTotal}`, `Tỷ lệ: ${khoData.summary.quantityTotal > 0 ? formatters.formatPercentage(khoData.summary.quantityAchieved / khoData.summary.quantityTotal) : '0%'}`, 'text-orange-700', 'bg-orange-50 border-orange-200', 'text-orange-900', 'text-orange-700')}
            </div>

            <div class="p-3 overflow-y-auto custom-scrollbar luyke-thidua-scroller flex-grow bg-white" style="max-height: 600px; min-height: 450px;">
                {#if khoData.items.length === 0}
                    <div class="p-8 text-center text-xs text-gray-400 italic bg-slate-50 rounded-lg border border-dashed">Chưa dán dữ liệu kho</div>
                {:else}
                    <div class="flex flex-col gap-4">
                        
                        {#if khoData.groups.daDat.length > 0}
                            <div class="group-section">
                                <div class="flex items-center gap-2 mb-2 border-b border-green-200 pb-1">
                                    <h4 class="text-[11px] font-extrabold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🏆</span> NGÀNH HÀNG ĐẠT
                                    </h4>
                                    <span class="bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{khoData.groups.daDat.length}</span>
                                </div>
                                <div class="grid grid-cols-3 xl:grid-cols-4 gap-1.5">
                                    {#each khoData.groups.daDat as item}
                                        {@render categoryBadge(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if khoData.groups.butToc.length > 0}
                            <div class="group-section">
                                <div class="flex items-center gap-2 mb-2 border-b border-yellow-200 pb-1">
                                    <h4 class="text-[11px] font-extrabold text-yellow-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🔥</span> ĐANG BỨT TỐC
                                    </h4>
                                    <span class="bg-yellow-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{khoData.groups.butToc.length}</span>
                                </div>
                                <div class="grid grid-cols-3 xl:grid-cols-4 gap-1.5">
                                    {#each khoData.groups.butToc as item}
                                        {@render categoryBadge(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if khoData.groups.baoDong.length > 0}
                            <div class="group-section">
                                <div class="flex items-center gap-2 mb-2 border-b border-red-200 pb-1">
                                    <h4 class="text-[11px] font-extrabold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>⚠️</span> CẦN CỐ GẮNG
                                    </h4>
                                    <span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{khoData.groups.baoDong.length}</span>
                                </div>
                                <div class="grid grid-cols-3 xl:grid-cols-4 gap-1.5">
                                    {#each khoData.groups.baoDong as item}
                                        {@render categoryBadge(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                    </div>
                {/if}
            </div>
        </div>
    {/each}
</div>

<style>
    /* BỘ GIÁP CAPTURE: Phá khóa scroll, hiển thị trọn vẹn danh sách ngành hàng dài */
    :global(.capture-container .luyke-thidua-scroller) {
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
    }
    
    /* ÉP ĐỘ RỘNG TIÊU CHUẨN KHI THẺ KHO ĐƯỢC CLONE TÁCH BIỆT TRONG TRẠM CHỤP */
    :global(.capture-container .luyke-thi-dua-kho-card) {
        width: 550px !important;
        min-width: 550px !important;
        max-width: 550px !important;
        height: auto !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 0.75rem !important;
    }
    
    /* Làm sạch nền bao quanh của trạm chụp đơn lẻ */
    :global(.capture-container .capture-layout-container) {
        padding: 12px !important;
        background-color: #f8fafc !important;
        display: flex !important;
        justify-content: center !important;
    }

    /* CHỐNG VỠ FONT CHỮ CỦA KPI */
    :global(.capture-container .whitespace-nowrap) {
        white-space: nowrap !important;
        word-break: normal !important;
    }

    /* CHỈ CHO PHÉP RỚT DÒNG TẠI THẺ NGÀNH HÀNG */
    :global(.capture-container .line-clamp-2) {
        overflow: visible !important;
        white-space: normal !important; 
        word-break: break-word !important;
    }
    
    :global(.capture-container .leading-none), 
    :global(.capture-container .leading-tight),
    :global(.capture-container .tracking-tight) {
        line-height: 1.4 !important;
        padding-bottom: 2px !important;
    }

    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
</style>