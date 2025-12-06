<script>
    import { modalState } from '../../stores.js';
    import { formatters } from '../../utils/formatters.js';

    $: isOpen = $modalState.activeModal === 'unexported-detail-modal';
    $: unexportedDetails = $modalState.payload?.unexportedDetails || [];

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900/50 z-[1200] flex items-center justify-center backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]" on:click|stopPropagation>
            
            <div class="p-4 border-b flex justify-between items-center bg-yellow-50 rounded-t-xl">
                <h3 class="text-lg font-bold text-yellow-800">Chi tiết Doanh thu Chưa xuất</h3>
                <button class="text-gray-500 hover:text-gray-800 text-2xl leading-none" on:click={close}>&times;</button>
            </div>

            <div class="overflow-y-auto p-4 space-y-3 bg-slate-50/30 flex-grow">
                {#if unexportedDetails.length === 0}
                    <p class="text-center text-gray-500 py-8">Không có đơn hàng nào chưa xuất.</p>
                {:else}
                    {#each unexportedDetails as group, index}
                        <details class="bg-white rounded-lg shadow-sm border border-gray-200 group">
                            <summary class="flex justify-between items-center p-3 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-gray-500 text-sm">{index + 1}.</span>
                                    <span class="font-semibold text-gray-800 text-sm">{group.name}</span>
                                </div>
                                
                                <div class="flex items-center gap-3 text-xs text-gray-600">
                                    <span>SL: <strong>{group.totalSL}</strong></span>
                                    <span>DTQĐ: <strong class="text-blue-600">{formatters.formatRevenue(group.totalDTQD, 1)}</strong></span>
                                </div>
                                <span class="text-gray-400 transform group-open:rotate-180 transition-transform ml-2">▼</span>
                            </summary>
                            
                            <div class="p-3 border-t border-gray-100 bg-slate-50/50 text-xs">
                                <table class="w-full">
                                    <tbody>
                                        {#each group.products as p}
                                            <tr class="border-b last:border-0 border-gray-200/50">
                                                <td class="py-1.5 pr-2 text-gray-700">{p.name}</td>
                                                <td class="py-1.5 px-2 text-right whitespace-nowrap">SL: <strong>{p.sl}</strong></td>
                                                <td class="py-1.5 pl-2 text-right whitespace-nowrap">DTQĐ: <strong class="text-blue-600">{formatters.formatRevenue(p.dtqd, 1)}</strong></td>
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