<script>
  import { modalState, localCompetitionConfigs, selectedWarehouse } from '../../../stores.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { afterUpdate } from 'svelte';
  import FocusCompetitionTable from './FocusCompetitionTable.svelte';

  export let reportData = []; 

  const defaultPalettes = ['blue', 'emerald', 'pink', 'amber', 'purple'];

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

  // [SURGICAL UPGRADE] Xử lý trực tiếp Edit / Delete từ card (Yêu cầu số 1 & 7)
  function handleEdit(config) {
      const idx = $localCompetitionConfigs.findIndex(c => c.id === config.id);
      if (idx >= 0) {
          modalState.update(s => ({ ...s, activeModal: 'user-competition-modal', editingIndex: idx }));
      }
  }

  async function handleDelete(config) {
      if (!confirm(`Bạn có chắc chắn muốn xóa bảng thi đua "${config.name}"?`)) return;
      let newConfigs = $localCompetitionConfigs.filter(c => c.id !== config.id);
      localCompetitionConfigs.set(newConfigs);
      if ($selectedWarehouse) {
          try { await datasyncService.saveCompetitionConfigs($selectedWarehouse, newConfigs); }
          catch(e) { console.error(e); }
      }
  }

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
        <!-- [SURGICAL UPGRADE] Nút này giờ chỉ làm đúng vụ tạo mới, mở form trực tiếp -->
        <button 
            on:click={() => modalState.update(s => ({ ...s, activeModal: 'user-competition-modal', editingIndex: -1 }))}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
            <i data-feather="plus-circle" class="w-4 h-4"></i> + Tạo Bảng Thi Đua Mới
        </button>
    </div>

    {#if aggregatedReportDataList.length === 0}
        <div class="p-12 text-center bg-white border-2 border-dashed border-gray-300 rounded-xl">
            <p class="text-gray-500 font-medium">Không có dữ liệu chương trình thi đua.</p>
            <p class="text-sm text-gray-400 mt-2">
                Vui lòng kiểm tra:
                1. Đã bấm "+ Tạo Bảng Thi Đua Mới" ở góc trên?
                2. Đã tải file YCX của tháng chưa?
                3. Có phát sinh doanh thu cho các nhóm hàng đã chọn?
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            {#each aggregatedReportDataList as result, index (result.competition.id)}
                <div 
                    class="h-full" 
                    data-capture-group="competition-program"
                    data-capture-filename="ThiDua_{result.competition.name || result.competition.id}"
                >
                    <!-- [SURGICAL UPGRADE] Lắng nghe sự kiện edit và delete từ card -->
                    <FocusCompetitionTable 
                        competitionResult={result} 
                        colorTheme={result.competition.color || defaultPalettes[index % defaultPalettes.length]}
                        on:edit={() => handleEdit(result.competition)}
                        on:delete={() => handleDelete(result.competition)}
                    />
                </div>
            {/each}
        </div>
    {/if}
</div>