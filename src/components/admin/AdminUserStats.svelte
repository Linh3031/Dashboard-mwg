<script>
    import { onMount, tick } from 'svelte';
    import { get } from 'svelte/store';

    // [PHẪU THUẬT LOGIC]: Import thêm currentUser và userProfile
    import { userStats, firebaseStore, currentUser, userProfile } from '../../stores.js';

    import { analyticsService } from '../../services/analytics.service.js';
    import { adminAuthService, computeExpireAt } from '../../services/adminAuth.service.js';
    import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

    import AdminUserCharts from './AdminUserCharts.svelte';
    import AdminUserForm from './AdminUserForm.svelte';
    import AdminUserTable from './AdminUserTable.svelte';
    import AdminUserExcelImport from './AdminUserExcelImport.svelte';

    const NO_WAREHOUSE = '__NONE__';

    let userList = [];
    let sortKey = 'warehouses';
    let sortDirection = 'asc';
    let isLoading = false;
    let searchQuery = '';
    let selectedEmails = [];

    let showCreateForm = false;
    let showExcelImport = false;
    let isEditMode = false;
    let isCreating = false;
    let isImportingExcel = false;

    let formEmail = '';
    let formRole = 'user';
    let formWarehouses = '';
    let formSubscription = '1_month';
    let formUserRows = [{ email: '', password: '', role: 'user' }];
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
            formEmail = ''; formWarehouses = ''; formSubscription = '1_month'; formRole = 'user';
            formUserRows = [{ email: '', password: '', role: 'user' }];
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

    // Mở form tạo mới với mã kho đã điền sẵn, dùng cho nút "Thêm user vào kho" trong 1 nhóm
    function handleAddToWarehouse(event) {
        const code = event.detail;
        isEditMode = false;
        formEmail = ''; formRole = 'user';
        formWarehouses = code;
        formSubscription = '1_month';
        formUserRows = [{ email: '', password: '', role: 'user' }];
        formMessage = { text: '', type: '' };
        showCreateForm = true;

        setTimeout(() => {
            document.getElementById('user-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    async function handleSaveUser() {
        if (isEditMode) {
            await saveEditedUser();
        } else {
            await saveNewUsersBatch();
        }
    }

    async function saveEditedUser() {
        if (!formEmail) {
            formMessage = { text: 'Vui lòng nhập Email!', type: 'error' };
            return;
        }

        isCreating = true;
        formMessage = { text: 'Đang xử lý dữ liệu...', type: 'info' };

        try {
            const cleanEmail = String(formEmail || '').trim().toLowerCase();
            const whArray = formWarehouses.split(',').map(w => String(w).trim()).filter(w => w);
            const expireAt = computeExpireAt(formSubscription);

            const db = get(firebaseStore).db;
            if (!db) throw new Error("Chưa kết nối CSDL");

            const updatePayload = {
                role: formRole,
                allowedWarehouses: whArray,
                tier: formSubscription,
                expireAt: expireAt ? expireAt.getTime() : null
            };

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
            setTimeout(() => { toggleForm(); }, 1500);

        } catch (error) {
            formMessage = { text: `❌ ${error.message}`, type: 'error' };
        } finally {
            isCreating = false;
        }
    }

    async function saveNewUsersBatch() {
        const whArray = formWarehouses.split(',').map(w => String(w).trim()).filter(w => w);
        if (whArray.length === 0) {
            formMessage = { text: 'Vui lòng nhập Mã kho!', type: 'error' };
            return;
        }

        const rows = formUserRows.filter(r => String(r.email || '').trim() !== '');
        if (rows.length === 0) {
            formMessage = { text: 'Vui lòng nhập ít nhất 1 email!', type: 'error' };
            return;
        }
        for (const row of rows) {
            if (!row.password) {
                formMessage = { text: `Vui lòng nhập mật khẩu cho ${row.email}!`, type: 'error' };
                return;
            }
        }

        isCreating = true;
        formMessage = { text: 'Đang tạo tài khoản...', type: 'info' };

        const expireAt = computeExpireAt(formSubscription);
        const succeeded = [];
        const failed = [];

        for (const row of rows) {
            const cleanEmail = String(row.email).trim().toLowerCase();
            try {
                await adminAuthService.createSecondaryUser(cleanEmail, row.password, row.role, whArray, formSubscription);
                succeeded.push(cleanEmail);
                userList = [{
                    email: cleanEmail,
                    role: row.role,
                    allowedWarehouses: whArray,
                    tier: formSubscription,
                    expireAt: expireAt ? expireAt.getTime() : null,
                    loginCount: 0
                }, ...userList];
            } catch (error) {
                failed.push({ row, message: error.message });
            }
        }
        userStats.set(userList);

        if (failed.length === 0) {
            formMessage = { text: `✅ Đã tạo thành công ${succeeded.length} tài khoản cho mã kho ${whArray.join(', ')}`, type: 'success' };
            formUserRows = [{ email: '', password: '', role: 'user' }];
        } else if (succeeded.length === 0) {
            formMessage = { text: `❌ Không tạo được tài khoản nào: ${failed.map(f => `${f.row.email} (${f.message})`).join('; ')}`, type: 'error' };
            formUserRows = rows;
        } else {
            formMessage = { text: `⚠️ Đã tạo ${succeeded.length}/${rows.length} tài khoản. Lỗi: ${failed.map(f => `${f.row.email} (${f.message})`).join('; ')}`, type: 'error' };
            formUserRows = failed.map(f => f.row);
        }

        isCreating = false;
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

    // Gỡ 1 user khỏi 1 mã kho cụ thể (không xóa tài khoản nếu họ còn thuộc kho khác)
    async function handleRemoveFromWarehouse(event) {
        const { email, code } = event.detail;
        if (!confirm(`Gỡ user [${email}] khỏi mã kho [${code}]?`)) return;

        isLoading = true;
        try {
            const db = get(firebaseStore).db;
            const user = userList.find(u => u.email === email);
            const newWh = (user?.allowedWarehouses || []).filter(w => w !== code);

            await updateDoc(doc(db, "users", email), { allowedWarehouses: newWh });

            const idx = userList.findIndex(u => u.email === email);
            if (idx !== -1) {
                userList[idx] = { ...userList[idx], allowedWarehouses: newWh };
                userList = [...userList];
                userStats.set(userList);
            }

            const curUser = get(currentUser);
            if (curUser && (curUser.email || '').toLowerCase() === email) {
                userProfile.update(prof => ({ ...prof, allowedWarehouses: newWh }));
            }
        } catch (error) {
            alert("Lỗi khi gỡ user khỏi kho: " + error.message);
        } finally {
            isLoading = false;
        }
    }

    // Sửa hạn dùng (gói) cho toàn bộ user đang thuộc 1 mã kho
    async function handleBulkEditExpiry(event) {
        const { code, tier } = event.detail;
        const members = userList.filter(u => (u.allowedWarehouses || []).includes(code));
        if (members.length === 0) return;
        if (!confirm(`Cập nhật gói cho toàn bộ ${members.length} user thuộc mã kho [${code}]?`)) return;

        isLoading = true;
        try {
            const db = get(firebaseStore).db;
            const expireAt = computeExpireAt(tier);
            const updatePayload = { tier, expireAt: expireAt ? expireAt.getTime() : null };

            await Promise.all(members.map(u => updateDoc(doc(db, "users", u.email), updatePayload)));

            const memberEmails = new Set(members.map(m => m.email));
            userList = userList.map(u => memberEmails.has(u.email) ? { ...u, ...updatePayload } : u);
            userStats.set(userList);

            // Nếu người đang thao tác cũng nằm trong nhóm vừa sửa, đồng bộ lại Session cá nhân (Sidebar)
            const curUser = get(currentUser);
            if (curUser && memberEmails.has((curUser.email || '').toLowerCase())) {
                userProfile.update(prof => ({ ...prof, ...updatePayload }));
            }
        } catch (error) {
            alert("Lỗi khi cập nhật hạn cho cả kho: " + error.message);
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

    function toggleExcelImport() {
        showExcelImport = !showExcelImport;
    }

    // Nhận danh sách dòng hợp lệ đã được AdminUserExcelImport parse + validate sẵn
    // (mỗi dòng: {email, allowedWarehouses, tier, role}), gọi service tạo mới/cập nhật hàng loạt.
    async function handleImportExcelRows(event) {
        const rows = event.detail;
        if (!rows || rows.length === 0) return;

        isImportingExcel = true;
        try {
            const result = await adminAuthService.upsertUsersFromRows(rows);
            await loadUsers();

            const parts = [];
            if (result.created.length > 0) parts.push(`Tạo mới ${result.created.length}`);
            if (result.updated.length > 0) parts.push(`Cập nhật ${result.updated.length}`);
            if (result.failed.length > 0) parts.push(`Lỗi ${result.failed.length}: ${result.failed.map(f => `${f.email} (${f.message})`).join('; ')}`);

            alert(parts.length > 0 ? parts.join(' | ') : 'Không có dòng nào được xử lý.');

            if (result.failed.length === 0) {
                showExcelImport = false;
            }
        } catch (error) {
            alert('Lỗi khi import Excel: ' + error.message);
        } finally {
            isImportingExcel = false;
        }
    }

    async function handleSort(event) {
        const key = event.detail;
        if (sortKey === key) { sortDirection = sortDirection === 'desc' ? 'asc' : 'desc'; }
        else { sortKey = key; sortDirection = 'desc'; }
        await tick();
    }

    function sortUsers(list) {
        return [...list].sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (sortKey === 'lastLogin' || sortKey === 'expireAt') {
                valA = valA ? (valA.toDate ? valA.toDate().getTime() : new Date(valA).getTime()) : 0;
                valB = valB ? (valB.toDate ? valB.toDate().getTime() : new Date(valB).getTime()) : 0;
            } else if (sortKey === 'loginCount' || sortKey === 'actionsTaken') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else if (sortKey === 'warehouses') {
                valA = (a.email || '').toLowerCase();
                valB = (b.email || '').toLowerCase();
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    $: filteredUsers = userList.filter(user => {
        if (!searchQuery) return true;
        const q = String(searchQuery).trim().toLowerCase();
        const emailMatch = (user.email || '').toLowerCase().includes(q);
        const roleMatch = (user.role || '').toLowerCase().includes(q);
        const whMatch = (user.allowedWarehouses || []).join(',').toLowerCase().includes(q);
        return emailMatch || roleMatch || whMatch;
    });

    // Gom user theo từng mã kho (1 user thuộc nhiều kho sẽ xuất hiện ở nhiều nhóm)
    $: warehouseGroups = (() => {
        const map = new Map();
        filteredUsers.forEach(user => {
            const codes = (user.allowedWarehouses && user.allowedWarehouses.length > 0) ? user.allowedWarehouses : [NO_WAREHOUSE];
            codes.forEach(code => {
                if (!map.has(code)) map.set(code, []);
                map.get(code).push(user);
            });
        });

        const groups = Array.from(map.entries()).map(([code, users]) => {
            const tiers = new Set(users.map(u => u.tier || 'trial'));
            const expireAts = new Set(users.map(u => u.expireAt || null));
            return {
                code,
                isUnassigned: code === NO_WAREHOUSE,
                users: sortUsers(users),
                count: users.length,
                sameTier: tiers.size === 1 ? users[0].tier || null : null,
                sameExpireAt: expireAts.size === 1 ? (users[0].expireAt || null) : null
            };
        });

        groups.sort((a, b) => {
            if (a.isUnassigned) return 1;
            if (b.isUnassigned) return -1;
            return String(a.code).localeCompare(String(b.code), 'vi', { numeric: true });
        });

        return groups;
    })();
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

            <button on:click={toggleExcelImport} class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all whitespace-nowrap">
                <i data-feather="upload" class="w-4 h-4"></i>
                <span>Nhập từ Excel</span>
            </button>

            <button on:click={toggleForm} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-all whitespace-nowrap">
                <i data-feather={showCreateForm ? "x-circle" : "user-plus"} class="w-4 h-4"></i>
                <span>{showCreateForm ? "Đóng Form" : "Tạo Mới User"}</span>
            </button>
        </div>
    </div>

    {#if showExcelImport}
        <AdminUserExcelImport
            bind:isImporting={isImportingExcel}
            on:import={handleImportExcelRows}
            on:cancel={toggleExcelImport}
        />
    {/if}

    {#if showCreateForm}
        <AdminUserForm
            bind:isEditMode
            bind:isCreating
            bind:formMessage
            bind:formEmail
            bind:formRole
            bind:formWarehouses
            bind:formSubscription
            bind:formUserRows
            on:save={handleSaveUser}
            on:cancel={toggleForm}
        />
    {/if}

    <AdminUserTable
        {warehouseGroups}
        {isLoading}
        {sortKey}
        {sortDirection}
        {isEditMode}
        {formEmail}
        hasActiveSearch={searchQuery.trim().length > 0}
        bind:selectedEmails
        on:sort={handleSort}
        on:edit={handleOpenEdit}
        on:delete={handleDeleteUser}
        on:addToWarehouse={handleAddToWarehouse}
        on:removeFromWarehouse={handleRemoveFromWarehouse}
        on:bulkEditExpiry={handleBulkEditExpiry}
    />
</div>

<style>
    .animate-slide-in { animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
