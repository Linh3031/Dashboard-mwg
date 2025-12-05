<script>
    import { onMount, afterUpdate } from 'svelte';
    import { userStats } from '../../stores.js';
    import { analyticsService } from '../../services/analytics.service.js';

    let userList = [];
    let sortKey = 'lastLogin';
    let sortDirection = 'desc';
    let isLoading = false;

    onMount(async () => {
        isLoading = true;
        try {
            userList = await analyticsService.getAllUsers();
            userStats.set(userList);
        } catch (error) { console.error(error); } 
        finally { isLoading = false; }
    });

    function sortUsers(key) {
        if (sortKey === key) { sortDirection = sortDirection === 'desc' ? 'asc' : 'desc'; } 
        else { sortKey = key; sortDirection = 'desc'; }
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
        if (!dateVal) return '-';
        const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} ${date.getDate()}/${date.getMonth()+1}`;
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <div class="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-orange-50 rounded-lg text-orange-600">
                <i data-feather="users"></i>
            </div>
            <div>
                <h3 class="font-bold text-slate-700 text-lg">Thống kê Người dùng</h3>
                <p class="text-xs text-slate-500">Theo dõi truy cập và tần suất sử dụng hệ thống</p>
            </div>
        </div>
    </div>
    
    <div class="p-0"> 
        <div class="overflow-x-auto max-h-[500px]"> 
            {#if isLoading}
                <div class="p-10 flex flex-col justify-center items-center text-slate-400 gap-3">
                    <svg class="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span class="text-sm">Đang tải dữ liệu...</span>
                </div>
            {:else if userList.length === 0}
                <div class="p-10 text-center text-slate-400 italic bg-slate-50/50">
                    <i data-feather="user-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    Chưa có dữ liệu người dùng.
                </div>
            {:else}
                <table class="min-w-full text-sm border-collapse">
                    <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th class="px-6 py-3 text-left font-semibold cursor-pointer hover:bg-slate-100" on:click={() => sortUsers('email')}>Email</th>
                            <th class="px-6 py-3 text-right font-semibold cursor-pointer hover:bg-slate-100" on:click={() => sortUsers('loginCount')}>Truy cập</th>
                            <th class="px-6 py-3 text-right font-semibold cursor-pointer hover:bg-slate-100" on:click={() => sortUsers('actionsTaken')}>Thao tác</th>
                            <th class="px-6 py-3 text-right font-semibold cursor-pointer hover:bg-slate-100" on:click={() => sortUsers('lastLogin')}>Lần cuối</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        {#each sortedUsers as user}
                            <tr class="hover:bg-orange-50/30 transition-colors group/row">
                                <td class="px-6 py-3 font-medium text-slate-700 group-hover/row:text-orange-700">{user.email}</td>
                                <td class="px-6 py-3 text-right font-mono text-slate-600 bg-slate-50/50">{user.loginCount || 0}</td>
                                <td class="px-6 py-3 text-right font-mono text-slate-600">{user.actionsTaken || 0}</td>
                                <td class="px-6 py-3 text-right text-xs text-slate-400">{formatDate(user.lastLogin)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div> 
    </div>
</div>