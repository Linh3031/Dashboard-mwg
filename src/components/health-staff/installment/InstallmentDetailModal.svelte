<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';

    export let isOpen = false;
    export let employee = null; // Object nhân viên từ report service

    const dispatch = createEventDispatcher();

    let searchTerm = '';
    let sortMode = 'installment'; // 'installment' | 'revenue' | 'name'

    function close() {
        dispatch('close');
    }

    // Format tiền tệ
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    // Hàm sắp xếp danh sách khách hàng
    $: sortedCustomers = employee?.processedCustomers 
        ? [...employee.processedCustomers].filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
          ).sort((a, b) => {
            if (sortMode === 'installment') {
                // Ưu tiên khách có làm trả góp, sau đó đến số lượng hồ sơ
                return b.installmentCount - a.installmentCount || b.totalOrders - a.totalOrders;
            } else if (sortMode === 'revenue') {
                // Tính tổng doanh thu của khách (cộng dồn các đơn)
                const revA = a.orders.reduce((sum, o) => sum + (parseInt(o.thanhTien) || 0), 0);
                const revB = b.orders.reduce((sum, o) => sum + (parseInt(o.thanhTien) || 0), 0);
                return revB - revA;
            } else {
                return a.name.localeCompare(b.name);
            }
        })
        : [];
    
    // Tính tổng doanh thu hiển thị cho từng khách
    const getCustomerRevenue = (orders) => {
        return orders.reduce((sum, o) => sum + (parseInt(o.thanhTien) || 0), 0);
    };

    // Lấy danh sách loại đơn (VD: "2 Tiền mặt, 1 Trả góp")
    const getOrderSummary = (cust) => {
        const cash = cust.totalOrders - cust.installmentCount;
        let parts = [];
        if (cash > 0) parts.push(`${cash} Tiền mặt`);
        if (cust.installmentCount > 0) parts.push(`${cust.installmentCount} Trả góp`);
        return parts.join(', ');
    };
</script>

{#if isOpen && employee}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" transition:fade>
        <div 
            class="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col"
            transition:fly={{ y: 50, duration: 300 }}
        >
            <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">
                        Chi tiết: {employee.name} - {employee.id}
                    </h3>
                    <div class="text-sm text-gray-500 mt-1 flex gap-4">
                        <span>Tổng đơn: <strong class="text-blue-600">{employee.stats.totalOrders}</strong></span>
                        <span>Trả góp: <strong class="text-purple-600">{employee.stats.totalInstallment}</strong></span>
                        <span>Tỷ lệ duyệt: 
                            <span class="{parseFloat(employee.stats.approvalRate) >= 50 ? 'text-green-600' : 'text-red-600'} font-bold">
                                {employee.stats.approvalRate}%
                            </span>
                        </span>
                    </div>
                </div>
                <button on:click={close} class="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
            </div>

            <div class="p-4 border-b bg-white flex flex-col md:flex-row gap-3 items-center justify-between">
                <div class="relative w-full md:w-1/3">
                    <input 
                        type="text" 
                        bind:value={searchTerm}
                        placeholder="Tìm tên khách hàng..." 
                        class="w-full pl-3 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                
                <div class="flex gap-2">
                    <button 
                        class="px-3 py-2 text-sm rounded border {sortMode === 'installment' ? 'bg-purple-100 text-purple-700 border-purple-300 font-bold' : 'bg-gray-100 text-gray-600'}"
                        on:click={() => sortMode = 'installment'}
                    >
                        Sort: Trả góp (Hồ sơ)
                    </button>
                    <button 
                        class="px-3 py-2 text-sm rounded border {sortMode === 'revenue' ? 'bg-green-100 text-green-700 border-green-300 font-bold' : 'bg-gray-100 text-gray-600'}"
                        on:click={() => sortMode = 'revenue'}
                    >
                        Sort: Doanh thu
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-auto p-4 bg-gray-50">
                <div class="bg-white rounded shadow border">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-100 text-gray-600 font-semibold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th class="p-3 border-b">Khách hàng</th>
                                <th class="p-3 border-b text-center">Phân loại đơn</th>
                                <th class="p-3 border-b text-center">Hồ sơ Trả góp</th>
                                <th class="p-3 border-b text-right">Tổng giá trị</th>
                                <th class="p-3 border-b">Chi tiết trạng thái</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            {#each sortedCustomers as cust}
                                <tr class="hover:bg-blue-50 transition-colors">
                                    <td class="p-3 font-medium text-gray-800">
                                        {cust.name}
                                        <div class="text-xs text-gray-400 font-normal">{cust.orders.length} đơn hàng</div>
                                    </td>
                                    
                                    <td class="p-3 text-center">
                                        <span class="px-2 py-1 bg-gray-100 rounded text-xs">
                                            {getOrderSummary(cust)}
                                        </span>
                                    </td>

                                    <td class="p-3 text-center">
                                        {#if cust.installmentCount > 0}
                                            <div class="inline-flex flex-col items-center">
                                                <span class="font-bold text-lg text-purple-600">{cust.installmentCount}</span>
                                                <span class="text-[10px] text-gray-500">lần lên hồ sơ</span>
                                                {#if cust.installmentCount > 1}
                                                    <span class="text-[10px] text-orange-500 font-semibold">(Có trùng lặp)</span>
                                                {/if}
                                            </div>
                                        {:else}
                                            <span class="text-gray-300">-</span>
                                        {/if}
                                    </td>

                                    <td class="p-3 text-right font-medium text-gray-700">
                                        {formatMoney(getCustomerRevenue(cust.orders))}
                                    </td>

                                    <td class="p-3 text-xs">
                                        <div class="flex flex-col gap-1">
                                            {#each cust.orders as order}
                                                <div class="flex items-center gap-2 border-b border-dashed border-gray-100 pb-1 last:border-0 last:pb-0">
                                                    {#if order._isInstallment}
                                                        <span class="w-16 flex-shrink-0 px-1 py-0.5 rounded text-[10px] text-center {order._isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                                            {order._isSuccess ? 'ĐẬU' : 'RỚT/HỦY'}
                                                        </span>
                                                    {:else}
                                                        <span class="w-16 flex-shrink-0 px-1 py-0.5 rounded text-[10px] text-center bg-blue-100 text-blue-700">
                                                            Tiền mặt
                                                        </span>
                                                    {/if}
                                                    <span class="truncate max-w-[150px]" title={order.tenSanPham}>{order.tenSanPham}</span>
                                                </div>
                                            {/each}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                            
                            {#if sortedCustomers.length === 0}
                                <tr>
                                    <td colspan="5" class="p-8 text-center text-gray-400">Không tìm thấy dữ liệu</td>
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="p-4 border-t bg-gray-50 flex justify-end rounded-b-lg">
                <button 
                    on:click={close}
                    class="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 font-medium"
                >
                    Đóng
                </button>
            </div>
        </div>
    </div>
{/if}