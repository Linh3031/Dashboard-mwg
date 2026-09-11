<script>
    import { createEventDispatcher } from 'svelte';
    import FileInput from '../common/FileInput.svelte';
    import GioCongPasteInput from './GioCongPasteInput.svelte';

    const dispatch = createEventDispatcher();

    // Trang timekeeping bị công ty chặn xuất Excel — chuyển mặc định sang ô dán. Vẫn giữ nguyên
    // ô Excel cũ trong code, chỉ ẩn UI, phòng trường hợp công ty mở lại export Excel.
    let showGioCongExcelFallback = false;
</script>

<div class="content-card data-card--green flex flex-col gap-4 !mb-2 !mt-2" data-tour="block-green">
    <h3 class="content-card__header data-header--green flex items-center w-full">
        <div class="flex items-center flex-wrap gap-2">
            <i data-feather="users" class="h-5 w-5 mr-1"></i>
            <span>CHI TIẾT NĂNG SUẤT NHÂN VIÊN</span>
            <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật khi cần theo dõi lương thưởng, năng suất)</span>
        </div>
    </h3>

    <div class="grid grid-cols-1 gap-4 border-t border-green-200/50 pt-4">
        <div class="flex flex-col gap-2 overflow-hidden">
            <div class="flex justify-between items-center px-1 pb-1 border-b border-green-100/50">
                <span class="text-[12px] font-extrabold text-green-900 uppercase tracking-wide">Giờ công</span>
                <button on:click={() => dispatch('openTutorial', 'gio-cong')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <span>HƯỚNG DẪN</span>
                    <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                </button>
            </div>
            <div class="h-fit w-full overflow-hidden mt-1">
                <GioCongPasteInput />
            </div>
            {#if showGioCongExcelFallback}
                <div class="h-fit w-full overflow-hidden mt-1">
                    <FileInput label="Giờ công" icon="clock" link="https://baocao.dienmayxanh.com/dashboard/timekeeping" saveKey="saved_giocong"/>
                </div>
            {/if}
        </div>
    </div>
</div>
