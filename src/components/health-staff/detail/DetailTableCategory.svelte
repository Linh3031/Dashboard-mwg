<script>
  import { formatters } from '../../../utils/formatters.js';

  export let data = []; // Dữ liệu Ngành hàng đã được lọc và sort từ cha

  // Logic màu header theo thiết kế gốc (sknv-header-purple)
  const headerClass = "bg-[#7e22ce]";
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
    <div class="{headerClass} flex items-center gap-2 p-3 text-white">
        <i data-feather="list" class="w-5 h-5"></i>
        <h4 class="text-lg font-bold">Doanh thu theo Ngành hàng</h4>
    </div>
    
    <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm table-bordered table-striped">
            <thead class="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10">
                <tr>
                    <th class="px-3 py-2 text-left">Ngành hàng</th>
                    <th class="px-3 py-2 text-right">SL</th>
                    <th class="px-3 py-2 text-right">Doanh thu</th>
                    <th class="px-3 py-2 text-right">DTQĐ</th>
                </tr>
            </thead>
            <tbody>
                {#if data.length === 0}
                    <tr><td colspan="4" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
                {:else}
                    {#each data as item (item.name)}
                        <tr class="border-t hover:bg-slate-50 transition-colors">
                            <td class="px-3 py-2 font-medium capitalize text-gray-800">{item.name}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-600">{formatters.formatNumber(item.quantity)}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-800">{formatters.formatRevenue(item.revenue, 0)}</td>
                            <td class="px-3 py-2 text-right font-bold text-purple-600">{formatters.formatRevenue(item.revenueQuyDoi, 0)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>