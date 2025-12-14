<script>
    import { onMount } from 'svelte';
    import { warehouseList, luykeGoalSettings } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';

    let selectedKho = '';
    let currentGoals = {};
    let isLoading = false;

    // Khi chọn kho, load dữ liệu mục tiêu của kho đó
    async function handleWarehouseChange() {
        if (!selectedKho) {
            currentGoals = {};
            return;
        }
        isLoading = true;
        try {
            const settings = await datasyncService.loadGoalSettings(selectedKho);
            currentGoals = settings.luyke || {};
        } catch (error) {
            console.error(error);
        } finally {
            isLoading = false;
        }
    }

    async function saveGoals() {
        if (!selectedKho) return alert("Vui lòng chọn Kho.");
        isLoading = true;
        try {
            await datasyncService.saveGoalSettings(selectedKho, 'luyke', currentGoals);
            alert(`Đã lưu mục tiêu cho kho ${selectedKho} thành công!`);
        } catch (error) {
            alert("Lỗi khi lưu: " + error.message);
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
    <div class="mb-6">
        <label class="block text-sm font-bold text-slate-700 mb-2">Chọn Kho thiết lập:</label>
        <select 
            bind:value={selectedKho} 
            on:change={handleWarehouseChange}
            class="w-full md:w-1/3 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
            <option value="">-- Chọn kho --</option>
            {#each $warehouseList as kho}
                <option value={kho}>{kho}</option>
            {/each}
        </select>
    </div>

    {#if selectedKho}
        <div class="space-y-4">
            <div class="p-4 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
                <i data-feather="info" class="w-4 h-4 inline mr-1"></i>
                Hệ thống đang cập nhật giao diện thiết lập mục tiêu chi tiết. Hiện tại vui lòng sử dụng file Excel hoặc chức năng import.
            </div>
            
            <div class="border-t pt-4">
                <h4 class="font-bold text-gray-700 mb-2">Cấu hình JSON (Nâng cao)</h4>
                <textarea 
                    class="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm"
                    value={JSON.stringify(currentGoals, null, 2)}
                    on:input={(e) => {
                        try { currentGoals = JSON.parse(e.target.value); } catch(err){}
                    }}
                ></textarea>
            </div>

            <button 
                on:click={saveGoals} 
                disabled={isLoading}
                class="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition disabled:opacity-50"
            >
                {isLoading ? 'Đang lưu...' : 'Lưu Cấu Hình'}
            </button>
        </div>
    {/if}
</div>