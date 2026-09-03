<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    const dispatch = createEventDispatcher();

    export let sortedUsers = [];
    export let isLoading = false;
    export let sortKey = 'warehouses';
    export let sortDirection = 'asc';
    export let isEditMode = false;
    export let formEmail = '';
    
    // [PHẪU THUẬT LOGIC]: Bổ sung mảng lưu danh sách email được chọn (ràng buộc 2 chiều với Component cha)
    export let selectedEmails = []; 

    function handleSort(key) { dispatch('sort', key); }
    function handleEdit(user) { dispatch('edit', user); }
    function handleDelete(email) { dispatch('delete', email); }

    function formatDate(dateVal) {
        if (!dateVal) return '-';
        const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    // [PHẪU THUẬT LOGIC]: Xử lý check tất cả / bỏ check tất cả
    $: isAllSelected = sortedUsers.length > 0 && selectedEmails.length === sortedUsers.length;
    
    function toggleSelectAll() {
        if (isAllSelected) {
            selectedEmails = [];
        } else {
            selectedEmails = sortedUsers.map(u => u.email);
        }
    }

    afterUpdate(() => { if (typeof window.feather !== 'undefined') window.feather.replace(); });
</script>

<div class="p-0"> 
    <div class="overflow-x-auto max-h-[500px]"> 
        {#if isLoading}
            <div class="p-10 flex flex-col justify-center items-center text-slate-400 gap-3">
                <svg class="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        {:else if sortedUsers.length === 0}
            <div class="p-10 text-center text-slate-400 italic bg-slate-50/50">
                Chưa có dữ liệu hoặc không tìm thấy kết quả.
            </div>
        {:else}
            <table class="min-w-full text-sm border-collapse">
                <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm select-none">
                    <tr>
                        <!-- [NEW]: Cột Checkbox trên Header -->
                        <th class="px-4 py-3 w-10 text-center border-r border-slate-200">
                            <input 
                                type="checkbox" 
                                class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                checked={isAllSelected}
                                on:change={toggleSelectAll}
                            >
                        </th>
                        
                        <th class="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-slate-200 transition bg-blue-50/50" on:click={() => handleSort('warehouses')}>
                            <div class="flex items-center gap-1 text-blue-700 whitespace-nowrap">
                                <i data-feather="database" class="w-3 h-3"></i> Mã Kho 
                                <i data-feather={sortKey === 'warehouses' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i>
                            </div>
                        </th>
                        <th class="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-slate-200 transition" on:click={() => handleSort('email')}>
                            <div class="flex items-center gap-1 whitespace-nowrap">Email User <i data-feather={sortKey === 'email' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                        </th>
                        <th class="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-slate-200 transition" on:click={() => handleSort('role')}>
                            <div class="flex items-center justify-center gap-1 whitespace-nowrap">Quyền <i data-feather={sortKey === 'role' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                        </th>
                        <th class="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-slate-200 transition" on:click={() => handleSort('expireAt')}>
                            <div class="flex items-center justify-end gap-1 text-indigo-600 whitespace-nowrap">Hết Hạn <i data-feather={sortKey === 'expireAt' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-indigo-400"></i></div>
                        </th>
                        <th class="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-slate-200 transition hidden lg:table-cell" on:click={() => handleSort('loginCount')}>
                            <div class="flex items-center justify-end gap-1 whitespace-nowrap">Truy cập <i data-feather={sortKey === 'loginCount' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                        </th>
                        <th class="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-slate-200 transition hidden xl:table-cell" on:click={() => handleSort('lastLogin')}>
                            <div class="flex items-center justify-end gap-1 whitespace-nowrap">Lần cuối <i data-feather={sortKey === 'lastLogin' ? (sortDirection === 'asc' ? 'chevron-up' : 'chevron-down') : 'minus'} class="w-3 h-3 text-slate-400"></i></div>
                        </th>
                        <th class="px-4 py-3 text-center font-semibold border-l border-slate-200 whitespace-nowrap">
                            Hành động
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    {#each sortedUsers as user (user.email)}
                        <!-- Nổi bật dòng nếu đang được check -->
                        <tr class="hover:bg-blue-50/50 transition-colors group/row {selectedEmails.includes(user.email) ? 'bg-blue-50/80' : ''} {isEditMode && formEmail === user.email ? 'bg-orange-50/50' : ''}">
                            <!-- [NEW]: Checkbox của từng dòng -->
                            <td class="px-4 py-3 text-center border-r border-slate-50">
                                <input 
                                    type="checkbox" 
                                    value={user.email}
                                    bind:group={selectedEmails}
                                    class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                >
                            </td>

                            <td class="px-4 py-3 font-bold text-blue-600 max-w-[200px] flex-wrap break-words cursor-pointer" on:click={() => { if(!selectedEmails.includes(user.email)) selectedEmails = [...selectedEmails, user.email]; else selectedEmails = selectedEmails.filter(e => e !== user.email); }}>
                                {#if user.allowedWarehouses && user.allowedWarehouses.length > 0}
                                    <div class="flex flex-wrap gap-1">
                                        {#each user.allowedWarehouses as wh}
                                            <span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[11px] shadow-sm border border-blue-200 pointer-events-none">{wh}</span>
                                        {/each}
                                    </div>
                                {:else}
                                    <span class="text-slate-400 font-normal italic text-xs pointer-events-none">Chưa cấp kho</span>
                                {/if}
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
                                <div class="flex items-center justify-center gap-2 opacity-30 group-hover/row:opacity-100 transition-opacity">
                                    <button 
                                        class="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors"
                                        title="Sửa quyền"
                                        on:click={() => handleEdit(user)}
                                    >
                                        <i data-feather="edit-2" class="w-4 h-4"></i>
                                    </button>
                                    <button 
                                        class="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                                        title="Tước quyền truy cập (Xóa)"
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
        {/if}
    </div> 
</div>