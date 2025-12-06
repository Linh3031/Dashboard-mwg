<script>
  import { formatters } from '../../utils/formatters.js';
  
  export let reportData = [];

  let sortKey = 'tongThuNhap';
  let sortDirection = 'desc';

  // Cấu hình cột
  const columns = [
      { key: 'hoTen', label: 'Nhân viên', align: 'left' },
      { key: 'gioCong', label: 'Giờ công', align: 'right' },
      { key: 'tongThuNhap', label: 'Tổng Thu Nhập', align: 'right' },
      { key: 'thuNhapDuKien', label: 'Thu nhập DK', align: 'right' },
      { key: 'thuNhapThangTruoc', label: 'Tháng trước', align: 'right' },
      { key: 'chenhLechThuNhap', label: '+/- Tháng trước', align: 'right' }
  ];

  function handleSort(key) {
      if (sortKey === key) {
          sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      } else {
          sortKey = key;
          sortDirection = 'desc';
      }
  }

  // Logic sắp xếp
  $: sortedData = [...reportData].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'hoTen') {
          return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      }
      // Xử lý số
      return sortDirection === 'asc' ? (Number(valA)||0) - (Number(valB)||0) : (Number(valB)||0) - (Number(valA)||0);
  });

  // Tính tổng
  $: totals = reportData.reduce((acc, item) => {
      acc.gioCong += item.gioCong || 0;
      acc.tongThuNhap += item.tongThuNhap || 0;
      acc.thuNhapDuKien += item.thuNhapDuKien || 0;
      acc.thuNhapThangTruoc += item.thuNhapThangTruoc || 0;
      acc.chenhLechThuNhap += item.chenhLechThuNhap || 0;
      return acc;
  }, { gioCong: 0, tongThuNhap: 0, thuNhapDuKien: 0, thuNhapThangTruoc: 0, chenhLechThuNhap: 0 });

  // Tính trung bình Thu nhập dự kiến để so sánh
  $: avgIncome = reportData.length > 0 ? totals.thuNhapDuKien / reportData.length : 0;

  // Hàm style cho ô dữ liệu
  function getCellClass(item, colKey) {
      if (colKey === 'tongThuNhap') return 'font-bold text-blue-700';
      
      if (colKey === 'thuNhapDuKien') {
          // Dưới trung bình thì màu đỏ, trên thì xanh
          return item.thuNhapDuKien < avgIncome 
              ? 'font-bold text-red-600 bg-red-50' 
              : 'font-bold text-green-700 bg-green-50';
      }

      if (colKey === 'chenhLechThuNhap') {
          return item.chenhLechThuNhap >= 0 
              ? 'font-bold text-green-600' 
              : 'font-bold text-red-600';
      }

      return 'text-gray-700';
  }
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4 animate-fade-in">
    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-orange-50">
        <div class="flex items-center gap-2">
            <div class="p-2 bg-orange-100 rounded-lg text-orange-600">
                <i data-feather="briefcase" class="w-5 h-5"></i>
            </div>
            <div>
                <h3 class="font-bold text-gray-800 text-lg uppercase">Bảng Lương & Thu Nhập</h3>
                <p class="text-xs text-gray-500">
                    Thu nhập DK TB: <span class="font-bold text-orange-600">{formatters.formatRevenue(avgIncome)}</span>
                </p>
            </div>
        </div>
        <span class="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-full shadow-sm">Đơn vị: VNĐ</span>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full text-sm text-left border-collapse">
            <thead class="bg-gray-100 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                    {#each columns as col}
                        <th 
                            class="px-4 py-3 cursor-pointer hover:bg-gray-200 transition select-none whitespace-nowrap {col.align === 'right' ? 'text-right' : 'text-left'}"
                            on:click={() => handleSort(col.key)}
                        >
                            <div class="flex items-center gap-1 {col.align === 'right' ? 'justify-end' : ''}">
                                {col.label}
                                {#if sortKey === col.key}
                                    <span class="ml-1 text-orange-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                {/if}
                            </div>
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                {#if sortedData.length === 0}
                    <tr><td colspan={columns.length} class="p-12 text-center text-gray-400 italic bg-gray-50">Chưa có dữ liệu. Vui lòng tải file Thưởng/Giờ công.</td></tr>
                {:else}
                    {#each sortedData as item, index (item.maNV)}
                        <tr class="hover:bg-orange-50 transition-colors duration-150 group {index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
                            <td class="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-100 group-hover:text-orange-800">
                                {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                            </td>
                            <td class="px-4 py-3 text-right border-r border-gray-100 font-medium">
                                {formatters.formatNumberOrDash(item.gioCong)}
                            </td>
                            <td class="px-4 py-3 text-right {getCellClass(item, 'tongThuNhap')}">
                                {formatters.formatRevenue(item.tongThuNhap)}
                            </td>
                            <td class="px-4 py-3 text-right {getCellClass(item, 'thuNhapDuKien')}">
                                {formatters.formatRevenue(item.thuNhapDuKien)}
                            </td>
                            <td class="px-4 py-3 text-right text-gray-600 font-medium">
                                {formatters.formatRevenue(item.thuNhapThangTruoc)}
                            </td>
                            <td class="px-4 py-3 text-right border-l border-gray-100 {getCellClass(item, 'chenhLechThuNhap')}">
                                {formatters.formatRevenue(item.chenhLechThuNhap)}
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
            <tfoot class="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300 text-xs uppercase">
                <tr>
                    <td class="px-4 py-3">TỔNG CỘNG</td>
                    <td class="px-4 py-3 text-right">{formatters.formatNumberOrDash(totals.gioCong)}</td>
                    <td class="px-4 py-3 text-right text-blue-700">{formatters.formatRevenue(totals.tongThuNhap)}</td>
                    <td class="px-4 py-3 text-right text-green-700">{formatters.formatRevenue(totals.thuNhapDuKien)}</td>
                    <td class="px-4 py-3 text-right">{formatters.formatRevenue(totals.thuNhapThangTruoc)}</td>
                    <td class="px-4 py-3 text-right">{formatters.formatRevenue(totals.chenhLechThuNhap)}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>