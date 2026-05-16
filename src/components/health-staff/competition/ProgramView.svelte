<script>
  import { modalState } from '../../../stores.js';
  import { afterUpdate } from 'svelte';
  import FocusCompetitionTable from './FocusCompetitionTable.svelte';

  export let reportData = []; // Mảng kết quả tính toán từ service

  // [CODEGENESIS]: Hàm xử lý gộp dòng dữ liệu nhân viên bán đa kho cho tab Lũy kế
  function aggregateReportData(reportArray) {
      if (!reportArray || !Array.isArray(reportArray)) return [];
      return reportArray.map(item => {
          const empData = item.employeeData || item.employeeResults || [];
          const keyName = item.employeeData ? 'employeeData' : (item.employeeResults ? 'employeeResults' : '');
          
          if (!keyName || empData.length === 0) return item;
          
          const map = new Map();
          empData.forEach(emp => {
              const id = emp.maNV || emp.employeeId;
              if (!id) return;
              if (!map.has(id)) {
                  map.set(id, { ...emp });
              } else {
                  const existing = map.get(id);
                  Object.keys(emp).forEach(key => {
                      if (typeof emp[key] === 'number' && key !== 'maNV' && key !== 'employeeId' && !key.toLowerCase().includes('tyle') && !key.toLowerCase().includes('percent') && !key.toLowerCase().includes('hoanthanh')) {
                          existing[key] = (existing[key] || 0) + emp[key];
                      }
                  });
              }
          });
          
          const aggregatedEmpData = Array.from(map.values());
          aggregatedEmpData.forEach(emp => {
              if ('slNhomHang' in emp && 'slDacQuyen' in emp) {
                  emp.tyLeSL = emp.slNhomHang > 0 ? (emp.slDacQuyen / emp.slNhomHang) : 0;
              }
              if ('dtNhomHang' in emp && 'dtDacQuyen' in emp) {
                  emp.tyLeDT = emp.dtNhomHang > 0 ? (emp.dtDacQuyen / emp.dtNhomHang) : 0;
              }
              if ('target' in emp && 'actual' in emp) {
                  emp.hoanThanh = emp.target > 0 ? (emp.actual / emp.target) : 0;
              }
              if ('target' in emp && 'revenue' in emp) {
                  emp.hoanThanh = emp.target > 0 ? (emp.revenue / emp.target) : 0;
              }
          });
          
          return {
              ...item,
              [keyName]: aggregatedEmpData
          };
      });
  }

  $: aggregatedReportDataList = aggregateReportData(reportData);

  afterUpdate(() => {
      if (typeof window.feather !== 'undefined') window.feather.replace();
  });
</script>

<div class="w-full flex flex-col">
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 gap-4">
        <div class="flex flex-col">
            <span class="text-xs font-bold text-indigo-500 uppercase tracking-wider">Chương trình thi đua Lũy Kế</span>
            <span class="text-sm text-gray-500 font-medium">Tiêu chí cấu hình được áp dụng đồng bộ toàn hệ thống</span>
        </div>
        <button 
            on:click={() => modalState.update(s => ({ ...s, activeModal: 'user-competition-modal', editingIndex: -1 }))}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
            <i data-feather="plus-circle" class="w-4 h-4"></i> Thiết lập Thi Đua
        </button>
    </div>

    {#if aggregatedReportDataList.length === 0}
        <div class="p-12 text-center bg-white border-2 border-dashed border-gray-300 rounded-xl">
            <p class="text-gray-500 font-medium">Không có dữ liệu chương trình thi đua.</p>
            <p class="text-sm text-gray-400 mt-2">
                Vui lòng kiểm tra:
                1. Đã tạo chương trình trong nút "Thiết lập Thi Đua" ở góc trên?
                2. Đã tải file YCX của tháng chưa?
                3. Có phát sinh doanh thu cho các nhóm hàng đã chọn?
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            {#each aggregatedReportDataList as result (result.competition.id)}
                <div 
                    class="h-full" 
                    data-capture-group="competition-program"
                    data-capture-filename="ThiDua_{result.competition.name || result.competition.id}"
                >
                    <FocusCompetitionTable competitionResult={result} />
                </div>
            {/each}
        </div>
    {/if}
</div>