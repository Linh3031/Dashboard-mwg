<script>
    import { createEventDispatcher } from 'svelte';
    import { danhSachNhanVien } from '../../../../stores.js'; 

    const dispatch = createEventDispatcher();
    let rankingDept = 'ALL';
    
    // Lấy danh sách bộ phận (đã được tối ưu để tránh loop)
    $: uniqueDepartments = $danhSachNhanVien ? [...new Set($danhSachNhanVien.map(nv => nv.boPhan).filter(Boolean))].sort() : [];

    function sendTag(tagTemplate) {
        const finalTag = tagTemplate.replace('{dept}', rankingDept);
        dispatch('insert', finalTag);
    }
</script>

<div class="space-y-5 px-1 pb-4">
    <div class="border-b border-gray-200 pb-3 sticky top-0 bg-white z-10 pt-1">
        <label for="composer-dept" class="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
            <i data-feather="filter" class="w-3 h-3"></i> Lọc Bộ phận:
        </label>
        <select id="composer-dept" class="w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" bind:value={rankingDept}>
                <option value="ALL">Toàn siêu thị</option>
            {#each uniqueDepartments as dept}
                <option value={dept}>{dept}</option>
            {/each}
        </select>
    </div>
    
    <div class="space-y-4">
        <div class="ranking-group">
            <h5 class="group-title text-indigo-700">1. Doanh Thu Quy Đổi</h5>
            <div class="grid grid-cols-4 gap-1.5">
                <button class="btn-top" on:click={() => sendTag('[TOP3_DTQD_{dept}@msnv]')}>Top 3</button>
                <button class="btn-top" on:click={() => sendTag('[TOP5_DTQD_{dept}@msnv]')}>Top 5</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT3_DTQD_{dept}@msnv]')}>Bot 3</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT5_DTQD_{dept}@msnv]')}>Bot 5</button>
            </div>
        </div>

        <div class="ranking-group">
            <h5 class="group-title text-emerald-700">2. Thu Nhập</h5>
            <div class="grid grid-cols-4 gap-1.5">
                <button class="btn-top" on:click={() => sendTag('[TOP3_THUNHAP_{dept}@msnv]')}>Top 3</button>
                <button class="btn-top" on:click={() => sendTag('[TOP5_THUNHAP_{dept}@msnv]')}>Top 5</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT3_THUNHAP_{dept}@msnv]')}>Bot 3</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT5_THUNHAP_{dept}@msnv]')}>Bot 5</button>
            </div>
        </div>

        <div class="ranking-group">
            <h5 class="group-title text-orange-700">3. Tỷ Lệ Quy Đổi</h5>
            <div class="grid grid-cols-4 gap-1.5">
                <button class="btn-top" on:click={() => sendTag('[TOP3_TLQD_{dept}@msnv]')}>Top 3</button>
                <button class="btn-top" on:click={() => sendTag('[TOP5_TLQD_{dept}@msnv]')}>Top 5</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT3_TLQD_{dept}@msnv]')}>Bot 3</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT5_TLQD_{dept}@msnv]')}>Bot 5</button>
            </div>
        </div>

        <div class="ranking-group">
            <h5 class="group-title text-rose-700">4. % Trả Chậm</h5>
            <div class="grid grid-cols-4 gap-1.5">
                <button class="btn-top" on:click={() => sendTag('[TOP3_TLTC_{dept}@msnv]')}>Top 3</button>
                <button class="btn-top" on:click={() => sendTag('[TOP5_TLTC_{dept}@msnv]')}>Top 5</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT3_TLTC_{dept}@msnv]')}>Bot 3</button>
                <button class="btn-bot" on:click={() => sendTag('[BOT5_TLTC_{dept}@msnv]')}>Bot 5</button>
            </div>
        </div>
    </div>

    <div class="pt-3 border-t border-gray-200 mt-2">
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <i data-feather="alert-circle" class="w-3 h-3"></i> Dưới Mục tiêu
        </h5>
        <div class="grid grid-cols-2 gap-2">
            <button class="btn-target" on:click={() => sendTag('[BOT_TARGET_TLQD_{dept}@msnv]', true)}>% Quy đổi</button>
            <button class="btn-target" on:click={() => sendTag('[BOT_TARGET_TLTC_{dept}@msnv]', true)}>% Trả chậm</button>
            <button class="btn-target" on:click={() => sendTag('[BOT_TARGET_PK_{dept}@msnv]', true)}>% Phụ kiện</button>
            <button class="btn-target" on:click={() => sendTag('[BOT_TARGET_GD_{dept}@msnv]', true)}>% Gia dụng</button>
        </div>
    </div>
</div>

<style>
    .group-title { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.35rem; letter-spacing: 0.02em; }
    
    .btn-top, .btn-bot {
        padding: 0.35rem 0; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 600;
        transition: all 0.15s ease-in-out; border: 1px solid transparent; text-align: center; white-space: nowrap;
    }
    
    /* Top: Indigo Theme */
    .btn-top { background-color: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .btn-top:hover { background-color: #c7d2fe; color: #312e81; transform: translateY(-1px); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    
    /* Bot: Rose Theme */
    .btn-bot { background-color: #ffe4e6; color: #be123c; border-color: #fecdd3; }
    .btn-bot:hover { background-color: #fecdd3; color: #881337; transform: translateY(-1px); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    .btn-target {
        background-color: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;
        padding: 0.3rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; transition: all 0.2s;
    }
    .btn-target:hover { background-color: #e5e7eb; border-color: #9ca3af; color: #1f2937; }
</style>