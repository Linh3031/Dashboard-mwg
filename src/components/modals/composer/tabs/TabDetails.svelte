<script>
    import { createEventDispatcher } from 'svelte';
    import { cleanCategoryName } from '../../../../utils.js';

    export let supermarketReport = {}; // Nhận dữ liệu từ cha

    const dispatch = createEventDispatcher();

    function sendTag(tag) {
        dispatch('insert', tag);
    }
</script>

<div class="space-y-4">
    <div>
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Thi đua (Lũy kế)</h5>
        <div class="grid grid-cols-2 gap-2">
            <button class="tag-btn" on:click={() => sendTag('[TD_TONG_CT]')}>Tổng CT</button>
            <button class="tag-btn" on:click={() => sendTag('[TD_CT_DAT]')}>Số đạt</button>
            <button class="tag-btn" on:click={() => sendTag('[TD_CT_CHUADAT]')}>Số chưa đạt</button>
            <button class="tag-btn" on:click={() => sendTag('[TD_TYLE_DAT]')}>% Đạt</button>
        </div>
    </div>

    <div>
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Nhóm QĐC (Có số)</h5>
        <button class="tag-btn w-full mb-2 text-indigo-700 bg-indigo-50" on:click={() => sendTag('[TOP_QDC_INFO]')}>
            Chèn Top QĐC (SL & TB/Ngày)
        </button>
        <div class="flex flex-wrap gap-2">
            {#if supermarketReport.qdc}
                {#each Object.values(supermarketReport.qdc).filter(i=>i.sl>0).sort((a,b)=>b.dtqd-a.dtqd) as item}
                    <button class="tag-btn text-xs" on:click={() => sendTag(`[QDC_INFO_${item.name}]`)}>{item.name}</button>
                {/each}
            {/if}
        </div>
    </div>

    <div>
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Ngành hàng (Có số)</h5>
        <button class="tag-btn w-full mb-2 text-indigo-700 bg-indigo-50" on:click={() => sendTag('[TOP_NGANHHANG_SL]')}>
            Chèn Top SL Ngành hàng
        </button>
        <div class="flex flex-wrap gap-2">
            {#if supermarketReport.nganhHangChiTiet}
                {#each Object.values(supermarketReport.nganhHangChiTiet).filter(i=>i.quantity>0).sort((a,b)=>b.revenue-a.revenue).slice(0, 10) as item}
                    <button class="tag-btn text-xs" on:click={() => sendTag(`[NH_INFO_${cleanCategoryName(item.name)}]`)}>{cleanCategoryName(item.name)}</button>
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    .tag-btn {
        background-color: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;
        padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; transition: all 0.2s;
    }
    .tag-btn:hover { background-color: #e0e7ff; border-color: #818cf8; }
</style>