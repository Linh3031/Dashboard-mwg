<script>
    import { realtimeYCXData } from '../../../stores.js';
    import AddressDashboard from '../../luyke/AddressDashboard.svelte';
</script>

<div class="animate-fade-in pb-10" data-capture-filename="DiaChiRealtime">
    <div class="flex items-center gap-4 pb-2 border-b border-gray-100 mb-4">
        <h2 class="text-xl font-bold text-blue-800">Thống kê địa chỉ khách hàng (Realtime)</h2>
    </div>
    
    <div class="w-full">
        <AddressDashboard ycxData={$realtimeYCXData || []} />
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>