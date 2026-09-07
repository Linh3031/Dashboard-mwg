<script>
    import { onMount } from 'svelte';
    import { quantityCompetitionTypeCodes } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let codesText = '';
    let isLoading = false;
    let isSaving = false;

    onMount(async () => {
        isLoading = true;
        try {
            const codes = await adminService.loadQuantityCompetitionTypeCodes();
            quantityCompetitionTypeCodes.set(codes);
            codesText = codes.join(', ');
        } catch (e) {
            console.error(e);
        } finally {
            isLoading = false;
        }
    });

    async function saveCodes() {
        const codes = codesText
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n));

        isSaving = true;
        try {
            await adminService.saveQuantityCompetitionTypeCodes(codes);
            quantityCompetitionTypeCodes.set(codes);
        } catch (e) {
            alert('Lỗi khi lưu: ' + e.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h3 class="font-bold text-slate-700 text-lg mb-1">Khai báo Loại TĐ tính theo Số Lượng</h3>
    <p class="text-xs text-slate-500 mb-4">
        Nhập các mã "Loại TĐ" (cột LOẠI TĐ trong file thi đua) tính theo Số Lượng, cách nhau bởi dấu phẩy.
        Mã nào không có trong danh sách này sẽ mặc định tính theo Doanh Thu.
    </p>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
            type="text"
            class="w-full sm:w-64 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            placeholder="VD: 2, 6"
            bind:value={codesText}
            disabled={isLoading}
        />
        <button
            class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold text-sm shadow-sm disabled:opacity-50"
            on:click={saveCodes}
            disabled={isSaving || isLoading}
        >
            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
    </div>
</div>
