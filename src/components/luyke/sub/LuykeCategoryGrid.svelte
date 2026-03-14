<script>
    import { formatters } from '../../../utils/formatters.js';
    import { afterUpdate } from 'svelte';

    export let sortedItems = [];
    export let showUnexported = false;
    export let totalRevenue = 0;
    export let maxVal = 1;
    export let numDays = 1;

    function getCategoryTheme(name) {
        const n = name ? name.toLowerCase() : '';
        if (n.includes('điện tử') || n.includes('tivi')) return { icon: 'tv', color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500' };
        if (n.includes('máy giặt') || n.includes('sấy')) return { icon: 'disc', color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' };
        if (n.includes('máy lạnh') || n.includes('điều hòa')) return { icon: 'wind', color: 'text-cyan-600', bg: 'bg-cyan-50', bar: 'bg-cyan-500' };
        if (n.includes('tủ lạnh') || n.includes('tủ đông')) return { icon: 'server', color: 'text-sky-600', bg: 'bg-sky-50', bar: 'bg-sky-500' };
        if (n.includes('lọc nước')) return { icon: 'droplet', color: 'text-teal-600', bg: 'bg-teal-50', bar: 'bg-teal-500' };
        if (n.includes('laptop') || n.includes('pc')) return { icon: 'monitor', color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' };
        if (n.includes('điện thoại') || n.includes('smartphone')) return { icon: 'smartphone', color: 'text-pink-600', bg: 'bg-pink-50', bar: 'bg-pink-500' };
        if (n.includes('gia dụng') || n.includes('bếp')) return { icon: 'home', color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' };
        if (n.includes('phụ kiện')) return { icon: 'headphones', color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500' };
        if (n.includes('đồng hồ')) return { icon: 'watch', color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500' };
        return { icon: 'tag', color: 'text-slate-600', bg: 'bg-slate-100', bar: 'bg-slate-500' };
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

{#if sortedItems.length === 0}
    <div class="p-12 text-center bg-white border border-slate-200 border-t-0 rounded-b-xl">
        <p class="text-slate-500">{showUnexported ? 'Không có đơn hàng chưa xuất.' : 'Không có dữ liệu hiển thị.'}</p>
    </div>
{:else}
    <div class="luyke-cat-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 bg-white border border-slate-200 border-t-0 rounded-b-xl">
        {#each sortedItems as item (item.id)}
            {@const name = item.name}
            {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
            {@const quantity = showUnexported ? item.soLuong : item.quantity}
            {@const theme = getCategoryTheme(name)}
            
            {@const marketSharePercent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0}
            {@const barPercent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
            
            {@const isMacro = item.isMacro}
            {@const cardBg = showUnexported ? 'bg-orange-50/80' : (isMacro ? 'bg-indigo-50/80' : theme.bg)}
            {@const cardBorder = showUnexported ? 'border-orange-200' : (isMacro ? 'border-indigo-200' : 'border-black/5')}
            {@const theIcon = isMacro ? 'layers' : theme.icon}
            {@const accentColor = showUnexported ? 'text-orange-600' : (isMacro ? 'text-indigo-600' : theme.color)}
            {@const barColor = showUnexported ? 'bg-orange-500' : (isMacro ? 'bg-indigo-500' : theme.bar)}

            <div class="relative {cardBg} border {cardBorder} rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group capture-card-inner">
                
                <div class="absolute -right-3 -bottom-3 opacity-[0.06] transition-transform duration-500 group-hover:scale-110 z-0 {accentColor}">
                    <i data-feather={theIcon} style="width: 100px; height: 100px; stroke-width: 1.5px;"></i>
                </div>

                <div class="flex justify-between items-stretch gap-2 mb-2.5 relative z-10 flex-1">
                    
                    <div class="flex flex-col flex-1 min-w-0 justify-between pr-1">
                        <div>
                            <div class="flex items-center {accentColor} mb-1">
                                <i data-feather={theIcon} class="w-4 h-4"></i>
                            </div>
                            <h4 class="text-[13px] sm:text-[14px] font-bold text-slate-800 line-clamp-2 leading-[1.3] pb-1 capture-text-title" title={name}>
                                {name}
                                {#if isMacro}<span class="ml-1 text-[9px] font-bold text-indigo-500 bg-white/70 px-1 py-0.5 rounded shadow-sm border border-indigo-100 translate-y-[-1px] inline-block">GỘP</span>{/if}
                            </h4>
                        </div>
                        
                        <div class="w-full h-1.5 bg-black/10 rounded-full overflow-hidden shadow-inner mt-1">
                            <div class="h-full {barColor} rounded-full transition-all duration-700 ease-out" style="width: {barPercent}%"></div>
                        </div>
                    </div>

                    <div class="flex flex-col items-end justify-center flex-shrink-0 pl-1">
                        <span class="text-[1.35rem] xl:text-[1.5rem] font-black text-slate-800 tracking-tighter leading-none drop-shadow-sm capture-text-revenue">
                            {formatters.formatRevenue(revenue, 0)}
                        </span>
                    </div>
                </div>

                <div class="mt-auto flex justify-between items-center pt-2 border-t border-black/5 relative z-10">
                    <div class="flex items-baseline gap-1">
                        <span class="text-[9px] text-slate-500 uppercase font-bold tracking-tight capture-text-label">SL:</span>
                        <span class="text-[12px] font-bold text-slate-800 capture-text-value">{formatters.formatNumber(quantity)}</span>
                    </div>
                    
                    {#if !showUnexported}
                    <div class="flex items-baseline gap-1">
                        <span class="text-[9px] text-slate-500 uppercase font-bold tracking-tight capture-text-label">TB:</span>
                        <span class="text-[12px] font-bold text-slate-800 capture-text-value">{formatters.formatNumber(quantity/numDays, 0)}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-[13px] font-black {accentColor} bg-white/70 px-1.5 py-0.5 rounded shadow-sm border border-white/50 inline-block drop-shadow-sm capture-text-percent">
                            {formatters.formatPercentage(marketSharePercent/100)}
                        </span>
                    </div>
                    {:else}
                    <div class="flex items-baseline gap-1 text-right">
                        <span class="text-[9px] text-slate-500 uppercase font-bold tracking-tight capture-text-label">THỰC:</span>
                        <span class="text-[12px] font-bold text-slate-800 capture-text-value">{formatters.formatRevenue(item.doanhThuThuc, 0)}</span>
                    </div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
{/if}

<style>
    /* =========================================
       CHỈ ÁP DỤNG KHI BẤM NÚT CHỤP ẢNH (CAPTURE)
       ========================================= */
    :global(.capture-container .luyke-cat-grid) {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important; /* ÉP 3 CỘT */
        width: 800px !important; /* ÉP CHIỀU NGANG VỪA MÀN ĐIỆN THOẠI */
        max-width: 800px !important;
        margin: 0 auto !important;
        gap: 17px !important;
        padding: 17px !important;
        background: white !important;
    }
    
    :global(.capture-container .luyke-cat-grid > div) {
        page-break-inside: avoid;
    }
    
:global(.capture-container .line-clamp-2) {
        display: block !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: normal !important;
        max-height: 3.2em !important; /* SỬA Ở ĐÂY: Nới trần nhà từ 2.8em lên 3.2em để nhường chỗ cho chân chữ */
    }

    /* Ép Font siêu to chỉ dành cho xuất ảnh */
    :global(.capture-container .capture-text-title) { 
        font-size: 16px !important; 
        line-height: 1.4 !important; /* SỬA Ở ĐÂY: Tăng khoảng cách dòng lên 1.4 */
        padding-bottom: 4px !important; /* SỬA Ở ĐÂY: Lót thêm 4px đệm dưới đít chữ */
    }
    :global(.capture-container .capture-text-revenue) { 
        font-size: 32px !important; 
        line-height: 1.1 !important; /* SỬA Ở ĐÂY: Nhích từ 1 lên 1.1 để số không bị xén đáy */
        padding-bottom: 4px !important; /* Lót đệm cho số */
    }
    :global(.capture-container .capture-text-label) { font-size: 10px !important; }
    :global(.capture-container .capture-text-value) { font-size: 15px !important; }
    :global(.capture-container .capture-text-percent) { font-size: 17px !important; padding: 4px 8px !important; }</style>