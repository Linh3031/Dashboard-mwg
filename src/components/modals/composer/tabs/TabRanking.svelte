<script>
    import { createEventDispatcher } from 'svelte';
    import { danhSachNhanVien } from '../../../../stores.js'; // Store ở cấp cao nhất

    const dispatch = createEventDispatcher();

    let rankingDept = 'ALL';
    
    // Logic lấy danh sách bộ phận duy nhất từ store
    $: uniqueDepartments = [...new Set($danhSachNhanVien.map(nv => nv.boPhan).filter(Boolean))].sort();

    function sendTag(tagTemplate) {
        // Xử lý thay thế {dept} ngay tại đây trước khi gửi lên cha
        const finalTag = tagTemplate.replace('{dept}', rankingDept);
        dispatch('insert', finalTag);
    }
</script>

<div class="space-y-4">
    <div>
        <label for="composer-dept" class="text-xs font-bold text-gray-500 uppercase mb-1 block">Lọc Bộ phận:</label>
        <select id="composer-dept" class="w-full p-2 text-sm border rounded bg-white" bind:value={rankingDept}>
                <option value="ALL">Toàn siêu thị</option>
            {#each uniqueDepartments as dept}
                <option value={dept}>{dept}</option>
            {/each}
        </select>
    </div>
    
    <div>
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Xếp hạng (Top/Bot 3)</h5>
        <div class="grid grid-cols-2 gap-2">
            <button class="tag-btn" on:click={() => sendTag('[TOP3_DTQD_{dept}@msnv]')}>Top 3 DTQĐ</button>
            <button class="tag-btn" on:click={() => sendTag('[BOT3_DTQD_{dept}@msnv]')}>Bot 3 DTQĐ</button>
            <button class="tag-btn" on:click={() => sendTag('[TOP3_THUNHAP_{dept}@msnv]')}>Top 3 Thu nhập</button>
            <button class="tag-btn" on:click={() => sendTag('[BOT3_THUNHAP_{dept}@msnv]')}>Bot 3 Thu nhập</button>
            <button class="tag-btn" on:click={() => sendTag('[TOP3_TLQD_{dept}@msnv]')}>Top 3 %QĐ</button>
            <button class="tag-btn" on:click={() => sendTag('[BOT3_TLQD_{dept}@msnv]')}>Bot 3 %QĐ</button>
        </div>
    </div>

    <div>
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Dưới Mục tiêu (List)</h5>
        <div class="flex flex-wrap gap-2">
            <button class="tag-btn" on:click={() => sendTag('[BOT_TARGET_TLQD_{dept}@msnv]')}>% Quy đổi</button>
            <button class="tag-btn" on:click={() => sendTag('[BOT_TARGET_TLTC_{dept}@msnv]')}>% Trả chậm</button>
            <button class="tag-btn" on:click={() => sendTag('[BOT_TARGET_PK_{dept}@msnv]')}>% Phụ kiện</button>
            <button class="tag-btn" on:click={() => sendTag('[BOT_TARGET_GD_{dept}@msnv]')}>% Gia dụng</button>
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