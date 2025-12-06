<script>
  import { formatters } from '../../../utils/formatters.js';

  export let data = []; // Dữ liệu QĐC đã được lọc và sort từ cha

  // Logic màu header theo thiết kế gốc (sknv-header-indigo)
  const headerClass = "bg-[#4f46e5]"; 
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
    <div class="{headerClass} flex items-center gap-2 p-3 text-white">
        <i data-feather="star" class="w-5 h-5"></i>
        <h4 class="text-lg font-bold">Nhóm hàng Quy đổi cao</h4>
    </div>
    
    <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm table-bordered table-striped">
            <thead class="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10">
                <tr>
                    <th class="px-3 py-2 text-left">Nhóm hàng</th>
                    <th class="px-3 py-2 text-right">SL</th>
                    <th class="px-3 py-2 text-right">DTQĐ (Tr)</th>
                </tr>
            </thead>
            <tbody>
                {#if data.length === 0}
                    <tr><td colspan="3" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
                {:else}
                    {#each data as item (item.id)}
                        <tr class="border-t hover:bg-slate-50 transition-colors">
                            <td class="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-600">{formatters.formatNumber(item.sl)}</td>
                            <td class="px-3 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>