<script>
    import { helpContent } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    // Tạo bản sao cục bộ để bind vào textarea, tránh ghi trực tiếp vào store khi đang gõ
    let localHelpContent = { ...$helpContent };

    // Đồng bộ khi store thay đổi (ví dụ: khi vừa tải xong từ Firestore)
    $: if ($helpContent) {
        // Chỉ cập nhật các trường chưa được chỉnh sửa hoặc nếu local đang trống
        if (!localHelpContent.data && $helpContent.data) localHelpContent = { ...$helpContent }; 
    }

    async function saveHelp() {
        await adminService.saveHelpContent(localHelpContent);
        // Sau khi lưu thành công, cập nhật ngược lại vào store chính
        helpContent.set({ ...localHelpContent });
    }
</script>

<details class="declaration-group"> 
    <summary>Nội dung Hướng dẫn</summary> 
    <div class="declaration-content"> 
        <div class="grid md:grid-cols-1 gap-6 mt-4"> 
            <div>
                <label for="help-data" class="block text-md font-semibold text-gray-700 mb-2">Hướng dẫn Tab Cập nhật dữ liệu</label>
                <textarea id="help-data" rows="6" class="w-full p-2 border rounded-lg text-sm" bind:value={localHelpContent.data}></textarea>
            </div> 
            <div>
                <label for="help-luyke" class="block text-md font-semibold text-gray-700 mb-2">Hướng dẫn Tab Lũy kế</label>
                <textarea id="help-luyke" rows="6" class="w-full p-2 border rounded-lg text-sm" bind:value={localHelpContent.luyke}></textarea>
            </div> 
            <div>
                <label for="help-sknv" class="block text-md font-semibold text-gray-700 mb-2">Hướng dẫn Tab Sức khỏe NV</label>
                <textarea id="help-sknv" rows="6" class="w-full p-2 border rounded-lg text-sm" bind:value={localHelpContent.sknv}></textarea>
            </div> 
            <div>
                <label for="help-realtime" class="block text-md font-medium text-gray-700 mb-2">Hướng dẫn Tab Realtime</label>
                <textarea id="help-realtime" rows="6" class="w-full p-2 border rounded-lg text-sm" bind:value={localHelpContent.realtime}></textarea>
            </div>
        </div> 
        <div class="mt-4">
            <button on:click={saveHelp} class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition shadow-sm font-medium">
                Lưu Hướng dẫn
            </button>
        </div> 
    </div>
</details>