<script>
    import { onMount } from 'svelte';
    import { adminService } from '../../services/admin.service.js';
    
    let programs = [];
    
    onMount(async () => {
        programs = await adminService.loadGlobalSpecialPrograms();
    });
</script>

<div class="bg-white p-6 rounded-lg border border-slate-200 text-center">
    <p class="text-slate-500 mb-4">Danh sách chương trình độc quyền (Global).</p>
    <div class="p-4 bg-slate-50 rounded border border-slate-200 inline-block text-left w-full">
        <pre class="text-xs overflow-auto max-h-60">{JSON.stringify(programs, null, 2)}</pre>
    </div>
    <div class="mt-4">
        <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-bold cursor-not-allowed">Chỉnh sửa (Sắp ra mắt)</button>
    </div>
</div>