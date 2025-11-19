<script>
  import { formatters } from '../../utils/formatters.js';
  export let items = []; // Nhận danh sách nhóm hàng từ cha
</script>

<div class="bg-white rounded-xl shadow-md p-4 border border-gray-200 h-full">
  <h3 class="text-lg font-bold text-gray-700 mb-4 uppercase border-b pb-2">Nhóm hàng quy đổi cao</h3>
  
  {#if items.length === 0}
    <p class="text-gray-500 font-bold p-4 text-center">Vui lòng tải file realtime để xem chi tiết.</p>
  {:else}
    <div class="overflow-x-auto max-h-[400px]">
      <table class="min-w-full text-sm table-bordered table-striped">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0">
          <tr>
            <th class="px-4 py-2 text-left">Nhóm hàng</th>
            <th class="px-4 py-2 text-right">SL</th>
            <th class="px-4 py-2 text-right">DTQĐ (Tr)</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium">{item.name}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.sl)}</td>
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>