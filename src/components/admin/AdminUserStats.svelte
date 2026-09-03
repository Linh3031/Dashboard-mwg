<script>
    import { onMount, tick } from 'svelte';
    import { get } from 'svelte/store';
    
    // [PHẪU THUẬT LOGIC]: Import thêm currentUser và userProfile
    import { userStats, firebaseStore, currentUser, userProfile } from '../../stores.js'; 
    
    import { analyticsService } from '../../services/analytics.service.js';
    import { adminAuthService } from '../../services/adminAuth.service.js';
    import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
    
    import AdminUserCharts from './AdminUserCharts.svelte';
    import AdminUserForm from './AdminUserForm.svelte';
    import AdminUserTable from './AdminUserTable.svelte';

    let userList = [];
    let sortKey = 'warehouses'; 
    let sortDirection = 'asc';
    let isLoading = false;
    let searchQuery = ''; 
    let selectedEmails = []; 

    let showCreateForm = false;
    let isEditMode = false; 
    let isCreating = false;
    
    let formEmail = '';
    let formPassword = '';
    let formRole = 'user';
    let formWarehouses = '';
    let formSubscription = '1_month'; 
    let formMessage = { text: '', type: '' };

    onMount(async () => {
        await loadUsers();
    });

    async function loadUsers() {
        isLoading = true;
        try {
            const rawData = await analyticsService.getAllUsers();
            userList = rawData.filter(u => u && u.email && String(u.email).trim() !== '');
            userStats.set(userList);
        } catch (error) { console.error(error); } 
        finally { isLoading = false; }
    }

    function toggleForm() {
        if (showCreateForm) {
            showCreateForm = false;
            setTimeout(() => { isEditMode = false; }, 300);
        } else {
            isEditMode = false;
            formEmail = ''; formPassword = ''; formWarehouses = ''; formSubscription = '1_month'; formRole = 'user';
            formMessage = { text: '', type: '' };
            showCreateForm = true;
        }
    }

    function handleOpenEdit(event) {
        const user = event.detail;
        isEditMode = true;
        formEmail = user.email || '';
        formRole = user.role || 'user';
        formWarehouses = (user.allowedWarehouses || []).join(', ');
        formSubscription = user.tier || '1_month';
        formMessage = { text: '', type: '' };
        showCreateForm = true;
        
        setTimeout(() => {
            document.getElementById('user-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    async function handleSaveUser() {
        if (!formEmail) {
            formMessage = { text: 'Vui lòng nhập Email!', type: 'error' };
            return;
        }

        isCreating = true;
        formMessage = { text: 'Đang xử lý dữ liệu...', type: 'info' };

        try {
            const cleanEmail = String(formEmail || '').trim().toLowerCase();
            const whArray = formWarehouses.split(',').map(w => String(w).trim()).filter(w => w);

            let expireAt = null;
            const now = new Date();
            if (formSubscription === '1_day') expireAt = new Date(now.getTime() + 86400000); 
            else if (formSubscription === '3_days') expireAt = new Date(now.getTime() + 3 * 86400000); 
            else if (formSubscription === '1_month') expireAt = new Date(now.setMonth(now.getMonth() + 1));
            else if (formSubscription === '3_months') expireAt = new Date(now.setMonth(now.getMonth() + 3));
            else if (formSubscription === '6_months') expireAt = new Date(now.setMonth(now.getMonth() + 6));
            else if (formSubscription === '12_months') expireAt = new Date(now.setFullYear(now.getFullYear() + 1));

            if (isEditMode) {
                const db = get(firebaseStore).db;
                if (!db) throw new Error("Chưa kết nối CSDL");
                
                const updatePayload = {
                    role: formRole,
                    allowedWarehouses: whArray,
                    tier: formSubscription
                };
                
                if (expireAt) updatePayload.expireAt = expireAt.getTime();
                else if (formSubscription === 'lifetime') updatePayload.expireAt = null;

                await updateDoc(doc(db, "users", cleanEmail), updatePayload);
                
                const idx = userList.findIndex(u => (u.email || '').toLowerCase() === cleanEmail);
                if (idx !== -1) {
                    userList[idx] = { ...userList[idx], ...updatePayload };
                    userList = [...userList]; 
                    userStats.set(userList);
                }

                // [PHẪU THUẬT LOGIC]: Tự động cập nhật Session cá nhân (Sidebar) nếu Admin tự sửa chính mình
                const curUser = get(currentUser);
                if (curUser && (curUser.email || '').toLowerCase() === cleanEmail) {
                    userProfile.update(prof => ({ ...prof, ...updatePayload }));
                }

                formMessage = { text: `✅ Đã cập nhật quyền hạn cho tài khoản: ${formEmail}`, type: 'success' };
                
            } else {
                if (!formPassword) throw new Error("Vui lòng cấp mật khẩu cho User mới!");
                
                await adminAuthService.createSecondaryUser(cleanEmail, formPassword, formRole, whArray, formSubscription);
                
                const newUser = {
                    email: cleanEmail,
                    role: formRole,
                    allowedWarehouses: whArray,
                    tier: formSubscription,
                    expireAt: expireAt ? expireAt.getTime() : null,
                    loginCount: 0
                };
                userList = [newUser, ...userList];
                userStats.set(userList);

                formMessage = { text: `✅ Đã tạo thành công tài khoản: ${formEmail}`, type: 'success' };
            }
            
            if (!isEditMode) {
                formEmail = ''; formPassword = ''; formWarehouses = ''; 
            } else {
                setTimeout(() => { toggleForm(); }, 1500);
            }
            
        } catch (error) {
            formMessage = { text: `❌ ${error.message}`, type: 'error' };
        } finally {
            isCreating = false;
        }
    }

    async function handleDeleteUser(event) {
        const email = event.detail;
        if (!confirm(`CẢNH BÁO XÓA QUYỀN:\n\nBạn có chắc muốn tước quyền của user [${email}]?`)) return;
        
        isLoading = true;
        try {
            const db = get(firebaseStore).db;
            await deleteDoc(doc(db, "users", email));
            userList = userList.filter(u => u.email !== email);
            userStats.set(userList);
            selectedEmails = selectedEmails.filter(e => e !== email); 
        } catch (error) {
            alert("Lỗi khi xóa user: " + error.message);
        } finally {
            isLoading = false;
        }
    }

    async function handleBulkDelete() {
        if (!confirm(`CẢNH BÁO: BẠN ĐANG XÓA HÀNG LOẠT\n\nCó chắc muốn xóa ${selectedEmails.length} tài khoản đang được chọn? Thao tác không thể hoàn tác.`)) return;

        isLoading = true;
        try {
            const db = get(firebaseStore).db;
            const deletePromises = selectedEmails.map(email => deleteDoc(doc(db, "users", email)));
            await Promise.all(deletePromises);

            userList = userList.filter(u => !selectedEmails.includes(u.email));
            userStats.set(userList);
            selectedEmails = [];
            
            if (window.feather) setTimeout(() => window.feather.replace(), 50);
        } catch (error) {
            console.error(error);
            alert("Lỗi khi xóa hàng loạt: " + error.message);
        } finally {
            isLoading = false;
        }
    }

    async function handleSort(event) {
        const key = event.detail;
        if (sortKey === key) { sortDirection = sortDirection === 'desc' ? 'asc' : 'desc'; } 
        else { sortKey = key; sortDirection = 'desc'; }
        await tick();
    }

    $: filteredUsers = userList.filter(user => {
        if (!searchQuery) return true;
        const q = String(searchQuery).trim().toLowerCase();
        const emailMatch = (user.email || '').toLowerCase().includes(q);
        const roleMatch = (user.role || '').toLowerCase().includes(q);
        const whMatch = (user.allowedWarehouses || []).join(',').toLowerCase().includes(q);
        return emailMatch || roleMatch || whMatch;
    });

    $: sortedUsers = [...filteredUsers].sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        
        if (sortKey === 'lastLogin' || sortKey === 'expireAt') {
            valA = valA ? (valA.toDate ? valA.toDate().getTime() : new Date(valA).getTime()) : 0;
            valB = valB ? (valB.toDate ? valB.toDate().getTime() : new Date(valB).getTime()) : 0;
        } else if (sortKey === 'loginCount' || sortKey === 'actionsTaken') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
        } else if (sortKey === 'warehouses') {
            valA = (a.allowedWarehouses || []).join(', ');
            valB = (b.allowedWarehouses || []).join(', ');
        } else {
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
</script>

{#if userList.length > 0}
    <AdminUserCharts {userList} />
{/if}

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <div class="p-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-orange-50 rounded-lg text-orange-600">
                <i data-feather="users"></i>
            </div>
            <div>
                <h3 class="font-bold text-slate-700 text-lg">Quản lý Phân quyền Kho</h3>
                <p class="text-xs text-slate-500">Thêm, sửa, xóa người quản lý theo mã kho</p>
            </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div class="relative w-full sm:w-64">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i data-feather="search" class="w-4 h-4 text-slate-400"></i>
                </div>
                <input 
                    type="text" 
                    bind:value={searchQuery}
                    placeholder="Tìm mã kho, email, role..." 
                    class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
            </div>
            
            {#if selectedEmails.length > 0}
                <button on:click={handleBulkDelete} class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 flex items-center justify-center gap-2 transition-all whitespace-nowrap animate-slide-in">
                    <i data-feather="trash-2" class="w-4 h-4"></i>
                    <span>Xóa ({selectedEmails.length})</span>
                </button>
            {/if}

            <button on:click={toggleForm} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-all whitespace-nowrap">
                <i data-feather={showCreateForm ? "x-circle" : "user-plus"} class="w-4 h-4"></i>
                <span>{showCreateForm ? "Đóng Form" : "Tạo Mới User"}</span>
            </button>
        </div>
    </div>
    
    {#if showCreateForm}
        <AdminUserForm 
            bind:isEditMode
            bind:isCreating
            bind:formMessage
            bind:formEmail
            bind:formPassword
            bind:formRole
            bind:formWarehouses
            bind:formSubscription
            on:save={handleSaveUser}
            on:cancel={toggleForm}
        />
    {/if}
    
    <AdminUserTable 
        {sortedUsers}
        {isLoading}
        {sortKey}
        {sortDirection}
        {isEditMode}
        {formEmail}
        bind:selectedEmails
        on:sort={handleSort}
        on:edit={handleOpenEdit}
        on:delete={handleDeleteUser}
    />
</div>

<style>
    .animate-slide-in { animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>