<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { dataProcessing } from '../../../services/dataProcessing.js';
  import { selectedWarehouse } from '../../../stores.js';

  export let data2025 = [];
  export let data2026 = [];

  const dispatch = createEventDispatcher();
  let sortKey = 'revenue'; // 'quantity', 'revenue', 'growthQty', 'growthRev'
  let sortDirection = 'desc';
  let expandedRows = new Set();

  const fmtQty = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
  const fmtRev = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format((n || 0) / 1000000);
  const fmtPct = (n) => {
      if (n === null || n === undefined || isNaN(n)) return '-';
      const prefix = n > 0 ? '+' : '';
      return prefix + (n * 100).toFixed(1) + '%';
  };

  const parseMoney = (value) => {
      if (typeof value === 'number') return value;
      if (!value) return 0;
      return parseFloat(String(value).replace(/,/g, '')) || 0;
  };

  function toggleRow(id) {
      if (expandedRows.has(id)) expandedRows.delete(id);
      else expandedRows.add(id);
      expandedRows = expandedRows; // trigger reactivity
  }

  // [BỘ LỌC KIM CƯƠNG CHUẨN MWG]
  const isValidRow = (row, validHTX) => {
      if ($selectedWarehouse) {
          const wh = String(row.maKhoTao || row.maKho || row['Mã kho tạo'] || row['Kho tạo'] || '').trim();
          if (wh && wh !== String($selectedWarehouse).trim()) return false;
      }
      const htx = String(row.hinhThucXuat || row.HINH_THUC_XUAT || row['Hình thức xuất'] || '').trim();
      if (validHTX.size > 0 && !validHTX.has(htx)) return false;

      const trangThaiXuat = String(row.trangThaiXuat || row.TRANG_THAI_XUAT || '').trim();
      const isDaXuat = !trangThaiXuat || trangThaiXuat === 'Đã xuất' || trangThaiXuat === 'Đã giao';

      if (isDaXuat) return true;
      if (trangThaiXuat === 'Chưa xuất') {
          const thuTien = String(row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || '').trim();
          const huy = String(row.trangThaiHuy || row.TRANG_THAI_HUY || '').trim();
          const tra = String(row.tinhTrangTra || row.TINH_TRANG_TRA || '').trim();
          if (thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả') return true;
      }
      return false;
  };

  // [THUẬT TOÁN XÂY CÂY]
  $: treeData = (() => {
      const validHTX = dataProcessing.getHinhThucXuatTinhDoanhThu ? dataProcessing.getHinhThucXuatTinhDoanhThu() : new Set();
      const map = new Map();

      const getOrCreateNode = (parentId, id, name, level) => {
          const fullId = parentId ? `${parentId}_${id}` : id;
          if (!map.has(fullId)) {
              map.set(fullId, { 
                  id: fullId, name: name || 'Khác', level, childrenMap: new Map(),
                  sl25: 0, dt25: 0, sl26: 0, dt26: 0 
              });
          }
          return map.get(fullId);
      };

      const processData = (sourceData, is2026) => {
          (sourceData || []).forEach(row => {
              if (!isValidRow(row, validHTX)) return;

              const dt = parseMoney(row.thanhTien || row.THANH_TIEN || row.DoanhThu || row['Thành tiền']);
              const sl = parseInt(row.soLuong || row.SO_LUONG || row['Số lượng'] || 0, 10);

              const nganh = String(row.nganhHang || row.NGANH_HANG || row['Ngành hàng'] || 'Chưa xác định').trim();
              const nhom = String(row.nhomHang || row.NHOM_HANG || row['Nhóm hàng'] || 'Chưa xác định').trim();
              const hang = String(row.nhaSanXuat || row.NHA_SAN_XUAT || row['Nhà sản xuất'] || row.Hang || 'Khác').trim();

              // Level 0: Ngành
              const nodeNganh = getOrCreateNode('', nganh, nganh, 0);
              // Level 1: Nhóm
              const nodeNhom = getOrCreateNode(nodeNganh.id, nhom, nhom, 1);
              // Level 2: Hãng
              const nodeHang = getOrCreateNode(nodeNhom.id, hang, hang, 2);

              [nodeNganh, nodeNhom, nodeHang].forEach(node => {
                  if (is2026) { node.sl26 += sl; node.dt26 += dt; } 
                  else { node.sl25 += sl; node.dt25 += dt; }
              });

              nodeNganh.childrenMap.set(nodeNhom.id, nodeNhom);
              nodeNhom.childrenMap.set(nodeHang.id, nodeHang);
          });
      };

      processData(data2025, false);
      processData(data2026, true);

      // Chuyển Map thành Array và tính % tăng trưởng
      const buildArray = (nodesMap) => {
          return Array.from(nodesMap.values()).map(node => {
              node.growthQty = node.sl25 > 0 ? (node.sl26 - node.sl25) / node.sl25 : (node.sl26 > 0 ? 1 : 0);
              node.growthRev = node.dt25 > 0 ? (node.dt26 - node.dt25) / node.dt25 : (node.dt26 > 0 ? 1 : 0);
              node.children = buildArray(node.childrenMap);
              delete node.childrenMap;
              return node;
          });
      };

      const rootNodes = Array.from(map.values()).filter(n => n.level === 0);
      return buildArray(new Map(rootNodes.map(n => [n.id, n])));
  })();

  // [THUẬT TOÁN SẮP XẾP ĐỆ QUY]
  $: sortedTree = (() => {
      const sortArray = (arr) => {
          return arr.sort((a, b) => {
              let valA = 0, valB = 0;
              if (sortKey === 'name') { return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name); }
              if (sortKey === 'quantity') { valA = a.sl26; valB = b.sl26; }
              if (sortKey === 'revenue') { valA = a.dt26; valB = b.dt26; }
              if (sortKey === 'growthQty') { valA = a.growthQty; valB = b.growthQty; }
              if (sortKey === 'growthRev') { valA = a.growthRev; valB = b.growthRev; }
              return sortDirection === 'asc' ? valA - valB : valB - valA;
          }).map(node => ({ ...node, children: sortArray(node.children) }));
      };
      return sortArray([...treeData]);
  })();

  $: grandTotal = sortedTree.reduce((acc, curr) => {
      acc.sl25 += curr.sl25; acc.dt25 += curr.dt25;
      acc.sl26 += curr.sl26; acc.dt26 += curr.dt26;
      return acc;
  }, { sl25: 0, dt25: 0, sl26: 0, dt26: 0 });

  $: grandTotal.growthQty = grandTotal.sl25 > 0 ? (grandTotal.sl26 - grandTotal.sl25) / grandTotal.sl25 : 0;
  $: grandTotal.growthRev = grandTotal.dt25 > 0 ? (grandTotal.dt26 - grandTotal.dt25) / grandTotal.dt25 : 0;

  function handleSort(key) {
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  function getGrowthColor(val) {
      if (val > 0) return 'text-emerald-600 font-bold';
      if (val < 0) return 'text-red-600 font-bold';
      return 'text-gray-500';
  }
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
    <div class="px-6 py-4 border-b border-gray-200 bg-indigo-50 flex justify-between items-center">
        <div class="flex items-center gap-2">
            <div class="p-2 bg-indigo-100 rounded-lg text-indigo-700"><i data-feather="bar-chart-2" class="w-5 h-5"></i></div>
            <div>
                <h3 class="font-bold text-indigo-900 text-lg uppercase">So sánh Tăng trưởng Cùng kỳ (SSG)</h3>
                <p class="text-xs text-indigo-600">Năm trước (2025) vs Năm nay (2026) - Đơn vị: Triệu VNĐ</p>
            </div>
        </div>
    </div>

    <div class="overflow-x-auto custom-scrollbar">
        <table class="min-w-full text-sm text-left border-collapse">
            <thead class="uppercase text-xs shadow-sm bg-gray-100 sticky top-0 z-10 text-gray-700">
                <tr>
                    <th rowspan="2" class="px-4 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200 min-w-[250px]" on:click={() => handleSort('name')}>
                        <div class="flex items-center">Danh mục Hàng hóa {#if sortKey === 'name'}<span class="ml-1 text-indigo-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>
                    <th colspan="2" class="px-4 py-2 text-center border-r border-gray-200 bg-slate-100 font-bold">Năm trước (2025)</th>
                    <th colspan="2" class="px-4 py-2 text-center border-r border-gray-200 bg-blue-50 font-bold text-blue-800">Năm nay (2026)</th>
                    <th colspan="2" class="px-4 py-2 text-center bg-emerald-50 font-bold text-emerald-800">Mức Tăng Trưởng (%)</th>
                </tr>
                <tr>
                    <th class="px-3 py-2 text-right border-r border-t border-gray-200">SL</th>
                    <th class="px-3 py-2 text-right border-r border-t border-gray-200">DT Thực</th>
                    
                    <th class="px-3 py-2 text-right border-r border-t border-gray-200 bg-blue-50/50 cursor-pointer hover:bg-blue-100" on:click={() => handleSort('quantity')}>
                        <div class="flex items-center justify-end">SL {#if sortKey === 'quantity'}<span class="ml-1 text-indigo-600 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>
                    <th class="px-3 py-2 text-right border-r border-t border-gray-200 bg-blue-50/50 cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue')}>
                        <div class="flex items-center justify-end">DT Thực {#if sortKey === 'revenue'}<span class="ml-1 text-indigo-600 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>

                    <th class="px-3 py-2 text-right border-r border-t border-gray-200 bg-emerald-50/50 cursor-pointer hover:bg-emerald-100" on:click={() => handleSort('growthQty')}>
                        <div class="flex items-center justify-end">% SL {#if sortKey === 'growthQty'}<span class="ml-1 text-indigo-600 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>
                    <th class="px-3 py-2 text-right border-t border-gray-200 bg-emerald-50/50 cursor-pointer hover:bg-emerald-100" on:click={() => handleSort('growthRev')}>
                        <div class="flex items-center justify-end">% DT {#if sortKey === 'growthRev'}<span class="ml-1 text-indigo-600 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>
                </tr>
                <tr class="bg-indigo-50 font-black text-indigo-900 border-b-2 border-indigo-200">
                    <td class="px-4 py-3 border-r border-indigo-200">TỔNG CỘNG</td>
                    <td class="px-3 py-3 text-right border-r border-indigo-200 text-slate-600">{fmtQty(grandTotal.sl25)}</td>
                    <td class="px-3 py-3 text-right border-r border-indigo-200 text-slate-600">{fmtRev(grandTotal.dt25)}</td>
                    <td class="px-3 py-3 text-right border-r border-indigo-200 text-blue-700">{fmtQty(grandTotal.sl26)}</td>
                    <td class="px-3 py-3 text-right border-r border-indigo-200 text-blue-700">{fmtRev(grandTotal.dt26)}</td>
                    <td class="px-3 py-3 text-right border-r border-indigo-200 {getGrowthColor(grandTotal.growthQty)}">{fmtPct(grandTotal.growthQty)}</td>
                    <td class="px-3 py-3 text-right {getGrowthColor(grandTotal.growthRev)}">{fmtPct(grandTotal.growthRev)}</td>
                </tr>
            </thead>
            
            <tbody>
                {#if sortedTree.length === 0}
                    <tr><td colspan="7" class="p-10 text-center text-gray-400">Không có dữ liệu SSG để hiển thị.</td></tr>
                {:else}
                    {#each sortedTree as nganh (nganh.id)}
                        <tr class="border-b border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer" on:click={() => toggleRow(nganh.id)}>
                            <td class="px-4 py-2.5 font-bold text-gray-800 flex items-center gap-2">
                                <span class="w-4 inline-block text-center">{expandedRows.has(nganh.id) ? '▼' : '▶'}</span> {nganh.name}
                            </td>
                            <td class="px-3 py-2.5 text-right text-gray-500 border-l border-gray-200">{fmtQty(nganh.sl25)}</td>
                            <td class="px-3 py-2.5 text-right text-gray-500">{fmtRev(nganh.dt25)}</td>
                            <td class="px-3 py-2.5 text-right font-semibold text-blue-700 border-l border-gray-200 bg-blue-50/20">{fmtQty(nganh.sl26)}</td>
                            <td class="px-3 py-2.5 text-right font-semibold text-blue-700 bg-blue-50/20">{fmtRev(nganh.dt26)}</td>
                            <td class="px-3 py-2.5 text-right border-l border-gray-200 bg-emerald-50/10 {getGrowthColor(nganh.growthQty)}">{fmtPct(nganh.growthQty)}</td>
                            <td class="px-3 py-2.5 text-right bg-emerald-50/10 {getGrowthColor(nganh.growthRev)}">{fmtPct(nganh.growthRev)}</td>
                        </tr>
                        
                        {#if expandedRows.has(nganh.id)}
                            {#each nganh.children as nhom (nhom.id)}
                                <tr class="border-b border-gray-100 bg-white hover:bg-slate-50 cursor-pointer" on:click={() => toggleRow(nhom.id)}>
                                    <td class="px-4 py-2 font-semibold text-gray-700 flex items-center gap-2 pl-8">
                                        <span class="w-4 inline-block text-center text-gray-400">{expandedRows.has(nhom.id) ? '▾' : '▸'}</span> {nhom.name}
                                    </td>
                                    <td class="px-3 py-2 text-right text-gray-400 border-l border-gray-100">{fmtQty(nhom.sl25)}</td>
                                    <td class="px-3 py-2 text-right text-gray-400">{fmtRev(nhom.dt25)}</td>
                                    <td class="px-3 py-2 text-right font-medium text-blue-600 border-l border-gray-100">{fmtQty(nhom.sl26)}</td>
                                    <td class="px-3 py-2 text-right font-medium text-blue-600">{fmtRev(nhom.dt26)}</td>
                                    <td class="px-3 py-2 text-right border-l border-gray-100 {getGrowthColor(nhom.growthQty)}">{fmtPct(nhom.growthQty)}</td>
                                    <td class="px-3 py-2 text-right {getGrowthColor(nhom.growthRev)}">{fmtPct(nhom.growthRev)}</td>
                                </tr>

                                {#if expandedRows.has(nhom.id)}
                                    {#each nhom.children as hang (hang.id)}
                                        <tr class="border-b border-gray-50 bg-slate-50/30 hover:bg-slate-100">
                                            <td class="px-4 py-1.5 text-gray-600 pl-14 text-sm flex items-center before:content-[''] before:w-2 before:h-2 before:bg-gray-300 before:rounded-full before:mr-2">
                                                {hang.name}
                                            </td>
                                            <td class="px-3 py-1.5 text-right text-gray-400 border-l border-gray-50 text-xs">{fmtQty(hang.sl25)}</td>
                                            <td class="px-3 py-1.5 text-right text-gray-400 text-xs">{fmtRev(hang.dt25)}</td>
                                            <td class="px-3 py-1.5 text-right font-medium text-blue-500 border-l border-gray-50 text-xs">{fmtQty(hang.sl26)}</td>
                                            <td class="px-3 py-1.5 text-right font-medium text-blue-500 text-xs">{fmtRev(hang.dt26)}</td>
                                            <td class="px-3 py-1.5 text-right border-l border-gray-50 text-xs {getGrowthColor(hang.growthQty)}">{fmtPct(hang.growthQty)}</td>
                                            <td class="px-3 py-1.5 text-right text-xs {getGrowthColor(hang.growthRev)}">{fmtPct(hang.growthRev)}</td>
                                        </tr>
                                    {/each}
                                {/if}
                            {/each}
                        {/if}
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>