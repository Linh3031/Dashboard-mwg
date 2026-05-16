<script>
    import { onMount, onDestroy } from 'svelte';
    import { notificationStore } from '../../stores.js';

    let isCollecting = false;
    let collectedTags = [];
    let isExpanded = false;
    let isCopied = false; // Biến kích hoạt hiệu ứng chữ nổi

    $: if (isExpanded && typeof window !== 'undefined' && window.feather) {
        setTimeout(() => window.feather.replace(), 0);
    }

    function notify(msg, type = 'info') {
        if (typeof notificationStore.show === 'function') {
            notificationStore.show(msg, type);
        } else {
            notificationStore.set({ message: msg, type: type, visible: true });
            setTimeout(() => {
                notificationStore.update(s => ({ ...s, visible: false }));
            }, 3000);
        }
    }

    function toggleMode() {
        isExpanded = !isExpanded;
        isCollecting = isExpanded;
        
        if (isCollecting) {
            document.body.style.cursor = 'crosshair';
            notify('Chế độ thu thập: Đã BẬT. Hãy click vào MSNV trên bảng.', 'success');
        } else {
            document.body.style.cursor = 'default';
            notify('Chế độ thu thập: Đã TẮT.', 'info');
        }
    }

    function handleGlobalClick(e) {
        if (!isCollecting) return;
        if (e.target.closest('#fast-tag-picker')) return;

        e.preventDefault();
        e.stopPropagation();

        const text = e.target.textContent;
        if (!text) return;

        const match = text.match(/\b(\d{4,6})\b/);
        if (match) {
            const msnv = match[1];
            const tag = `@${msnv}`;
            if (!collectedTags.includes(tag)) {
                collectedTags = [...collectedTags, tag];
            }
        }
    }

    function removeTag(tagToRemove) {
        collectedTags = collectedTags.filter(t => t !== tagToRemove);
    }

    function copyTags() {
        if (collectedTags.length === 0) return;
        
        // [PHẪU THUẬT]: Thay đổi khoảng trắng thành '\n' để danh sách tự xuống dòng theo hàng dọc
        const textToCopy = collectedTags.join('\n');
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Kích hoạt hiệu ứng Tooltip nổi lên
            isCopied = true;
            setTimeout(() => { if (window.feather) window.feather.replace(); }, 0);
            
            // Tự động tắt hiệu ứng sau 1.5 giây
            setTimeout(() => {
                isCopied = false;
                setTimeout(() => { if (window.feather) window.feather.replace(); }, 0);
            }, 1500);
        }).catch(err => {
            console.error("Lỗi Copy Clipboard:", err);
            notify('Trình duyệt từ chối quyền Copy.', 'error');
        });
    }

    onMount(() => {
        if (typeof window !== 'undefined') window.addEventListener('click', handleGlobalClick, true);
    });

    onDestroy(() => {
        if (typeof window !== 'undefined') window.removeEventListener('click', handleGlobalClick, true);
        if (typeof document !== 'undefined') document.body.style.cursor = 'default';
    });
</script>

<div id="fast-tag-picker" class="fixed bottom-24 right-6 z-[9999] flex flex-col items-end gap-3">
    
    {#if isExpanded}
        <div class="bg-white rounded-xl shadow-2xl border border-indigo-200 w-64 overflow-hidden flex flex-col animate-fade-in-up">
            <div class="bg-indigo-600 text-white px-3 py-2 text-sm font-bold flex justify-between items-center shadow-sm">
                <span class="flex items-center gap-1.5">
                    <i data-feather="shopping-cart" class="w-4 h-4"></i> Giỏ hàng Tag
                </span>
                <span class="bg-white text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full">{collectedTags.length}</span>
            </div>
            
            <div class="p-3 bg-slate-50 min-h-[80px] max-h-[200px] overflow-y-auto custom-scrollbar">
                {#if collectedTags.length === 0}
                    <span class="text-xs text-gray-500 italic block text-center mt-2">Đang chờ... Click vào bảng để hút MSNV.</span>
                {:else}
                    <div class="flex flex-wrap gap-1.5">
                        {#each collectedTags as tag}
                            <button 
                                on:click|preventDefault|stopPropagation={() => removeTag(tag)}
                                class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors border border-indigo-200"
                                title="Click để xóa"
                            >
                                {tag} <i data-feather="x" class="w-3 h-3"></i>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="p-2 border-t border-gray-200 flex gap-2 bg-white relative">
                <button on:click|preventDefault|stopPropagation={() => collectedTags = []} class="flex-1 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                    Xóa hết
                </button>
                
                <div class="flex-1 relative flex">
                    {#if isCopied}
                        <div class="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 animate-float-up">
                            Đã copy!
                            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                        </div>
                    {/if}

                    <button 
                        on:click|preventDefault|stopPropagation={copyTags} 
                        class="w-full py-1.5 text-xs font-bold text-white rounded-md flex justify-center items-center gap-1 shadow-sm transition-all duration-300 {isCopied ? 'bg-indigo-600' : 'bg-green-600 hover:bg-green-700'}"
                    >
                        <i data-feather={isCopied ? "check" : "copy"} class="w-3.5 h-3.5"></i> 
                        Copy
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <button 
        on:click|preventDefault|stopPropagation={toggleMode}
        class="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 border-2 
        {isCollecting ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse' : 'bg-white text-indigo-600 border-transparent hover:border-indigo-100'}"
        title="Công cụ Hái Tag"
    >
        <i data-feather="crosshair" class="w-6 h-6"></i>
        {#if collectedTags.length > 0 && !isExpanded}
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
                {collectedTags.length}
            </span>
        {/if}
    </button>
</div>

<style>
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { animation: fadeInUp 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
    
    @keyframes floatUp {
        0% { opacity: 0; transform: translate(-50%, 10px) scale(0.8); }
        40% { opacity: 1; transform: translate(-50%, -2px) scale(1.1); }
        100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    .animate-float-up { animation: floatUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
</style>