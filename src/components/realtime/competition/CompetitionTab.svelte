<script>
  import { 
      realtimeYCXData, 
      globalSpecialPrograms, 
      globalCompetitionConfigs, 
      localCompetitionConfigs, // Store chứa cấu hình thi đua user
      selectedWarehouse 
  } from '../../../stores.js';
  import { services } from '../../../services.js'; 
  
  import SpecialProgramTable from './SpecialProgramTable.svelte';
  
  // [REFACTOR] Dùng chung component từ health-staff (đã có logic tô màu)
  import FocusCompetitionTable from '../../health-staff/competition/FocusCompetitionTable.svelte';

  let specialReportData = [];
  let competitionReportData = [];
  let hasData = false;

  // Reactive Statement: Chạy lại khi store thay đổi
  $: {
      // Fallback về mảng rỗng nếu chưa có dữ liệu
      let filteredData = $realtimeYCXData || [];
      
      // 1. Tính toán SP Đặc Quyền
      // Hàm này tên đúng là calculateSpecialProductReport (trong competition.report.js)
      const spReport = services.calculateSpecialProductReport(
          filteredData, 
          $globalSpecialPrograms || []
      );

      // 2. Tính toán Thi Đua Tùy Chỉnh (Hãng)
      // Kết hợp cả Global và Local Configs
      const allConfigs = [ ...($globalCompetitionConfigs || []), ...($localCompetitionConfigs || []) ];
      
      // Lọc trùng lặp Config (Ưu tiên cái mới nhất nếu trùng ID)
      const uniqueConfigs = Array.from(new Map(allConfigs.map(item => [item.id, item])).values());

      // [FIX CRITICAL]: Sửa tên hàm từ calculateCompetitionReport -> calculateCompetitionFocusReport
      // Nguyên nhân: Trong src/services/reports/competition.report.js định nghĩa là calculateCompetitionFocusReport
      const compReport = services.calculateCompetitionFocusReport(
          filteredData,
          uniqueConfigs
      );

      console.groupCollapsed(`[DEBUG REALTIME] Calc Result`);
      console.log("SP Report:", spReport);
      console.log("Comp Report:", compReport);
      console.groupEnd();
      
      specialReportData = spReport;
      competitionReportData = compReport;
      
      // Cờ check xem có dữ liệu để hiển thị không
      hasData = (specialReportData.length > 0 || competitionReportData.length > 0);
  }
</script>

<div class="h-full flex flex-col p-4 bg-gray-50 overflow-y-auto custom-scrollbar">
    {#if !hasData}
        <div class="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white p-8">
            <i data-feather="inbox" class="w-12 h-12 mb-3 opacity-50"></i>
            <p class="text-gray-500 font-medium mb-2">Chưa có dữ liệu thi đua hiển thị.</p>
            <div class="text-xs text-gray-400 space-y-1">
                <p>Vui lòng kiểm tra (Xem Console F12 để biết chi tiết):</p>
                <p>1. Đã tải file <strong>Realtime</strong> chưa?</p>
                <p>2. Đã tạo chương trình thi đua trong <strong>"Thiết lập mục tiêu"</strong> chưa?</p>
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
</style>