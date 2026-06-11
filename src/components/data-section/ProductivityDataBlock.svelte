<script>
    import { warehouseList, selectedWarehouse } from '../../stores.js';
    import FileInput from '../common/FileInput.svelte';
    import PasteInput from '../common/PasteInput.svelte';
</script>

<details class="content-card data-card--green group !mb-2 !mt-2" data-tour="block-green"> 
    <summary class="content-card__header data-header--green flex items-center justify-between cursor-pointer list-none select-none !mb-0">
        <div class="flex items-center flex-wrap">
            <i data-feather="users" class="h-5 w-5 feather mr-2"></i>
            <span>CHI TIẾT NĂNG SUẤT NHÂN VIÊN</span>
            <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật khi cần theo dõi lương thưởng, năng suất)</span>
      
   </div>
        <i data-feather="chevron-down" class="feather transform transition-transform duration-200 group-open:rotate-180"></i>
    </summary>
   
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 border-t border-green-200/50 pt-4">
        <div class="flex flex-col gap-4 overflow-hidden">
            {#if $selectedWarehouse === 'ALL'}
                {#each $warehouseList.filter(k => k !== 'ALL') as kho}
                    <div class="h-fit w-full overflow-hidden">
                        <FileInput label={`Giờ công (${kho})`} icon="clock" link="https://reports.thegioididong.com/#/viewreport/168754" saveKey={`saved_giocong_${kho}`}/>
                    </div>
                {/each}
            {:else}
                <div class="h-fit w-full overflow-hidden">
                    <FileInput label={`Giờ công (${$selectedWarehouse})`} icon="clock" link="https://reports.thegioididong.com/#/viewreport/168754" saveKey={`saved_giocong_${$selectedWarehouse}`}/>
                </div>
            {/if}
        </div>

        <div class="flex flex-col gap-4 overflow-hidden">
            {#if $selectedWarehouse === 'ALL'}
                {#each $warehouseList.filter(k => k !== 'ALL') as kho}
                    <div class="h-fit w-full overflow-hidden">
                        <FileInput label={`Thưởng nóng (${kho})`} icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey={`saved_thuongnong_${kho}`}/>
                    </div>
                {/each}
            {:else}
                <div class="h-fit w-full overflow-hidden">
                    <FileInput label={`Thưởng nóng (${$selectedWarehouse})`} icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey={`saved_thuongnong_${$selectedWarehouse}`}/>
                </div>
            {/if}
        </div>

        <div class="flex flex-col gap-4 overflow-hidden">
            <div class="h-fit w-full overflow-hidden">
                <PasteInput label="Thưởng ERP" icon="clipboard" link="https://bi.thegioididong.com/reward?id=-1&tab=1" saveKeyPaste="daily_paste_thuongerp"/>
            </div>
        </div>
    </div>
</details>

<style>
    summary::-webkit-details-marker { display: none; }
</style>