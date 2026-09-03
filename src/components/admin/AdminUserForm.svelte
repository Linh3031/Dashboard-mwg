<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let isEditMode = false;
    export let isCreating = false;
    export let formMessage = { text: '', type: '' };

    export let formEmail = '';
    export let formRole = 'user';
    export let formWarehouses = '';
    export let formSubscription = '1_month';
    export let formUserRows = [{ email: '', password: '', role: 'user' }];

    function handleSave() { dispatch('save'); }
    function handleCancel() { dispatch('cancel'); }

    function addRow() {
        formUserRows = [...formUserRows, { email: '', password: '', role: 'user' }];
    }

    function removeRow(index) {
        formUserRows = formUserRows.filter((_, i) => i !== index);
    }
</script>

<div id="user-form-section" class="p-6 bg-slate-50 border-b border-slate-200 animate-slide-down">
    <div class="max-w-4xl mx-auto">
        <h4 class="text-sm font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
            {#if isEditMode}
                <i data-feather="edit-2" class="w-4 h-4 text-orange-500"></i> CẬP NHẬT TÀI KHOẢN & MÃ KHO
            {:else}
                <i data-feather="plus-circle" class="w-4 h-4 text-blue-500"></i> CẤP QUYỀN THEO MÃ KHO
            {/if}
        </h4>

        {#if formMessage.text}
            <div class="mb-4 p-3 rounded-lg text-sm font-semibold border {formMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : formMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}">
                {formMessage.text}
            </div>
        {/if}

        {#if isEditMode}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div class="lg:col-span-1">
                    <label class="block text-xs font-bold text-slate-600 mb-1">Email <span class="text-red-500">*</span></label>
                    <input type="email" bind:value={formEmail} disabled class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-200 cursor-not-allowed text-slate-500">
                    <span class="text-[10px] text-orange-500 font-bold mt-1 block">Không thể đổi email sau khi tạo</span>
                </div>

                <div class="lg:col-span-1">
                    <label class="block text-xs font-bold text-slate-600 mb-1">Quyền hạn (Role)</label>
                    <select bind:value={formRole} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                        <option value="user">Nhân viên (User)</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                </div>

                <div class="lg:col-span-1">
                    <label class="block text-xs font-bold text-slate-600 mb-1">Thời gian (Gói) <span class="text-red-500">*</span></label>
                    <select bind:value={formSubscription} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-indigo-700">
                        <option value="1_day">1 Ngày (Test)</option>
                        <option value="3_days">3 Ngày (Test)</option>
                        <option value="1_month">1 Tháng</option>
                        <option value="3_months">3 Tháng</option>
                        <option value="6_months">6 Tháng</option>
                        <option value="12_months">1 Năm</option>
                        <option value="lifetime">Vĩnh viễn (Không hết hạn)</option>
                    </select>
                </div>

                <div class="lg:col-span-2">
                    <label class="block text-xs font-bold text-slate-600 mb-1 flex justify-between">
                        <span>Mã Kho quản lý <span class="text-red-500">*</span></span>
                        <span class="text-blue-500 font-normal">Ngăn cách nhau bởi dấu phẩy</span>
                    </label>
                    <input type="text" bind:value={formWarehouses} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white border-blue-200 focus:border-blue-500" placeholder="VD: 908, 123, 456">
                </div>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Mã Kho <span class="text-red-500">*</span></label>
                    <input type="text" bind:value={formWarehouses} class="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-blue-700" placeholder="VD: 908">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Thời gian sử dụng <span class="text-red-500">*</span></label>
                    <select bind:value={formSubscription} class="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-indigo-700">
                        <option value="1_day">1 Ngày (Test)</option>
                        <option value="3_days">3 Ngày (Test)</option>
                        <option value="1_month">1 Tháng</option>
                        <option value="3_months">3 Tháng</option>
                        <option value="6_months">6 Tháng</option>
                        <option value="12_months">1 Năm</option>
                        <option value="lifetime">Vĩnh viễn (Không hết hạn)</option>
                    </select>
                </div>
                <p class="md:col-span-2 text-[11px] text-blue-600">Toàn bộ user thêm bên dưới sẽ dùng chung mã kho và thời hạn này.</p>
            </div>

            <div class="space-y-3">
                {#each formUserRows as row, i (i)}
                    <div class="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_auto] gap-3 items-start">
                        <div>
                            {#if i === 0}<label class="block text-xs font-bold text-slate-600 mb-1">Email <span class="text-red-500">*</span></label>{/if}
                            <input type="email" bind:value={row.email} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder="email@vidu.com">
                        </div>
                        <div>
                            {#if i === 0}<label class="block text-xs font-bold text-slate-600 mb-1">Mật khẩu <span class="text-red-500">*</span></label>{/if}
                            <input type="text" bind:value={row.password} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder="Tối thiểu 6 ký tự">
                        </div>
                        <div>
                            {#if i === 0}<label class="block text-xs font-bold text-slate-600 mb-1">Quyền</label>{/if}
                            <select bind:value={row.role} class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div class={i === 0 ? 'pt-6' : ''}>
                            <button
                                type="button"
                                on:click={() => removeRow(i)}
                                disabled={formUserRows.length === 1}
                                class="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Xóa dòng này"
                            >
                                <i data-feather="x" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                {/each}
            </div>

            <button type="button" on:click={addRow} class="mt-3 px-3 py-1.5 border border-dashed border-blue-300 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 transition-colors">
                <i data-feather="plus" class="w-3.5 h-3.5"></i> Thêm user
            </button>
        {/if}

        <div class="mt-5 flex justify-end gap-3">
            {#if isEditMode}
                <button on:click={handleCancel} class="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-300 transition-colors">
                    Hủy sửa
                </button>
            {/if}
            <button on:click={handleSave} disabled={isCreating} class="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 transition-colors">
                {#if isCreating}
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Đang xử lý...</span>
                {:else}
                    <i data-feather="save" class="w-4 h-4"></i>
                    <span>{isEditMode ? 'Lưu Cập Nhật Quyền' : `Tạo ${formUserRows.length > 1 ? formUserRows.length + ' Tài Khoản' : 'Tài Khoản'}`}</span>
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: top; }
    @keyframes slideDown { from { opacity: 0; transform: scaleY(0.9); } to { opacity: 1; transform: scaleY(1); } }
</style>
