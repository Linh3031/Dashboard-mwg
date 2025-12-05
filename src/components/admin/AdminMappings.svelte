<script>
    import { competitionNameMappings } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    import { ui } from '../../ui.js';

    let mappingSearch = '';
    let debounceTimer;
    
    // Lọc danh sách mapping theo tìm kiếm
    $: filteredMappings = Object.entries($competitionNameMappings).filter(([original, short]) => {
        return original.toLowerCase().includes(mappingSearch.toLowerCase()) || 
               (short && short.toLowerCase().includes(mappingSearch.toLowerCase()));
    });

    function handleMappingInput(originalName, event) {
        const newShortName = event.target.value;
        
        // 1. Cập nhật Store ngay lập tức để UI phản hồi nhanh
        competitionNameMappings.update(current => {
            return { ...current, [originalName]: newShortName };
        });

        // 2. Debounce: Đợi 1s sau khi ngừng gõ mới lưu xuống Cloud
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log("Auto-saving mappings to Firestore...");
            adminService.saveCompetitionNameMappings($competitionNameMappings);
            ui.showNotification('Đã tự động lưu tên rút gọn!', 'success');
        }, 1000);
    }
</script>

<details class="declaration-group"> 
    <summary>Khai báo Tên Rút Gọn (Thi Đua NV)</summary> 
    <div class="declaration-content"> 
        <p class="text-sm text-gray-600 mt-2 mb-4">Dữ liệu dán ở tab "Cập nhật dữ liệu" sẽ tự động trích xuất tên chương trình thi đua gốc vào đây. Hãy nhập "Tên Rút Gọn" để bảng biểu hiển thị gọn gàng hơn. Thay đổi sẽ được <strong>tự động lưu</strong>.</p>
        <input type="text" class="w-full p-2 border rounded-lg mb-4 text-sm" placeholder="Tìm kiếm tên thi đua..." bind:value={mappingSearch}>
        <div class="max-h-96 overflow-y-auto pr-2 border rounded-lg"> 
            {#if filteredMappings.length === 0}
                    <p class="text-gray-500 italic p-4 text-center">Chưa có dữ liệu hoặc không tìm thấy.</p>
            {:else}
                <table class="min-w-full text-sm table-bordered bg-white">
                    <thead class="text-xs text-slate-800 uppercase bg-slate-100 font-bold sticky top-0 z-10">
                        <tr>
                            <th class="px-2 py-2 text-center w-12">STT</th>
                            <th class="px-4 py-2 text-left w-1/2">Tên Gốc (Từ dữ liệu dán)</th>
                            <th class="px-4 py-2 text-left w-1/2">Tên Rút Gọn (Nhập để thay thế)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredMappings as [originalName, shortName], index}
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-2 py-2 text-center font-medium text-gray-700 align-top">{index + 1}</td>
                                <td class="px-4 py-2 text-gray-600 align-top text-xs">{originalName}</td>
                                <td class="px-4 py-2 align-top">
                                    <input 
                                        type="text" 
                                        class="w-full p-1 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" 
                                        value={shortName || ''} 
                                        placeholder="Nhập tên rút gọn..."
                                        on:input={(e) => handleMappingInput(originalName, e)}
                                    >
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div> 
    </div>
</details>