<script>
    import { demoService } from '../../services/demo.service.js';
    import { notificationStore } from '../../stores.js';

    function handleExport() {
        if(confirm("Bạn muốn xuất toàn bộ dữ liệu hiện tại thành file Snapshot JSON?")) {
            const success = demoService.downloadSnapshot();
            if (success) {
                notificationStore.set({ 
                    message: 'Đã xuất file thành công! Hãy copy nội dung file này vào src/data/demoFixtures.js', 
                    type: 'success', 
                    visible: true 
                });
            }
        }
    }
</script>

<div class="p-4 border rounded-lg bg-gray-50 mt-4">
    <h3 class="font-bold text-gray-800 mb-2">🛠 Công cụ tạo dữ liệu Demo (Admin)</h3>
    <p class="text-sm text-gray-600 mb-3">
        Dùng chức năng này khi bạn đã có một bộ dữ liệu chuẩn trên màn hình. 
        Hệ thống sẽ "chụp" lại toàn bộ báo cáo để làm mẫu cho người dùng mới.
    </p>
    
    <button 
        on:click={handleExport}
        class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm font-medium"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Tải xuống Snapshot (.json)
    </button>
</div>