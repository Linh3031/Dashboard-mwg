<script>
    import { createEventDispatcher } from 'svelte';
    import FileInput from '../common/FileInput.svelte';
    import PasteInput from '../common/PasteInput.svelte';
    
    const dispatch = createEventDispatcher();
</script>

<details class="content-card data-card--green group !mb-2 !mt-2" data-tour="block-green"> 
    <summary class="content-card__header data-header--green flex items-center justify-between cursor-pointer list-none select-none !mb-0">
        <div class="flex items-center flex-wrap gap-2">
            <i data-feather="users" class="h-5 w-5 mr-1"></i>
            <span>CHI TIẾT NĂNG SUẤT NHÂN VIÊN</span>
            <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật khi cần theo dõi lương thưởng, năng suất)</span>
        </div>
        <i data-feather="chevron-down" class="transform transition-transform duration-200 group-open:rotate-180"></i>
    </summary>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 border-t border-green-200/50 pt-4">
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
                <FileInput label="Giờ công" icon="clock" link="https://reports.thegioididong.com/#/viewreport/168754" saveKey="saved_giocong"/>
            </div>
        </div>

        <div class="flex flex-col gap-2 overflow-hidden">
            <div class="flex justify-between items-center px-1 pb-1 border-b border-green-100/50">
                <span class="text-[12px] font-extrabold text-green-900 uppercase tracking-wide">Thưởng nóng</span>
                <button on:click={() => dispatch('openTutorial', 'thuong-nong')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <span>HƯỚNG DẪN</span>
                    <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                </button>
            </div>
            <div class="h-fit w-full overflow-hidden mt-1">
                <FileInput label="Thưởng nóng" icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey="saved_thuongnong"/>
            </div>
        </div>

        <div class="flex flex-col gap-2 overflow-hidden">
            <div class="flex justify-between items-center px-1 pb-1 border-b border-green-100/50">
                <span class="text-[12px] font-extrabold text-green-900 uppercase tracking-wide">Thưởng ERP</span>
                <button on:click={() => dispatch('openTutorial', 'thuong-erp')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <span>HƯỚNG DẪN</span>
                    <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                </button>
            </div>
            <div class="h-fit w-full overflow-hidden mt-1">
                <PasteInput label="Thưởng ERP" icon="clipboard" link="https://bi.thegioididong.com/reward?id=-1&tab=1" saveKeyPaste="daily_paste_thuongerp"/>
            </div>
        </div>
    </div>
</details>

<style>
    summary::-webkit-details-marker { display: none; }
</style>