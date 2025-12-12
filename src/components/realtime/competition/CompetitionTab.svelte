<script>
  import { 
      realtimeYCXData, 
      globalSpecialPrograms, 
      globalCompetitionConfigs, 
      localCompetitionConfigs,
      selectedWarehouse // [FIX] Import store này
  } from '../../../stores.js';
  import { services } from '../../../services.js'; 
  
  import SpecialProgramTable from './SpecialProgramTable.svelte';
  import FocusCompetitionTable from './FocusCompetitionTable.svelte';

  // [FIX] Bỏ export let selectedWarehouse

  let specialReportData = [];
  let competitionReportData = [];
  let hasData = false;

  $: {
      // [FIX] Dùng $selectedWarehouse
      const currentWarehouse = $selectedWarehouse;
      let filteredData = $realtimeYCXData || [];
      
      console.log(`[CompetitionTab] Recalculating... Rows: ${filteredData.length}, Warehouse: ${currentWarehouse}`);

      // 2. Tính toán SP Đặc Quyền
      const spReport = services.calculateSpecialProductReport(
          filteredData, 
          $globalSpecialPrograms || []
      );

      // 3. Tính toán Thi Đua Tùy Chỉnh (Hãng)
      const allConfigs = [ ...($globalCompetitionConfigs || []), ...($localCompetitionConfigs || []) ];
      const compReport = services.calculateCompetitionFocusReport(
          filteredData,
          allConfigs
      );

      // 4. Lọc kết quả theo kho
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
            <p class="text-xs text-gray-400">
                Vui lòng kiểm tra: 
                1. Đã tải file Realtime chưa? 
                2. Đã tạo chương trình thi đua trong "Thiết lập mục tiêu" chưa?
                3. Dữ liệu bán hàng có khớp với nhóm hàng đã chọn không?
            </p>
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