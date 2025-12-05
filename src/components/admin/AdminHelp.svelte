<script>
    import { afterUpdate } from 'svelte';
    import { helpContent } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let localHelpContent = { ...$helpContent };

    $: if ($helpContent) {
        if (!localHelpContent.data && $helpContent.data) localHelpContent = { ...$helpContent };
    }

    async function saveHelp() {
        await adminService.saveHelpContent(localHelpContent);
        helpContent.set({ ...localHelpContent });
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group"> 
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-green-50 rounded-lg text-green-600">
                    <i data-feather="book-open"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Nội dung Hướng dẫn</h3>
                    <p class="text-xs text-slate-500">Chỉnh sửa popup hướng dẫn (?) tại các tab</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary> 
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/50"> 
            <div class="grid grid-cols-1 gap-6"> 
                {#each [
                    { id: 'data', label: 'Tab Cập nhật dữ liệu' },
                    { id: 'luyke', label: 'Tab Lũy kế' },
                    { id: 'sknv', label: 'Tab Sức khỏe NV' },
                    { id: 'realtime', label: 'Tab Realtime' }
                ] as tab}
                    <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <label for="help-{tab.id}" class="block text-sm font-bold text-slate-700 mb-2">{tab.label}</label>
                        <textarea 
                            id="help-{tab.id}" 
                            rows="4" 
                            class="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-slate-600" 
                            bind:value={localHelpContent[tab.id]}
                            placeholder="Nhập nội dung hướng dẫn (hỗ trợ HTML cơ bản)..."
                        ></textarea>
                    </div>
                {/each}
            </div> 
            <div class="mt-6 flex justify-end pt-4 border-t border-slate-200">
                <button on:click={saveHelp} class="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-semibold shadow-sm flex items-center gap-2">
                    <i data-feather="save" class="w-4 h-4"></i>
                    Lưu Hướng Dẫn
                </button> 
            </div> 
        </div>
    </details>
</div>