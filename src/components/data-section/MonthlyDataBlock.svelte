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
            
            <!-- Nút Help -->
            <button 
                on:click|preventDefault|stopPropagation={() => dispatch('openTutorial', 'data-thang')} 
                class="text-yellow-700 hover:bg-yellow-200/50 p-1.5 rounded-full transition-colors ml-2" 
                title="Xem hướng dẫn khối này"
            >
                <i data-feather="help-circle" class="w-5 h-5"></i>
            </button>
            
            <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật nếu cần xem so cùng kỳ)</span>
        </div>
        <i data-feather="chevron-down" class="transform transition-transform duration-200 group-open:rotate-180"></i>
    </summary>
    
    <div class="mt-4 border-t border-yellow-200/50 pt-4">
       <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4 flex items-center gap-2">
           <i data-feather="info" class="w-4 h-4"></i> Lưu ý: Dữ liệu sẽ được đồng bộ tự động lên cloud.
       </p> 
       
       <div class="grid md:grid-cols-3 gap-4"> 
            <div class="space-y-4"> 
                <div class="h-fit w-full" data-tour="danh-sach-nv">
                   <FileInput label="Danh sách nhân viên" icon="users" saveKey="saved_danhsachnv" />
                </div>
            </div> 
            <div class="space-y-4"> 
                <div class="h-fit w-full" data-tour="input-ycx-thang-truoc">
                    <FileInput label="YCX Lũy Kế tháng trước" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx_thangtruoc" isMultiMode={true} />
                </div>
                <FileInput label="Thưởng nóng tháng trước" icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey="saved_thuongnong_thangtruoc" />
            </div> 
            <div class="space-y-4"> 
                <div class="h-fit w-full" data-tour="input-ycx-nam-truoc">
                    <FileInput label="YCX Lũy kế năm trước" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx_cungkynam" isMultiMode={true} />
                </div>
                <PasteInput label="Thưởng ERP tháng trước" icon="clipboard" link="https://bi.thegioididong.com/reward?id=-1&tab=1" saveKeyPaste="saved_thuongerp_thangtruoc" />
           </div> 
       </div>
   </div>
</details>

<style>
    summary::-webkit-details-marker { display: none; }
</style>