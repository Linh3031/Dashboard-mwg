<script>
    import { modalState } from '../../stores.js';
    import { formatters } from '../../utils/formatters.js';

    // Lấy dữ liệu từ store modalState
    $: isOpen = $modalState.activeModal === 'customer-detail-modal';
    $: customerData = $modalState.payload?.customers || [];
    $: mucTieu = $modalState.payload?.mucTieu || {};

    $: conversionRateTarget = (mucTieu?.phanTramQD || 0) / 100;

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }

    // Sắp xếp local trong modal
    let sortKey = 'totalRealRevenue';
    let sortDirection = 'desc';

    function handleSort(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDirection = 'desc';
        }
    }

    $: sortedCustomers = [...customerData].sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        return sortDirection === 'desc' ? valB - valA : valA - valB;
    });
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900/50 z-[1200] flex items-center justify-center backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]" on:click|stopPropagation>
            
            <div class="p-4 border-b flex justify-between items-center bg-blue-50 rounded-t-xl">
                <h3 class="text-lg font-bold text-blue-900">Chi tiết Đơn hàng theo Khách hàng</h3>
                <button class="text-gray-500 hover:text-gray-800 text-2xl leading-none" on:click={close}>&times;</button>
            </div>

            <div class="p-3 bg-gray-50 border-b flex gap-2 items-center">
                <span class="text-xs font-bold text-gray-500 uppercase">Sắp xếp:</span>
                <button 
                    class="px-3 py-1 rounded-full text-xs font-medium border transition-colors {sortKey === 'totalRealRevenue' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}"
                    on:click={() => handleSort('totalRealRevenue')}
                >
                    Doanh thu {sortKey === 'totalRealRevenue' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                </button>
                <button 
                    class="px-3 py-1 rounded-full text-xs font-medium border transition-colors {sortKey === 'conversionRate' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}"
                    on:click={() => handleSort('conversionRate')}
                >
                    % Quy đổi {sortKey === 'conversionRate' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                </button>
            </div>

            <div class="overflow-y-auto p-4 space-y-3 bg-slate-50/30 flex-grow">
                {#if sortedCustomers.length === 0}
                    <p class="text-center text-gray-500 py-8">Không có dữ liệu.</p>
                {:else}
                    {#each sortedCustomers as customer, index}
                        <details class="bg-white rounded-lg shadow-sm border border-gray-200 group">
                            <summary class="flex flex-wrap items-center gap-3 p-3 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
                                <div class="flex items-center gap-2 flex-grow min-w-[200px]">
                                    <span class="text-xs font-bold text-gray-400 w-5">{index + 1}.</span>
                                    <span class="text-sm font-semibold text-blue-700">{customer.name}</span>
                                </div>
                                
                                <div class="flex items-center gap-3 text-xs text-gray-600">
                                    <span>SL: <strong>{customer.totalQuantity}</strong></span>
                                    <span>DT: <strong>{formatters.formatRevenue(customer.totalRealRevenue, 1)}</strong></span>
                                    <span>DTQĐ: <strong class="text-blue-600">{formatters.formatRevenue(customer.totalConvertedRevenue, 1)}</strong></span>
                                    <span class="font-bold {customer.conversionRate >= conversionRateTarget ? 'text-green-600' : 'text-red-600'}">
                                        {formatters.formatPercentage(customer.conversionRate)}
                                    </span>
                                </div>
                                <span class="text-gray-400 transform group-open:rotate-180 transition-transform ml-auto">▼</span>
                            </summary>
                            
                            <div class="p-3 border-t border-gray-100 bg-slate-50/50 text-xs">
                                <table class="w-full">
                                    <tbody>
                                        {#each customer.products as p}
                                            <tr class="border-b last:border-0 border-gray-200/50">
                                                <td class="py-1.5 pr-2 text-gray-700">{p.productName}</td>
                                                <td class="py-1.5 px-2 text-right whitespace-nowrap">SL: <strong>{p.quantity}</strong></td>
                                                <td class="py-1.5 px-2 text-right whitespace-nowrap">DT: <strong>{formatters.formatRevenue(p.realRevenue, 1)}</strong></td>
                                                <td class="py-1.5 pl-2 text-right whitespace-nowrap">QĐ: <strong class="text-blue-600">{formatters.formatRevenue(p.convertedRevenue, 1)}</strong></td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    {/each}
                {/if}
            </div>

            <div class="p-4 border-t bg-white rounded-b-xl flex justify-end">
                <button class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium" on:click={close}>Đóng</button>
            </div>
        </div>
    </div>
{/if}