<script>
    import { createEventDispatcher, tick } from 'svelte';
    import { notificationStore } from '../../../stores.js';

    export let subTabs = []; // List subtabs config
    export let activeSubTabId = '';
    export let editorContent = '';
    export let saveStatus = '';

    // State nội bộ cho Preview
    let isPreviewMode = false;
    let previewContent = '';
    let textareaEl;

    const dispatch = createEventDispatcher();

    // Hàm public: Được gọi từ cha để chèn tag vào textarea
    export async function insertText(textToInsert) {
        if (!textareaEl) return;
        
        const start = textareaEl.selectionStart;
        const end = textareaEl.selectionEnd;
        const value = textareaEl.value;
        
        // Cập nhật nội dung thông qua binding 2 chiều lên cha
        editorContent = value.substring(0, start) + textToInsert + value.substring(end);
        
        // Focus lại và chỉnh con trỏ
        await tick();
        const newCursorPos = start + textToInsert.length;
        textareaEl.selectionStart = newCursorPos;
        textareaEl.selectionEnd = newCursorPos;
        textareaEl.focus();
    }

    function switchSubTab(id) {
        if (isPreviewMode) isPreviewMode = false;
        dispatch('changeSubTab', id);
    }

    function handleSave() {
        dispatch('save');
    }

    function handlePreview() {
        if (!editorContent.trim()) {
            notificationStore.show('Nội dung trống.', 'error');
            return;
        }
        // Gửi yêu cầu lên cha để xử lý text (biến tag thành số liệu)
        dispatch('requestPreview', {
            content: editorContent,
            callback: (processedText) => {
                previewContent = processedText;
                isPreviewMode = true;
                
                // Copy logic
                navigator.clipboard.writeText(processedText).then(() => {
                    // notificationStore.show('Đã sao chép nội dung!', 'success');
                }).catch(err => console.error(err));
            }
        });
    }

    function closePreview() {
        isPreviewMode = false;
    }
</script>

<div class="flex-1 flex flex-col border-r border-gray-200 p-4 relative h-full">
    
    <div class="flex space-x-2 overflow-x-auto mb-3 pb-2 border-b border-gray-100">
        {#each subTabs as tab}
            <button 
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap
                {activeSubTabId === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                on:click={() => switchSubTab(tab.id)}
            >
                {tab.label}
            </button>
        {/each}
    </div>

    <div class="flex-grow relative flex flex-col overflow-hidden">
        {#if isPreviewMode}
            <div class="flex-grow flex flex-col bg-slate-50 rounded-lg border border-gray-300 overflow-hidden animate-fade-in h-full">
                <div class="bg-green-100 text-green-800 px-4 py-2 text-xs font-bold flex justify-between items-center border-b border-green-200 shrink-0">
                    <span class="flex items-center gap-2">
                        <i data-feather="check-circle" class="w-4 h-4"></i>
                        Đã tự động sao chép vào bộ nhớ tạm!
                    </span>
                </div>
                <div class="p-4 overflow-y-auto custom-scrollbar font-mono text-sm whitespace-pre-wrap text-slate-700 flex-grow">
                    {previewContent}
                </div>
            </div>
        {:else}
            <textarea 
                bind:this={textareaEl}
                bind:value={editorContent}
                class="flex-grow w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-mono text-sm leading-relaxed h-full"
                placeholder="Soạn thảo nội dung tại đây... Sử dụng các thẻ bên phải để chèn dữ liệu tự động."
            ></textarea>
        {/if}
    </div>

    <div class="mt-4 flex justify-between items-center shrink-0">
        {#if isPreviewMode}
            <button on:click={closePreview} class="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 flex items-center gap-2 text-sm shadow-sm transition-all">
                <i data-feather="arrow-left" class="w-4 h-4"></i> Quay lại chỉnh sửa
            </button>
            <span class="text-xs text-green-600 italic font-medium">Nội dung đã được sao chép</span>
        {:else}
            <div class="flex items-center gap-3">
                <button on:click={handleSave} class="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 text-sm transition-all shadow-sm">
                    <i data-feather="save" class="w-4 h-4"></i> Lưu mẫu
                </button>
                {#if saveStatus}
                    <span class="text-xs text-gray-500 italic animate-fade-in">{saveStatus}</span>
                {/if}
            </div>
            
            <button on:click={handlePreview} class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md transition-all">
                <i data-feather="eye" class="w-4 h-4"></i> Xem trước & Sao chép
            </button>
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

    @keyframes fade-in {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
</style>