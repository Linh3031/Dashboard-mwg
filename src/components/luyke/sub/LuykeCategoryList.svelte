<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';

    export let sortedItems = [];
    export let showUnexported = false;
    export let numDays = 1;
    export let sortMode = 'revenue_desc';
    
    // Nhận rawSource để quét Ngày Hẹn Giao
    export let rawSource = [];
    export let macroConfig = [];

    const dispatch = createEventDispatcher();

    function handleSort(mode) {
        dispatch('sort', mode);
    }

    // Lọc ra danh sách Ngày Hẹn Giao (duy nhất, đã sort, bao gồm Fallback)
    $: deliveryDates = (() => {
        if (!showUnexported || !rawSource || rawSource.length === 0) return [];
        const dates = new Set();
        
        rawSource.forEach(r => {
            const tx = String(r.trangThaiXuat || '').toLowerCase();
            const th = String(r.trangThaiHuy || '').toLowerCase();
            
            // [PHẪU THUẬT LOGIC]: Nới lỏng tối đa phễu lọc Chưa xuất
            const isExported = tx.includes('đã xuất') || tx.includes('xuat ban') || tx.includes('xuất bán') || tx.includes('hoàn tất');
            const isCanceled = th.includes('hủy') || th.includes('huy') || tx.includes('hủy');
            
            if (!isExported && !isCanceled) {
                let d = r.ngayHenGiao;
                let dateStr = '';
                
                if (d) {
                    if (d instanceof Date) {
                        dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    } else {
                        // Thuật toán chuyển Excel Serial Date sang JS Date
                        if (!isNaN(d) && Number(d) > 30000 && Number(d) < 60000) {
                            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                            const jsDate = new Date(excelEpoch.getTime() + Number(d) * 86400000);
                            dateStr = jsDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        } else {
                            dateStr = String(d).trim();
                            if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0]; // Bỏ giờ phút nếu có
                        }
                    }
                }
                
                // Fallback: Nếu không có ngày giao, gom chung vào "Chưa xác định"
                if (!dateStr || dateStr === 'undefined' || dateStr === 'null') {
                    dateStr = 'Chưa xác định';
                }
                
                dates.add(dateStr);
            }
        });
        
        // Sort chuỗi ngày chuẩn DD/MM/YYYY, đưa "Chưa xác định" xuống cuối
        return Array.from(dates).sort((a, b) => {
            if (a === 'Chưa xác định') return 1;
            if (b === 'Chưa xác định') return -1;
            
            const partsA = a.split(/[-/]/);
            const partsB = b.split(/[-/]/);
            if (partsA.length >= 2 && partsB.length >= 2) {
                const dateA = new Date(partsA[2] || 2024, (partsA[1] || 1) - 1, partsA[0] || 1).getTime();
                const dateB = new Date(partsB[2] || 2024, (partsB[1] || 1) - 1, partsB[0] || 1).getTime();
                return dateA - dateB;
            }
            return a.localeCompare(b);
        });
    })();

    // Pivot Data: Tính tổng doanh thu theo (Nhóm hàng x Ngày hẹn giao)
    $: dateRevenueMap = (() => {
        if (!showUnexported || !rawSource || rawSource.length === 0) return {};
        const map = {}; 
        
        const unexportedRows = rawSource.filter(r => {
            const tx = String(r.trangThaiXuat || '').toLowerCase();
            const th = String(r.trangThaiHuy || '').toLowerCase();
            const isExported = tx.includes('đã xuất') || tx.includes('xuat ban') || tx.includes('xuất bán') || tx.includes('hoàn tất');
            const isCanceled = th.includes('hủy') || th.includes('huy') || tx.includes('hủy');
            return !isExported && !isCanceled;
        });

        sortedItems.forEach(item => {
            map[item.id] = {};
            deliveryDates.forEach(d => map[item.id][d] = 0);

            const macro = item.isMacro ? macroConfig.find(m => m.name === item.name) : null;
            const keywords = macro ? (macro.items || []).map(k => String(k).toLowerCase().trim()) : [];

            unexportedRows.forEach(r => {
                let isMatch = false;
                if (item.isMacro) {
                    const iName = String(r.nganhHang || '').toLowerCase().trim();
                    isMatch = keywords.some(k => iName.includes(k));
                } else {
                    const iName = String(r.nganhHang || '').trim();
                    isMatch = (iName === item.name || iName === item.id);
                }

                if (isMatch) {
                    let d = r.ngayHenGiao;
                    let dateStr = 'Chưa xác định';
                    if (d) {
                        if (d instanceof Date) {
                            dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        } else if (!isNaN(d) && Number(d) > 30000 && Number(d) < 60000) {
                            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                            const jsDate = new Date(excelEpoch.getTime() + Number(d) * 86400000);
                            dateStr = jsDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        } else if (String(d).trim() !== '') {
                            dateStr = String(d).trim();
                            if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0];
                        }
                    }

                    if (map[item.id][dateStr] !== undefined) {
                        const rev = r.doanhThuQuyDoi !== undefined ? r.doanhThuQuyDoi : r.thanhTien;
                        map[item.id][dateStr] += parseFloat(String(rev || 0).replace(/,/g, '')) || 0;
                    }
                }
            });
        });
        return map;
    })();
    
    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white border border-gray-200 border-t-0 rounded-b-xl luyke-list-capture-wrapper">
    <div class="overflow-x-auto max-h-[600px] custom-scrollbar luyke-list-scroll-area sknv-pasted-competition-scroller">
        <table class="w-full text-xs text-left border-collapse luyke-table-modern">
            <thead class="bg-gray-50 text-gray-600 uppercase font-bold border-b">
                <tr>
                    <th class="p-3 cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('name_asc')}>
                        Ngành hàng {#if sortMode.includes('name')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('quantity_desc')}>
                        SL {#if sortMode.includes('quantity')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('revenue_desc')}>
                        Doanh thu {#if sortMode.includes('revenue')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('dtqd_desc')}>
                        DTQĐ {#if sortMode.includes('dtqd')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                    
                    <!-- [PHẪU THUẬT LOGIC]: Bung các cột Ngày Hẹn Giao ra ngay sau cột DTQĐ -->
                    {#if showUnexported && deliveryDates.length > 0}
                        {#each deliveryDates as date}
                            <th class="p-3 text-right sticky top-0 bg-orange-50 z-10 whitespace-nowrap text-orange-800 border-l border-orange-200">
                                {date === 'Chưa xác định' ? 'Chưa xác định' : 'Hẹn ' + date}
                            </th>
                        {/each}
                    {/if}

                    {#if !showUnexported}
                        <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('avg_qty_desc')}>
                            TB SL {#if sortMode.includes('avg_qty')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                        </th>
                        <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('avg_rev_desc')}>
                            TB DT {#if sortMode.includes('avg_rev')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                        </th>
                    {/if}
                    <th class="p-3 text-right cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10" on:click={() => handleSort('price_desc')}>
                        Đơn giá (Tr) {#if sortMode.includes('price')}<span class="ml-1 text-blue-600">{sortMode.includes('desc') ? '↓' : '↑'}</span>{/if}
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each sortedItems as item (item.id)}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const unitPrice = quantity > 0 ? revenue / quantity : 0}
                    {@const dtqd = item.doanhThuQuyDoi || 0}
                    
                    <tr class="border-b hover:bg-blue-50 transition-colors {item.isMacro ? 'bg-indigo-50/50' : ''}">
                        <td class="p-3 font-medium flex items-center gap-2">
                            {#if item.isMacro}
                                <i data-feather="layers" class="w-3 h-3 text-indigo-600"></i>
                                <span class="text-indigo-700 font-bold">{item.name}</span>
                            {:else}
                                <span class="pl-5 text-gray-600">{item.name}</span>
                            {/if}
                        </td>
                        <td class="p-3 text-right font-bold text-gray-700">{formatters.formatNumber(quantity)}</td>
                        <td class="p-3 text-right font-bold text-blue-700">{formatters.formatRevenue(revenue, 0)}</td>
                        <td class="p-3 text-right text-orange-600 font-medium">
                            {dtqd > 0 ? formatters.formatRevenue(dtqd, 0) : '-'}
                        </td>
                        
                        <!-- [PHẪU THUẬT LOGIC]: In giá trị Hẹn Giao cho từng hàng -->
                        {#if showUnexported && deliveryDates.length > 0}
                            {#each deliveryDates as date}
                                <td class="p-3 text-right font-bold text-orange-700 bg-orange-50/20 border-l border-orange-100/50">
                                    {dateRevenueMap[item.id] && dateRevenueMap[item.id][date] > 0 ? formatters.formatRevenue(dateRevenueMap[item.id][date], 0) : '-'}
                                </td>
                            {/each}
                        {/if}

                        {#if !showUnexported}
                            <td class="p-3 text-right text-gray-500">{formatters.formatNumber(quantity/numDays, 1)}</td>
                            <td class="p-3 text-right text-gray-500">{formatters.formatRevenue(revenue/numDays, 0)}</td>
                        {/if}
                        <td class="p-3 text-right font-bold text-emerald-700 bg-emerald-50/30">
                            {formatters.formatNumber(unitPrice / 1000000, 1)}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<style>
    /* [BẢO TOÀN CAPTURE]: Thả lỏng chiều cao bảng khi chụp ảnh để lấy full dòng */
    :global(.capture-container .luyke-list-capture-wrapper) { border: none !important; border-radius: 0 !important; }
    :global(.capture-container .luyke-list-scroll-area) {
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
    }
    :global(.capture-container .luyke-table-modern th) { position: static !important; }
</style>