<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { dataProcessing } from '../../services/dataProcessing.js'; 
  import { danhSachNhanVien } from '../../stores.js';
  
  export let rawData = [];

  const dispatch = createEventDispatcher();
  let sortKey = 'total';
  let sortDirection = 'desc';

  let uniqueMonths = [];
  let groupedData = [];

  // [PHẪU THUẬT LOGIC]: Copy nguyên bản hàm parseMoney từ salesProcessor.js
  const parseMoney = (value) => {
      if (typeof value === 'number') return value;
      if (!value) return 0;
      return parseFloat(String(value).replace(/,/g, '')) || 0;
  };

  function parseUniversalDate(val) {
      if (val === null || val === undefined || val === '') return null;
      if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
      if (typeof val === 'number') {
          const jsEpoch = Math.round((val - 25569) * 86400 * 1000);
          const tempDate = new Date(jsEpoch);
          return new Date(tempDate.getUTCFullYear(), tempDate.getUTCMonth(), tempDate.getUTCDate()).getTime();
      }
      const str = String(val).trim();
      const parts = str.split(/[\s,T]+/); 
      if (parts[0].includes('/')) {
          const dParts = parts[0].split('/');
          if (dParts.length >= 3) {
              const p1 = parseInt(dParts[0], 10); const p2 = parseInt(dParts[1], 10); const p3 = parseInt(dParts[2], 10);
              if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
              return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
          }
      } else if (parts[0].includes('-')) {
          const dParts = parts[0].split('-');
          if (dParts.length >= 3) {
              const p1 = parseInt(dParts[0], 10); const p2 = parseInt(dParts[1], 10); const p3 = parseInt(dParts[2], 10);
              if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
              return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
          }
      }
      const fallbackDate = new Date(val);
      if (!isNaN(fallbackDate.getTime())) return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).setHours(0,0,0,0);
      return null;
  }

  $: validEmpIds = new Set(($danhSachNhanVien || []).map(e => String(e.maNV || e.ma_nv || e.MANHANVIEN || e['Mã NV'] || '').trim()));

  $: {
      const monthsSet = new Set();
      const map = new Map();
      const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi ? dataProcessing.getHeSoQuyDoi() : {};
      const validHTX = dataProcessing.getHinhThucXuatTinhDoanhThu ? dataProcessing.getHinhThucXuatTinhDoanhThu() : new Set();

      rawData.forEach(row => {
          // 1. [ĐỒNG BỘ]: Chỉ lấy Mã NV từ cột Người tạo bằng RegEx giống salesProcessor.js
          const msnvMatch = String(row.nguoiTao || row['Người tạo'] || '').match(/(\d+)/);
          if (!msnvMatch) return;
          const empId = msnvMatch[1].trim();

          // Chặn cửa nhân viên ngoài shop
          if (validEmpIds.size > 0 && !validEmpIds.has(empId)) return;

          // Lấy Tên NV chuẩn xác từ danhSachNhanVien
          const empFromList = $danhSachNhanVien.find(e => String(e.maNV || e.ma_nv || e.MANHANVIEN || '').trim() === empId);
          const hoTen = empFromList ? empFromList.hoTen : 'Unknown';

          // 2. [ĐỒNG BỘ]: Kiểm tra Hình thức xuất
          const htx = String(row.hinhThucXuat || row.HINH_THUC_XUAT || row['Hình thức xuất'] || '').trim();
          if (validHTX.size > 0 && !validHTX.has(htx)) return;

          // 3. [ĐỒNG BỘ CỐT LÕI]: Logic Đã Xuất / Chưa Xuất y hệt salesProcessor.js
          let isValid = false;
          const trangThaiXuat = String(row.trangThaiXuat || row.TRANG_THAI_XUAT || '').trim();
          const isDaXuat = !trangThaiXuat || trangThaiXuat === 'Đã xuất' || trangThaiXuat === 'Đã giao';

          if (isDaXuat) {
              isValid = true; // Đã xuất thì không cần check Thu/Hủy/Trả
          } else if (trangThaiXuat === 'Chưa xuất') {
              const thuTien = String(row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || '').trim();
              const huy = String(row.trangThaiHuy || row.TRANG_THAI_HUY || '').trim();
              const tra = String(row.tinhTrangTra || row.TINH_TRANG_TRA || '').trim();
              if (thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả') {
                  isValid = true;
              }
          }
          if (!isValid) return;

          // 4. Map Ngày tháng
          let dateVal = null;
          for (const key of Object.keys(row)) {
              const normKey = key.toLowerCase().replace(/[\s_]/g, ''); 
              if (normKey === 'ngàytạo' || normKey === 'ngaytao' || normKey === 'createdate' || key.includes('Ngày tạo')) {
                  dateVal = row[key]; break;
              }
          }
          const parsedDate = parseUniversalDate(dateVal);
          if(!parsedDate) return;
          
          const d = new Date(parsedDate);
          const m = (d.getMonth() + 1).toString().padStart(2, '0');
          const y = d.getFullYear();
          const monthKey = `${m}/${y}`;
          monthsSet.add(monthKey);

          if(!map.has(empId)) {
              map.set(empId, { maNV: empId, hoTen: hoTen, months: {}, totalDtqd: 0, totalDt: 0 });
          }
          
          const emp = map.get(empId);
          if(!emp.months[monthKey]) emp.months[monthKey] = { dtqd: 0, dt: 0 };

          // 5. [ĐỒNG BỘ]: Tính tiền không nhồi thêm hệ số 0.3 trả góp
          const thanhTien = parseMoney(row.thanhTien || row.THANH_TIEN || row.DoanhThu || row['Thành tiền']);
          const heSo = heSoQuyDoi[row.nhomHang || row.NHOM_HANG || row['Nhóm hàng']] || 1;
          
          let dtqd = row.revenueQuyDoi !== undefined ? row.revenueQuyDoi : (thanhTien * heSo);
          if (typeof dtqd === 'string') dtqd = parseMoney(dtqd); // Chống lỗi text Excel

          emp.months[monthKey].dt += thanhTien;
          emp.months[monthKey].dtqd += dtqd;
          emp.totalDt += thanhTien;
          emp.totalDtqd += dtqd;
      });

      uniqueMonths = Array.from(monthsSet).sort((a,b) => {
          const [ma, ya] = a.split('/');
          const [mb, yb] = b.split('/');
          return new Date(ya, ma-1) - new Date(yb, mb-1);
      });

      groupedData = Array.from(map.values());
  }

  $: sortedData = [...groupedData].sort((a, b) => {
      let valA = 0, valB = 0;
      if (sortKey === 'hoTen') {
         return sortDirection === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
      } else if (sortKey === 'total') {
          valA = a.totalDtqd; valB = b.totalDtqd;
      } else if (sortKey.startsWith('month_')) {
          const parts = sortKey.split('_');
          const m = parts[1];
          const type = parts[2];

          const aM = a.months[m] || {dtqd: 0, dt: 0};
          const bM = b.months[m] || {dtqd: 0, dt: 0};

          if (type === 'dtqd') {
              valA = aM.dtqd; valB = bM.dtqd;
          } else if (type === 'tyle') {
              valA = aM.dt > 0 ? (aM.dtqd / aM.dt) - 1 : -1;
              valB = bM.dt > 0 ? (bM.dtqd / bM.dt) - 1 : -1;
          }
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  $: topCount = sortedData.length <= 15 ? 3 : 5;

  function handleSort(key) {
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  function getRowStyle(index) {
      if (index === 0) return 'bg-amber-50/40 hover:bg-amber-100/60';
      if (index === 1) return 'bg-slate-100/50 hover:bg-slate-200/60'; 
      if (index === 2) return 'bg-orange-50/30 hover:bg-orange-100/50';
      if (index < topCount) return 'bg-blue-50/20 hover:bg-blue-50/60'; 
      return 'bg-white hover:bg-slate-50 border-b border-gray-100'; 
  }

  function getRankIcon(index) {
      if (index === 0) return '🏆';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index < topCount) return '⭐';
      return `#${index + 1}`;
  }

  function handleRowClick(employeeId) {
      dispatch('viewDetail', { employeeId });
  }
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mt-6 animate-fade-in" data-capture-group="revenue-multi-month-table">
    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50">
        <div class="flex items-center gap-2">
            <div class="p-2 bg-indigo-100 rounded-lg text-indigo-600"><i data-feather="layers" class="w-5 h-5"></i></div>
            <div>
                <h3 class="font-bold text-indigo-900 text-lg uppercase">Phân tích Lũy kế Đa tháng</h3>
                <p class="text-xs text-indigo-600/80">Chỉ thống kê NV thuộc DS hiện tại. Thuật toán đồng bộ 100% với Kỳ hiện tại</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full shadow-sm">Đơn vị: Triệu</span>
            <div class="flex items-center gap-2 ml-1 border-l border-indigo-200 pl-4" title="Tắt chế độ xem nhiều tháng">
                <span class="text-xs font-bold text-indigo-700 cursor-pointer" on:click={() => dispatch('toggleMode')}>Xem nhiều tháng</span>
                <button class="bg-indigo-600 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none" on:click={() => dispatch('toggleMode')}>
                    <span class="translate-x-4 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                </button>
            </div>
        </div>
    </div>

    <div class="overflow-x-auto custom-scrollbar">
        <table class="min-w-full text-sm text-left border-collapse" style="min-width: {350 + uniqueMonths.length * 160}px">
            <thead class="uppercase text-xs shadow-[0_2px_4px_rgba(0,0,0,0.02)] relative z-30">
                 <tr class="bg-slate-50 border-b border-gray-200 text-slate-500">
                    <th rowspan="2" class="px-2 py-3 text-center w-[56px] min-w-[56px] border-r border-gray-200 sticky left-0 z-30 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-bold">Hạng</th>
                    <th rowspan="2" class="px-4 py-3 text-left w-[180px] min-w-[180px] max-w-[180px] border-r border-gray-200 cursor-pointer hover:bg-slate-100 sticky left-[56px] z-30 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-bold" on:click={() => handleSort('hoTen')}>
                        <div class="flex items-center text-slate-700">Nhân viên{#if sortKey === 'hoTen'}<span class="ml-1 text-indigo-500">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>
                    <th rowspan="2" class="px-4 py-3 text-right border-r border-gray-200 cursor-pointer hover:bg-slate-100 sticky left-[236px] z-30 bg-indigo-50/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-black text-indigo-900" on:click={() => handleSort('total')}>
                        <div class="flex items-center justify-end">Tổng DTQĐ{#if sortKey === 'total'}<span class="ml-1 text-indigo-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                    </th>
                    {#each uniqueMonths as month}
                        <th colspan="2" class="px-4 py-2 text-center border-r border-gray-200 border-l-2 border-l-slate-300 font-bold tracking-wider text-slate-600">Tháng {month}</th>
                    {/each}
                </tr>
                <tr class="bg-white border-b border-gray-200">
                    {#each uniqueMonths as month}
                        <th class="px-3 py-2 text-right text-slate-600 border-r border-gray-100 border-l-2 border-l-slate-300 cursor-pointer hover:bg-slate-50 font-semibold" on:click={() => handleSort(`month_${month}_dtqd`)}>
                            <div class="flex items-center justify-end">DT QĐ{#if sortKey === `month_${month}_dtqd`}<span class="ml-1 text-indigo-500 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                        </th>
                        <th class="px-3 py-2 text-right text-slate-400 border-r border-gray-200 cursor-pointer hover:bg-slate-50 font-medium" on:click={() => handleSort(`month_${month}_tyle`)}>
                            <div class="flex items-center justify-end">% QĐ{#if sortKey === `month_${month}_tyle`}<span class="ml-1 text-indigo-500 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}</div>
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                 {#if sortedData.length === 0}
                    <tr><td colspan={3 + uniqueMonths.length * 2} class="p-12 text-center text-gray-400 italic bg-gray-50">Không có dữ liệu của NV siêu thị hiện tại hoặc dữ liệu không hợp lệ.</td></tr>
                {:else}
                    {#each sortedData as item, index (item.maNV)}
                        <tr class="transition-colors duration-150 group cursor-pointer {getRowStyle(index)}" on:click={() => handleRowClick(item.maNV)}>
                            <td class="px-2 py-3 text-center border-r border-gray-100 font-bold sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] {getRowStyle(index)} {index <= 2 ? 'text-xl' : 'text-sm text-slate-400'}">{getRankIcon(index)}</td>
                            <td class="px-4 py-3 font-semibold text-slate-700 truncate border-r border-gray-100 group-hover:text-indigo-700 sticky left-[56px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] {getRowStyle(index)}" title={item.hoTen}>{formatters.getShortEmployeeName(item.hoTen, item.maNV)}</td>
                            <td class="px-4 py-3 text-right font-black text-indigo-700 border-r border-gray-100 bg-indigo-50/40 sticky left-[236px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{formatters.formatRevenue(item.totalDtqd)}</td>
                            {#each uniqueMonths as month}
                                {@const mData = item.months[month] || {dtqd: 0, dt: 0}}
                                {@const tyle = mData.dt > 0 ? (mData.dtqd / mData.dt) - 1 : 0}
                                <td class="px-3 py-3 text-right font-bold text-gray-800 border-r border-gray-100 border-l-2 border-l-slate-200">{mData.dtqd > 0 ? formatters.formatRevenue(mData.dtqd) : '-'}</td>
                                <td class="px-3 py-3 text-right text-slate-400 text-xs border-r border-gray-100 font-medium">{mData.dtqd > 0 ? formatters.formatPercentage(tyle) : '-'}</td>
                            {/each}
                         </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; } 
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>