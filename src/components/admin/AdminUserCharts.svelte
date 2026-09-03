<script>
    export let userList = [];

    $: stats = userList.reduce((acc, user) => {
        // Đếm Tier
        const tier = user.tier || 'trial';
        acc.tiers[tier] = (acc.tiers[tier] || 0) + 1;
        
        // Đếm trạng thái hết hạn
        if (user.expireAt) {
            if (Date.now() > user.expireAt) acc.status.expired++;
            else acc.status.active++;
        } else {
            acc.status.lifetime++; // Không có hạn = Vĩnh viễn
        }
        return acc;
    }, { 
        // [PHẪU THUẬT LOGIC]: Bổ sung key cho 1_day và 3_days
        tiers: { '1_day': 0, '3_days': 0, 'trial': 0, '1_month': 0, '3_months': 0, '6_months': 0, '12_months': 0, 'lifetime': 0 },
        status: { active: 0, expired: 0, lifetime: 0 }
    });

    $: totalUsers = userList.length || 1; // Tránh chia cho 0
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <!-- Chart 1: Tỷ lệ Gói Cước -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h4 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <i data-feather="pie-chart" class="w-4 h-4 text-blue-500"></i> Phân bổ Gói Cước
        </h4>
        <div class="space-y-3">
            {#each [
                { id: '1_day', label: '1 Ngày (Test)', color: 'bg-orange-500' },
                { id: '3_days', label: '3 Ngày (Test)', color: 'bg-yellow-500' },
                { id: '1_month', label: 'Gói 1 Tháng', color: 'bg-blue-500' },
                { id: '3_months', label: 'Gói 3 Tháng', color: 'bg-indigo-500' },
                { id: '6_months', label: 'Gói 6 Tháng', color: 'bg-purple-500' },
                { id: '12_months', label: 'Gói 1 Năm', color: 'bg-pink-500' },
                { id: 'lifetime', label: 'Vĩnh viễn (Admin)', color: 'bg-slate-800' },
                { id: 'trial', label: 'Dùng thử / Khác', color: 'bg-slate-300' }
            ] as tier}
                {#if stats.tiers[tier.id] > 0}
                    <div class="flex items-center text-xs">
                        <span class="w-28 font-semibold text-slate-600">{tier.label}</span>
                        <div class="flex-grow bg-slate-100 rounded-full h-2.5 mx-2 overflow-hidden">
                            <div class="{tier.color} h-2.5 rounded-full transition-all duration-1000" style="width: {(stats.tiers[tier.id] / totalUsers) * 100}%"></div>
                        </div>
                        <span class="w-8 text-right font-bold text-slate-700">{stats.tiers[tier.id]}</span>
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    <!-- Chart 2: Trạng thái Hoạt động -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h4 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <i data-feather="activity" class="w-4 h-4 text-emerald-500"></i> Trạng thái Hạn Sử Dụng
        </h4>
        <div class="flex h-4 rounded-full overflow-hidden mb-4 border border-slate-200">
            <div class="bg-emerald-500 h-full" style="width: {(stats.status.active / totalUsers) * 100}%"></div>
            <div class="bg-slate-700 h-full" style="width: {(stats.status.lifetime / totalUsers) * 100}%"></div>
            <div class="bg-red-500 h-full" style="width: {(stats.status.expired / totalUsers) * 100}%"></div>
        </div>
        <div class="flex justify-between text-xs font-semibold text-slate-600">
            <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-emerald-500"></div> Đang kích hoạt ({stats.status.active})</div>
            <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-slate-700"></div> Vĩnh viễn ({stats.status.lifetime})</div>
            <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-red-500"></div> Hết hạn ({stats.status.expired})</div>
        </div>
    </div>
</div>