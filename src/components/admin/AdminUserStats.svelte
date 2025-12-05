<script>
    import { onMount } from 'svelte';
    import { userStats } from '../../stores.js';
    import { analyticsService } from '../../services/analytics.service.js';

    let userList = [];
    let sortKey = 'lastLogin';
    let sortDirection = 'desc';
    let isLoading = false;

    // Load danh sách khi component được mount (tức là khi người dùng mở tab Khai báo)
    onMount(async () => {
        if ($userStats.length === 0) {
            isLoading = true;
            const res = await analyticsService.getAllUsers();
            userStats.set(res);
            userList = res;
            isLoading = false;
        } else {
            userList = $userStats;
        }
    });

    function sortUsers(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDirection = 'desc';
        }
    }

    $: sortedUsers = [...userList].sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (sortKey === 'lastLogin') {
            valA = valA ? new Date(valA).getTime() : 0;
            valB = valB ? new Date(valB).getTime() : 0;
        } else if (sortKey === 'loginCount' || sortKey === 'actionsTaken') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
        } else {
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    function formatDate(dateVal) {
        if (!dateVal) return 'Chưa rõ';
        const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN')}`;
    }
</script>

<details class="declaration-group"> 
    <summary>Thống kê Người dùng</summary> 
    <div class="declaration-content !p-0"> 
        <div class="mt-4 overflow-x-auto max-h-[600px]"> 
            {#if isLoading}
                <p class="text-gray-500 p-4 text-center">Đang tải danh sách người dùng...</p>
            {:else if userList.length === 0}
                <p class="text-gray-500 p-4 text-center">Chưa có dữ liệu người dùng.</p>
            {:else}
                <table class="min-w-full text-sm table-bordered table-striped">
                    <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0">
                        <tr>
                            <th class="px-4 py-3 cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => sortUsers('email')}>
                                Email {sortKey === 'email' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th class="px-4 py-3 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => sortUsers('loginCount')}>
                                Lượt truy cập {sortKey === 'loginCount' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th class="px-4 py-3 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => sortUsers('actionsTaken')}>
                                Lượt sử dụng {sortKey === 'actionsTaken' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th class="px-4 py-3 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => sortUsers('lastLogin')}>
                                Lần cuối truy cập {sortKey === 'lastLogin' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each sortedUsers as user}
                            <tr class="hover:bg-gray-50">
                                <td class="px-4 py-2 font-medium text-gray-900">{user.email}</td>
                                <td class="px-4 py-2 text-right font-bold">{user.loginCount || 0}</td>
                                <td class="px-4 py-2 text-right font-bold">{user.actionsTaken || 0}</td>
                                <td class="px-4 py-2 text-right">{formatDate(user.lastLogin)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div> 
    </div> 
</details>