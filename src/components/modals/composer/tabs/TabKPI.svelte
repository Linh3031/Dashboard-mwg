<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    function sendTag(tag) {
        dispatch('insert', tag);
    }
</script>

<div class="space-y-4">
    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">KPIs Chính</h5>
    <div class="flex flex-col gap-2">
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[DT_THUC]')}>Doanh thu Thực</button>
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[DTQD]')}>Doanh thu Quy đổi</button>
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[%HT_DTT]')}>% HT DT Thực</button>
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[%HT_DTQD]')}>% HT DT QĐ</button>
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[TLQD]')}>Tỷ lệ Quy đổi</button>
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[DT_CHUAXUAT]')}>DT Chưa xuất</button>
        <button class="tag-btn w-full text-left" on:click={() => sendTag('[SS_CUNGKY]')}>So sánh Cùng kỳ</button>
    </div>
</div>

<style>
    .tag-btn {
        background-color: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;
        padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; transition: all 0.2s;
    }
    .tag-btn:hover { background-color: #e0e7ff; border-color: #818cf8; }
</style>