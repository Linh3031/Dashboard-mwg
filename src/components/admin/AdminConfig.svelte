<script>
    import { onMount } from 'svelte';
    import { declarations } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let config = {
        ycx: '',
        ycxGop: '',
        heSo: ''
    };

    onMount(async () => {
        const data = await adminService.loadDeclarationsFromFirestore();
        config.ycx = data.hinhThucXuat || '';
        config.ycxGop = data.hinhThucXuatGop || '';
        config.heSo = data.heSoQuyDoi || '';
    });

    async function handleSave() {
        await adminService.saveDeclarationsToFirestore(config);
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <h4 class="font-bold text-slate-800 mb-2">Hình thức xuất (YCX)</h4>
        <textarea bind:value={config.ycx} class="w-full h-32 p-2 border rounded text-sm" placeholder="Nhập các hình thức xuất, cách nhau dấu phẩy..."></textarea>
    </div>

    <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <h4 class="font-bold text-slate-800 mb-2">Hình thức xuất gộp (YCX Gộp)</h4>
        <textarea bind:value={config.ycxGop} class="w-full h-32 p-2 border rounded text-sm" placeholder="Nhập các hình thức gộp..."></textarea>
    </div>

    <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm md:col-span-2">
        <h4 class="font-bold text-slate-800 mb-2">Hệ số quy đổi</h4>
        <textarea bind:value={config.heSo} class="w-full h-32 p-2 border rounded text-sm font-mono" placeholder="JSON hệ số quy đổi..."></textarea>
    </div>

    <div class="md:col-span-2 flex justify-end">
        <button on:click={handleSave} class="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Lưu Cấu Hình</button>
    </div>
</div>