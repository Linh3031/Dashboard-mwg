<script>
  import { 
      realtimeYCXData, 
      globalSpecialPrograms, 
      globalCompetitionConfigs, 
      localCompetitionConfigs, // [QUAN TRỌNG] Store chứa cấu hình thi đua user
      selectedWarehouse 
  } from '../../../stores.js';
  import { services } from '../../../services.js'; 
  
  import SpecialProgramTable from './SpecialProgramTable.svelte';
  import FocusCompetitionTable from './FocusCompetitionTable.svelte';

  let specialReportData = [];
  let competitionReportData = [];
  let hasData = false;

  $: {
      const currentWarehouse = $selectedWarehouse;
      // [FIX] Fallback về mảng rỗng nếu chưa có dữ liệu
      let filteredData = $realtimeYCXData || [];
      
      // 1. Tính toán SP Đặc Quyền
      const spReport = services.calculateSpecialProductReport(
          filteredData, 
          $globalSpecialPrograms || []
      );

      // 2. Tính toán Thi Đua Tùy Chỉnh (Hãng)
      // [QUAN TRỌNG] Kết hợp cả Global và Local Configs
      const allConfigs = [ ...($globalCompetitionConfigs || []), ...($localCompetitionConfigs || []) ];
      
      const compReport = services.calculateCompetitionFocusReport(
          filteredData,
          allConfigs
      );

      // 3. Lọc kết quả theo kho (Nếu đã chọn kho)
      if (currentWarehouse) {
          const filterByWarehouse = (reports) => {
              return reports.map(group => ({
                  ...group,
                  employeeData: group.employeeData.filter(emp => String(emp.maKho) === String(currentWarehouse))
              })).filter(group => group.employeeData.length > 0);
          };

          specialReportData = filterByWarehouse(spReport);
          competitionReportData = filterByWarehouse(compReport);
      } else {
          specialReportData = spReport;
          competitionReportData = compReport;
      }

      hasData = specialReportData.length > 0 || competitionReportData.length > 0;
  }
</script>

<div class="animate-fade-in pb-10">
    {#if !hasData}
        <div class="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p class="text-gray-500 font-medium mb-2">Chưa có dữ liệu thi đua hiển thị.</p>
            <div class="text-xs text-gray-400 space-y-1">
                <p>Vui lòng kiểm tra:</p>
                <p>1. Đã tải file <strong>Realtime</strong> chưa?</p>
                <p>2. Đã tạo chương trình thi đua trong <strong>"Thiết lập mục tiêu"</strong> chưa?</p>
                <p>3. Dữ liệu bán hàng có khớp với <strong>Hãng/Nhóm hàng</strong> đã chọn không?</p>
                {#if $localCompetitionConfigs.length === 0}
                    <p class="text-orange-500 font-bold mt-2">→ Bạn chưa tạo chương trình thi đua nào cho kho này.</p>
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
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
</style>