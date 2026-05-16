<script>
  import { 
      realtimeYCXData, 
      globalSpecialPrograms, 
      globalCompetitionConfigs, 
      localCompetitionConfigs, 
      selectedWarehouse,
      modalState 
  } from '../../../stores.js';
  import { services } from '../../../services.js'; 
  import { afterUpdate } from 'svelte';
  
  import SpecialProgramTable from './SpecialProgramTable.svelte';
  import FocusCompetitionTable from '../../health-staff/competition/FocusCompetitionTable.svelte';

  let specialReportData = [];
  let competitionReportData = [];
  let hasData = false;

  // [CODEGENESIS]: Hàm phẫu thuật cộng dồn dữ liệu nhân viên bán nhiều kho
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
                  // Chỉ cộng dồn các chỉ số lượng hóa thô, loại bỏ các trường tỷ lệ % tính sẵn
                  Object.keys(emp).forEach(key => {
                      if (typeof emp[key] === 'number' && key !== 'maNV' && key !== 'employeeId' && !key.toLowerCase().includes('tyle') && !key.toLowerCase().includes('percent') && !key.toLowerCase().includes('hoanthanh')) {
                          existing[key] = (existing[key] || 0) + emp[key];
                      }
                  });
              }
          });
          
          const aggregatedEmpData = Array.from(map.values());
          // Tái cấu trúc và tính toán lại tỷ lệ % dựa trên tổng số đã được cộng dồn
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

  // Reactive Statement: Tự động tính toán lại khi người dùng đổi kho hoặc cập nhật file
  $: {
      let filteredData = $realtimeYCXData || [];
      
      const spReport = services.calculateSpecialProductReport(
          filteredData, 
          $globalSpecialPrograms || []
      );

      const allConfigs = [ ...($globalCompetitionConfigs || []), ...($localCompetitionConfigs || []) ];
      const uniqueConfigs = Array.from(new Map(allConfigs.map(item => [item.id, item])).values());
      
      const compReport = services.calculateCompetitionFocusReport(
          filteredData,
          uniqueConfigs
      );
      
      // [CODEGENESIS]: Chạy bộ lọc nén dữ liệu nhân viên trùng lặp
      specialReportData = aggregateReportData(spReport);
      competitionReportData = aggregateReportData(compReport);
      
      hasData = (specialReportData.length > 0 || competitionReportData.length > 0);
  }

  afterUpdate(() => {
      if (typeof window.feather !== 'undefined') window.feather.replace();
  });
</script>

<div id="competition-realtime-root" class="h-full flex flex-col p-4 bg-gray-50 overflow-y-auto custom-scrollbar">
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200 gap-4 shrink-0">
        <div class="flex flex-col">
            <span class="text-xs font-bold text-indigo-500 uppercase tracking-wider">Chương trình thi đua Realtime</span>
            <span class="text-sm text-gray-500 font-medium">Tiêu chí cấu hình được áp dụng đồng bộ toàn hệ thống</span>
        </div>
        <button 
            on:click={() => modalState.update(s => ({ ...s, activeModal: 'user-competition-modal', editingIndex: -1 }))}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
            <i data-feather="plus-circle" class="w-4 h-4"></i> Thiết lập Thi Đua
        </button>
    </div>

    {#if !hasData}
        <div class="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white p-8">
            <i data-feather="inbox" class="w-12 h-12 mb-3 opacity-50"></i>
            <p class="text-gray-500 font-medium mb-2">Chưa có dữ liệu thi đua hiển thị.</p>
            <div class="text-xs text-gray-400 space-y-1">
                <p>Vui lòng kiểm tra (Xem Console F12 để biết chi tiết):</p>
                <p>1. Đã tải file <strong>Realtime</strong> chưa?</p>
                <p>2. Đã tạo chương trình thi đua bằng nút <strong>"Thiết lập Thi Đua"</strong> ở trên chưa?</p>
                <p>3. Dữ liệu bán hàng có khớp với <strong>Hãng/Nhóm hàng</strong> đã chọn không?</p>
                {#if $localCompetitionConfigs.length === 0 && $globalCompetitionConfigs.length === 0}
                    <p class="text-orange-500 font-bold mt-2">→ Bạn chưa tạo chương trình thi đua nào.</p>
                {/if}
            </div>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each specialReportData as programResult (programResult.program.id)}
                <div class="h-full">
                    <SpecialProgramTable {programResult} />
                </div>
            {/each}

            {#each competitionReportData as competitionResult (competitionResult.competition.id)}
                <div class="h-full">
                    <FocusCompetitionTable {competitionResult} />
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    
    .grid > div {
        animation: fadeIn 0.3s ease-out forwards;
    }

    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }

    :global(.capture-container) #competition-realtime-root {
        width: fit-content !important;
        height: auto !important;
        overflow: visible !important;
        background-color: #f9fafb !important;
        margin: 0 !important;
    }

    :global(.capture-container) #competition-realtime-root .grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(600px, 1fr)) !important;
        width: auto !important;
        gap: 24px !important;
    }
</style>