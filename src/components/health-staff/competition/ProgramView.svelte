<script>
  import FocusCompetitionTable from './FocusCompetitionTable.svelte';

  export let reportData = []; // Mảng kết quả tính toán từ service
</script>

{#if reportData.length === 0}
    <div class="p-12 text-center bg-white border-2 border-dashed border-gray-300 rounded-xl">
        <p class="text-gray-500 font-medium">Không có dữ liệu chương trình thi đua.</p>
        <p class="text-sm text-gray-400 mt-2">
            Vui lòng kiểm tra:
            1. Đã tạo chương trình trong "Thiết lập mục tiêu"?
            2. Đã tải file YCX?
            3. Có phát sinh doanh thu cho các nhóm hàng đã chọn?
        </p>
    </div>
{:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        {#each reportData as result (result.competition.id)}
            <div class="h-full">
                <FocusCompetitionTable competitionResult={result} />
            </div>
        {/each}
    </div>
{/if}