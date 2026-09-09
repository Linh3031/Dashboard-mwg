<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    const dispatch = createEventDispatcher();

    export let warehouseGroups = [];
    export let isLoading = false;
    export let sortKey = 'warehouses';
    export let sortDirection = 'asc';
    export let isEditMode = false;
    export let formEmail = '';
    export let hasActiveSearch = false;

    // [PHẪU THUẬT LOGIC]: Bổ sung mảng lưu danh sách email được chọn (ràng buộc 2 chiều với Component cha)
    export let selectedEmails = [];

    let expandedCodes = new Set();
    let bulkEditingCode = null;
    let bulkTierValue = '1_month';

    const TIER_LABELS = {
        '1_day': '1 Ngày', '3_days': '3 Ngày', '1_month': '1 Tháng', '3_months': '3 Tháng',
        '6_months': '6 Tháng', '12_months': '1 Năm', 'lifetime': 'Vĩnh viễn', 'trial': 'Dùng thử'
    };
    function tierLabel(tier) { return TIER_LABELS[tier] || tier || '-'; }

    // Khi đang lọc theo search, tự mở hết các nhóm khớp kết quả để khỏi phải bấm từng cái
    $: if (hasActiveSearch) {
        expandedCodes = new Set(warehouseGroups.map(g => g.code));
    }

    function toggleGroup(code) {
        const next = new Set(expandedCodes);
        if (next.has(code)) next.delete(code); else next.add(code);
        expandedCodes = next;
    }

    function handleSort(key) { dispatch('sort', key); }
    function handleEdit(user) { dispatch('edit', user); }
    function handleDelete(email) { dispatch('delete', email); }

    function startBulkEdit(group) {
        bulkEditingCode = group.code;
        bulkTierValue = group.sameTier || '1_month';
    }
    function cancelBulkEdit() { bulkEditingCode = null; }
    function confirmBulkEdit(code) {
        dispatch('bulkEditExpiry', { code, tier: bulkTierValue });
        bulkEditingCode = null;
    }

    function formatDate(dateVal) {
        if (!dateVal) return '-';
        const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    // [PHẪU THUẬT LOGIC]: Xử lý check tất cả / bỏ check tất cả (tính trên toàn bộ user duy nhất đang hiển thị)
    $: allEmails = [...new Map(warehouseGroups.flatMap(g => g.users).map(u => [u.email, u])).keys()];
    $: isAllSelected = allEmails.length > 0 && selectedEmails.length === allEmails.length;

    function toggleSelectAll() {
        selectedEmails = isAllSelected ? [] : allEmails;
    }

    afterUpdate(() => { if (typeof window.feather !== 'undefined') window.feather.replace(); });
</script>

<div class="p-0">
    {#if isLoading}
        <div class="p-10 flex flex-col justify-center items-center text-slate-400 gap-3">
            <svg class="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
    {:else if warehouseGroups.length === 0}
        <div class="p-10 text-center text-slate-400 italic bg-slate-50/50">
            Chưa có dữ liệu hoặc không tìm thấy kết quả.
        </div>
    {:else}
        <div class="px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-3">
            <input
                type="checkbox"
                class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                checked={isAllSelected}
                on:change={toggleSelectAll}
            >
            <span class="text-xs font-semibold text-slate-500">Chọn tất cả ({allEmails.length} user)</span>
        </div>

        <div class="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {#each warehouseGroups as group (group.code)}
                <div>
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 bg-slate-50/70 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                        role="button"
                        tabindex="0"
                        on:click={() => toggleGroup(group.code)}
                        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleGroup(group.code)}
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <i data-feather={expandedCodes.has(group.code) ? 'chevron-down' : 'chevron-right'} class="w-4 h-4 text-slate-400 flex-shrink-0"></i>
                            {#if group.isUnassigned}
                                <span class="text-slate-400 italic text-sm whitespace-nowrap">Chưa cấp kho</span>
                            {:else}
                                <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-sm font-bold border border-blue-200 whitespace-nowrap">{group.code}</span>
                            {/if}
                            <span class="text-xs text-slate-500 whitespace-nowrap">{group.count} user</span>
                            {#if group.sameTier}
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 whitespace-nowrap">{tierLabel(group.sameTier)}</span>
                            {:else if !group.isUnassigned}
                                <span class="text-[11px] text-slate-400 italic whitespace-nowrap">nhiều gói khác nhau</span>
                            {/if}
                        </div>

                        {#if !group.isUnassigned}
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div class="flex items-center gap-2 flex-shrink-0" on:click|stopPropagation role="none">
                                {#if bulkEditingCode === group.code}
                                    <select bind:value={bulkTierValue} class="p-1.5 border border-slate-300 rounded text-xs bg-white">
                                        <option value="1_day">1 Ngày</option>
                                        <option value="3_days">3 Ngày</option>
                                        <option value="1_month">1 Tháng</option>
                                        <option value="3_months">3 Tháng</option>
                                        <option value="6_months">6 Tháng</option>
                                        <option value="12_months">1 Năm</option>
                                        <option value="lifetime">Vĩnh viễn</option>
                                    </select>
                                    <button type="button" class="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700" on:click={() => confirmBulkEdit(group.code)}>Lưu</button>
                                    <button type="button" class="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300" on:click={cancelBulkEdit}>Hủy</button>
                                {:else}
                                    <button type="button" class="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-100 whitespace-nowrap" on:click={() => startBulkEdit(group)}>Sửa hạn cả kho</button>
                                    <button type="button" class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 whitespace-nowrap" on:click={() => dispatch('addToWarehouse', group.code)}>+ Thêm user</button>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    {#if expandedCodes.has(group.code)}
                        <div class="overflow-x-auto">
                            <table class="min-w-full text-sm border-collapse">
                                <thead class="text-xs text-slate-500 uppercase bg-white select-none">
                                    <tr>
                                        <th class="px-4 py-2 w-10"></th>
                                        <th class="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 transition" on:click={() => handleSort('email')}>
                                            <div class="flex items-center gap-1 whitespace-nowrap">Email User <i data-feather={sortKey === 'email' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                                        </th>
                                        <th class="px-4 py-2 text-center font-semibold cursor-pointer hover:bg-slate-100 transition" on:click={() => handleSort('role')}>
                                            <div class="flex items-center justify-center gap-1 whitespace-nowrap">Quyền <i data-feather={sortKey === 'role' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                                        </th>
                                        <th class="px-4 py-2 text-right font-semibold cursor-pointer hover:bg-slate-100 transition" on:click={() => handleSort('expireAt')}>
                                            <div class="flex items-center justify-end gap-1 text-indigo-600 whitespace-nowrap">Hết Hạn <i data-feather={sortKey === 'expireAt' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-indigo-400"></i></div>
                                        </th>
                                        <th class="px-4 py-2 text-right font-semibold cursor-pointer hover:bg-slate-100 transition hidden lg:table-cell" on:click={() => handleSort('loginCount')}>
                                            <div class="flex items-center justify-end gap-1 whitespace-nowrap">Truy cập <i data-feather={sortKey === 'loginCount' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                                        </th>
                                        <th class="px-4 py-2 text-right font-semibold cursor-pointer hover:bg-slate-100 transition hidden xl:table-cell" on:click={() => handleSort('lastLogin')}>
                                            <div class="flex items-center justify-end gap-1 whitespace-nowrap">Lần cuối <i data-feather={sortKey === 'lastLogin' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                                        </th>
                                        <th class="px-4 py-2 text-center font-semibold border-l border-slate-200 whitespace-nowrap">
                                            Hành động
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    {#each group.users as user (user.email)}
                                        <tr class="hover:bg-blue-50/50 transition-colors group/row {selectedEmails.includes(user.email) ? 'bg-blue-50/80' : ''} {isEditMode && formEmail === user.email ? 'bg-orange-50/50' : ''}">
                                            <td class="px-4 py-3 text-center border-r border-slate-50">
                                                <input
                                                    type="checkbox"
                                                    value={user.email}
                                                    bind:group={selectedEmails}
                                                    class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                                >
                                            </td>
                                            <td class="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{user.email}</td>
                                            <td class="px-4 py-3 text-center">
                                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                                                    {user.role || 'user'}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 text-right whitespace-nowrap">
                                                {#if user.expireAt}
                                                    <span class="text-[11px] font-bold px-2 py-0.5 rounded {Date.now() > (user.expireAt.toDate ? user.expireAt.toDate().getTime() : new Date(user.expireAt).getTime()) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">
                                                        {formatDate(user.expireAt)}
                                                    </span>
                                                {:else}
                                                    <span class="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Vĩnh viễn</span>
                                                {/if}
                                            </td>
                                            <td class="px-4 py-3 text-right font-mono text-slate-500 text-xs hidden lg:table-cell">{user.loginCount || 0}</td>
                                            <td class="px-4 py-3 text-right text-[11px] text-slate-400 hidden xl:table-cell whitespace-nowrap">{formatDate(user.lastLogin)}</td>
                                            <td class="px-4 py-3 text-center border-l border-slate-100">
                                                <div class="flex items-center justify-center gap-1.5 opacity-30 group-hover/row:opacity-100 transition-opacity">
                                                    <button
                                                        class="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors"
                                                        title="Sửa quyền / đổi mã kho"
                                                        on:click={() => handleEdit(user)}
                                                    >
                                                        <i data-feather="edit-2" class="w-4 h-4"></i>
                                                    </button>
                                                    {#if !group.isUnassigned}
                                                        <button
                                                            class="p-1.5 bg-orange-100 text-orange-600 rounded hover:bg-orange-500 hover:text-white transition-colors"
                                                            title="Gỡ khỏi mã kho {group.code}"
                                                            on:click={() => dispatch('removeFromWarehouse', { email: user.email, code: group.code })}
                                                        >
                                                            <i data-feather="log-out" class="w-4 h-4"></i>
                                                        </button>
                                                    {/if}
                                                    <button
                                                        class="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                                                        title="Tước toàn bộ quyền truy cập (Xóa tài khoản)"
                                                        on:click={() => handleDelete(user.email)}
                                                    >
                                                        <i data-feather="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>
