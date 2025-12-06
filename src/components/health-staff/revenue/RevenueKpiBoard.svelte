<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';

  export let summary = {};
  export let goals = {};

  const dispatch = createEventDispatcher();

  // Tính toán target
  $: targetQD = (goals?.phanTramQD || 0);
  $: isPositive = (summary.conversionRate * 100) >= targetQD;
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
    <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
        <div class="text-sm text-gray-500 font-medium uppercase">Tổng DT Thực</div>
        <div class="text-xl font-bold text-blue-600 mt-1">{formatters.formatRevenue(summary.totalRealRevenue, 1)}</div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
        <div class="text-sm text-gray-500 font-medium uppercase">Tổng DTQĐ</div>
        <div class="text-xl font-bold text-purple-600 mt-1">{formatters.formatRevenue(summary.totalConvertedRevenue, 1)}</div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
        <div class="text-sm text-gray-500 font-medium uppercase">Tỷ lệ QĐ</div>
        <div class="text-xl font-bold mt-1 {isPositive ? 'text-green-600' : 'text-red-600'}">
            {formatters.formatPercentage(summary.conversionRate)}
        </div>
    </div>

    <div 
        class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center cursor-pointer hover:bg-yellow-50 transition-colors hover:shadow-md"
        on:click={() => dispatch('viewUnexported')}
    >
        <div class="text-sm text-gray-500 font-medium uppercase flex items-center justify-center gap-1">
            DT Chưa Xuất <i data-feather="external-link" class="w-3 h-3"></i>
        </div>
        <div class="text-xl font-bold text-yellow-600 mt-1">{formatters.formatRevenue(summary.unexportedRevenue, 1)}</div>
    </div>

    <div 
        class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center cursor-pointer hover:bg-blue-50 transition-colors hover:shadow-md"
        on:click={() => dispatch('viewOrders')}
    >
        <div class="text-sm text-gray-500 font-medium uppercase flex items-center justify-center gap-1">
            Tổng Đơn <i data-feather="external-link" class="w-3 h-3"></i>
        </div>
        <div class="text-xl font-bold text-gray-800 mt-1">{summary.totalOrders}</div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
        <div class="text-sm text-gray-500 font-medium uppercase">Đơn Bán Kèm</div>
        <div class="text-xl font-bold text-gray-800 mt-1">{summary.bundledOrderCount}</div>
    </div>
</div>