<script>
  import { 
      realtimeYCXData, 
      globalSpecialPrograms, 
      globalCompetitionConfigs, 
      localCompetitionConfigs 
  } from '../../../stores.js';
  import { services } from '../../../services.js'; // Gọi service tính toán
  
  // Import 2 component con đã tạo ở Bước 1 & 2
  import SpecialProgramTable from './SpecialProgramTable.svelte';
  import FocusCompetitionTable from './FocusCompetitionTable.svelte';

  export let selectedWarehouse = '';

  let specialReportData = [];
  let competitionReportData = [];
  let hasData = false;

  // Reactive Statement: Tính toán lại khi dữ liệu hoặc kho thay đổi
  $: {
      // 1. Lọc dữ liệu Realtime theo kho (nếu có chọn)
      let filteredData = $realtimeYCXData;
      if (selectedWarehouse) {
          // Lọc theo mã kho trong cột 'nguoiTao' hoặc logic tương tự nếu có cột 'maKho'
          // Lưu ý: realtimeYCXData chuẩn hóa thường chưa có maKho trực tiếp, 
          // nhưng services.calculate... sẽ map với DSNV để lấy kho.
          // Tuy nhiên, để tối ưu, ta cứ truyền full data vào service, 
          // service sẽ map với DSNV. Nếu DSNV đã được lọc (hoặc logic service hỗ trợ), nó sẽ đúng.
          // Ở đây ta truyền full data đã chuẩn hóa.
      }

      // 2. Tính toán SP Đặc Quyền
      // Logic cũ: services.calculateSpecialProductReport(data, configs)
      specialReportData = services.calculateSpecialProductReport(
          filteredData, 
          $globalSpecialPrograms
      );

      // 3. Tính toán Thi Đua Tùy Chỉnh (Hãng)
      // Gộp config chung (Admin) và riêng (Local)
      const allConfigs = [ ...$globalCompetitionConfigs, ...$localCompetitionConfigs ];
      
      competitionReportData = services.calculateCompetitionFocusReport(
          filteredData,
          allConfigs
      );

      // Lọc lại kết quả theo kho (Vì service trả về mảng nhân viên toàn hệ thống nếu không lọc trước)
      if (selectedWarehouse) {
          // Hàm lọc helper
          const filterByWarehouse = (reports) => {
              return reports.map(group => ({
                  ...group,
                  employeeData: group.employeeData.filter(emp => emp.maKho === selectedWarehouse)
              })).filter(group => group.employeeData.length > 0);
          };

          specialReportData = filterByWarehouse(specialReportData);
          competitionReportData = filterByWarehouse(competitionReportData);
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