<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    const ICON_SETS = {
        ranking: {
            title: '🏆 Xếp hạng (Top/Bot)',
            icons: ['🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '🔝', '🛐', '⬆️', '⬇️']
        },
        analysis: {
            title: '📊 Đánh giá/Phân tích',
            icons: ['📈', '📉', '📊', '📋', '📝', '🔍', '💡', '📌', '📍']
        },
        kpi: {
            title: '🎯 Mục tiêu (KPIs)',
            icons: ['🎯', '🚀', '⛳', '🏹', '🔥', '💣', '🚧', '🏁']
        },
        business: {
            title: '💰 Kinh doanh/Tiền tệ',
            icons: ['💰', '💵', '💸', '💳', '💎', '🏦', '🛍️', '🛒']
        },
        positive: {
            title: '✅ Tích cực (Tốt)',
            icons: ['✅', '🆗', '🙆‍♂️', '🆙', '⭐', '🌟', '✨', '💪', '👏']
        },
        negative: {
            title: '⚠️ Tiêu cực/Cảnh báo',
            icons: ['❌', '🚫', '⚠️', '🆘', '📉', '🔻', '🐢', '💤', '❄️', '🧱']
        }
    };

    function sendTag(tag) {
        dispatch('insert', tag);
    }
</script>

<div class="space-y-6">
    <div>
        <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Thời gian</h5>
        <div class="flex flex-wrap gap-2">
            <button class="tag-btn" on:click={() => sendTag('[NGAY]')}>Ngày</button>
            <button class="tag-btn" on:click={() => sendTag('[GIO]')}>Giờ</button>
        </div>
    </div>

    {#each Object.values(ICON_SETS) as set}
        <div>
            <h5 class="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-200 pb-1">{set.title}</h5>
            <div class="grid grid-cols-6 gap-2">
                {#each set.icons as icon}
                    <button class="icon-btn" on:click={() => sendTag(icon)}>{icon}</button>
                {/each}
            </div>
        </div>
    {/each}
</div>

<style>
    .tag-btn {
        background-color: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;
        padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; transition: all 0.2s;
    }
    .tag-btn:hover { background-color: #e0e7ff; border-color: #818cf8; }
    .icon-btn {
        background-color: white; border: 1px solid #e5e7eb; border-radius: 0.375rem;
        padding: 0.5rem; font-size: 1.25rem; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; cursor: pointer;
    }
    .icon-btn:hover { background-color: #f9fafb; border-color: #d1d5db; transform: scale(1.1); }
</style>