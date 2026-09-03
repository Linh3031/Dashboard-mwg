<script>
    import { createEventDispatcher } from 'svelte';
    import FileInput from '../common/FileInput.svelte';
    import PasteInput from '../common/PasteInput.svelte';

    const dispatch = createEventDispatcher();
</script>

<details class="content-card data-card--yellow group" data-tour="block-yellow"> 
    <summary class="content-card__header data-header--yellow flex items-center justify-between cursor-pointer list-none select-none !mb-0">
        <div class="flex items-center flex-wrap gap-2">
            <i data-feather="calendar" class="h-5 w-5 mr-1"></i>
            <span>DỮ LIỆU CẬP NHẬT 1 THÁNG 1 LẦN</span>
            <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật nếu cần xem so cùng kỳ)</span>
        </div>
        <i data-feather="chevron-down" class="transform transition-transform duration-200 group-open:rotate-180"></i>
    </summary>
    
    <div class="mt-4 border-t border-yellow-200/50 pt-4">
       <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4 flex items-center gap-2">
           <i data-feather="info" class="w-4 h-4"></i> Lưu ý: Dữ liệu sẽ được đồng bộ tự động lên cloud.
       </p> 
       
       <div class="grid md:grid-cols-3 gap-4"> 
            <div class="space-y-2">
                <div class="flex justify-between items-center px-1 pb-1 border-b border-yellow-200/50">
                    <span class="text-[12px] font-extrabold text-yellow-900 uppercase tracking-wide">Danh sách nhân viên</span>
                    <button on:click={() => dispatch('openTutorial', 'danh-sach-nv')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        <span>HƯỚNG DẪN</span>
                        <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
                <div class="h-fit w-full mt-1" data-tour="danh-sach-nv">
                   <FileInput label="Danh sách nhân viên" icon="users" saveKey="saved_danhsachnv" />
                </div>
            </div>
            <div class="space-y-2">
                <div class="flex justify-between items-center px-1 pb-1 border-b border-yellow-200/50">
                    <span class="text-[12px] font-extrabold text-yellow-900 uppercase tracking-wide">YCX Lũy Kế tháng trước</span>
                    <button on:click={() => dispatch('openTutorial', 'ycx-thang-truoc')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        <span>HƯỚNG DẪN</span>
                        <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
                <div class="h-fit w-full mt-1" data-tour="input-ycx-thang-truoc">
                    <FileInput label="YCX Lũy Kế tháng trước" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx_thangtruoc" isMultiMode={true} />
                </div>

                <div class="flex justify-between items-center px-1 pb-1 border-b border-yellow-200/50 mt-2">
                    <span class="text-[12px] font-extrabold text-yellow-900 uppercase tracking-wide">Thưởng nóng tháng trước</span>
                    <button on:click={() => dispatch('openTutorial', 'thuong-nong-thang-truoc')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        <span>HƯỚNG DẪN</span>
                        <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
                <FileInput label="Thưởng nóng tháng trước" icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey="saved_thuongnong_thangtruoc" />
            </div>
            <div class="space-y-2">
                <div class="flex justify-between items-center px-1 pb-1 border-b border-yellow-200/50">
                    <span class="text-[12px] font-extrabold text-yellow-900 uppercase tracking-wide">YCX Lũy kế năm trước</span>
                    <button on:click={() => dispatch('openTutorial', 'ycx-cung-ky-nam')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        <span>HƯỚNG DẪN</span>
                        <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
                <div class="h-fit w-full mt-1" data-tour="input-ycx-nam-truoc">
                    <FileInput label="YCX Lũy kế năm trước" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx_cungkynam" isMultiMode={true} />
                </div>

                <div class="flex justify-between items-center px-1 pb-1 border-b border-yellow-200/50 mt-2">
                    <span class="text-[12px] font-extrabold text-yellow-900 uppercase tracking-wide">Thưởng ERP tháng trước</span>
                    <button on:click={() => dispatch('openTutorial', 'thuong-erp-thang-truoc')} class="group flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full transition-all text-[10px] font-bold shadow-sm" title="Xem video hướng dẫn">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        <span>HƯỚNG DẪN</span>
                        <i data-feather="play-circle" class="w-3 h-3 group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
                <PasteInput label="Thưởng ERP tháng trước" icon="clipboard" link="https://bi.thegioididong.com/reward?id=-1&tab=1" saveKeyPaste="saved_thuongerp_thangtruoc" />
           </div>
       </div>
   </div>
</details>

<style>
    summary::-webkit-details-marker { display: none; }
</style>