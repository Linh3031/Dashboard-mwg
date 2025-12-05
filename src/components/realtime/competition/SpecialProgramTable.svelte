<script>
  import { formatters } from '../../../utils/formatters.js';
  import SortableTh from '../../common/SortableTh.svelte';

  // Nhận vào dữ liệu của MỘT chương trình SPĐQ
  export let programResult;

  const { program, employeeData } = programResult;

  let sortKey = 'tyLeSL';
  let sortDirection = 'desc';

  function handleSort(event) {
    const key = event.detail;
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  $: sortedData = [...employeeData].sort((a, b) => {
    let valA = Number(a[sortKey]) || 0;
    let valB = Number(b[sortKey]) || 0;

    if (sortKey === 'hoTen') {
        const nameA = a.hoTen || '';
        const nameB = b.hoTen || '';
        return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Tính tổng
  $: totals = employeeData.reduce((acc, item) => {
      acc.slDacQuyen += item.slDacQuyen;
      acc.slNhomHang += item.slNhomHang;
      acc.dtDacQuyen += item.dtDacQuyen;
      acc.dtNhomHang += item.dtNhomHang;
      return acc;
  }, { slDacQuyen: 0, slNhomHang: 0, dtDacQuyen: 0, dtNhomHang: 0 });

  $: totalTyLeSL = totals.slNhomHang > 0 ? (totals.slDacQuyen / totals.slNhomHang) : 0;
  $: totalTyLeDT = totals.dtNhomHang > 0 ? (totals.dtDacQuyen / totals.dtNhomHang) : 0;
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full" data-capture-group="special-program">
    <div class="p-4 bg-purple-50 border-b-2 border-purple-200">
        <h3 class="text-lg font-bold text-purple-800 uppercase">{program.name}</h3>
        <p class="text-xs text-purple-700 font-medium mt-1">Nhóm hàng: {program.groups.join(', ')}</p>
    </div>

    <div class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm text-left text-gray-600 table-bordered table-striped">
            <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10">
                <tr>
                    <SortableTh key="hoTen" label="Nhân viên" className="min-w-[150px]" {sortKey} {sortDirection} on:sort={handleSort} />
                    <SortableTh key="slDacQuyen" label="SL SPĐQ" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                    <SortableTh key="slNhomHang" label="SL Nhóm" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                    <SortableTh key="tyLeSL" label="% SL" align="right" className="bg-yellow-50" {sortKey} {sortDirection} on:sort={handleSort} />
                    <SortableTh key="dtDacQuyen" label="DT SPĐQ" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                    <SortableTh key="dtNhomHang" label="DT Nhóm" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                    <SortableTh key="tyLeDT" label="% DT" align="right" className="bg-yellow-50" {sortKey} {sortDirection} on:sort={handleSort} />
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                {#each sortedData as item (item.maNV)}
                    <tr class="hover:bg-purple-50 transition">
                        <td class="px-4 py-2 font-semibold text-purple-900 sticky left-0 bg-white hover:bg-purple-50 border-r">
                            {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                        </td>
                        <td class="px-2 py-2 text-right font-bold">{formatters.formatNumber(item.slDacQuyen)}</td>
                        <td class="px-2 py-2 text-right font-bold">{formatters.formatNumber(item.slNhomHang)}</td>
                        <td class="px-2 py-2 text-right font-bold {item.tyLeSL > 0 ? 'text-blue-600' : 'text-gray-400'} bg-yellow-50/30">
                            {formatters.formatPercentage(item.tyLeSL)}
                        </td>
                        <td class="px-2 py-2 text-right font-bold">{formatters.formatRevenue(item.dtDacQuyen)}</td>
                        <td class="px-2 py-2 text-right font-bold">{formatters.formatRevenue(item.dtNhomHang)}</td>
                        <td class="px-2 py-2 text-right font-bold {item.tyLeDT > 0 ? 'text-green-600' : 'text-gray-400'} bg-yellow-50/30">
                            {formatters.formatPercentage(item.tyLeDT)}
                        </td>
                    </tr>
                {/each}
            </tbody>
            <tfoot class="table-footer font-bold bg-gray-100 border-t-2 border-gray-300">
                <tr>
                    <td class="px-4 py-2">Tổng</td>
                    <td class="px-2 py-2 text-right">{formatters.formatNumber(totals.slDacQuyen)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatNumber(totals.slNhomHang)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatPercentage(totalTyLeSL)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatRevenue(totals.dtDacQuyen)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatRevenue(totals.dtNhomHang)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatPercentage(totalTyLeDT)}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>