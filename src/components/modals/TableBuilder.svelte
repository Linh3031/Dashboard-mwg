<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let tableName = '';
    // [Surgical Insert]: Bổ sung showSL: false cho Cột Tổng (mainColumn)
    export let mainColumn = { id: 'mainValue', header: 'Tổng cộng', show: false, items: [], type: 'DT', metrics: { sl: false, dt: true, dtqd: false }, showSL: false };
    export let subColumns = [];
    
    export let activeContext = 'main'; 
    export let activeSubIndex = 0;

    function addSubColumn() {
        subColumns = [...subColumns, {
            id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            header: `Cột ${subColumns.length + 1}`,
            color: '#3b82f6',
            type: 'DT',
            items: [],
            numerator: [],
            denominator: [],
            percentMetric: 'DT',
            target: 0,
            showSL: false // Mặc định ẩn cột SL
        }];
        setContext('sub_items', subColumns.length - 1);
    }

    function removeSubColumn(index) {
        subColumns = subColumns.filter((_, i) => i !== index);
        if (activeContext.startsWith('sub') && activeSubIndex === index) {
            setContext(mainColumn.show ? 'main' : 'sub_items', 0);
        } else if (activeContext.startsWith('sub') && activeSubIndex > index) {
            activeSubIndex--;
        }
    }

    function setContext(ctx, index = 0) {
        activeContext = ctx;
        activeSubIndex = index;
        dispatch('contextChange', { ctx, index });
    }
</script>

<div class="flex flex-col gap-3">
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tên bảng hiển thị</label>
        <input 
            type="text" bind:value={tableName} placeholder="VD: Bảng Hiệu quả..." 
            class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-blue-900 bg-blue-50/30"
        />
    </div>

    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div class="bg-orange-50 px-3 py-2 border-b border-orange-100 flex items-center gap-2 cursor-pointer" on:click={() => mainColumn.show = !mainColumn.show}>
            <input type="checkbox" bind:checked={mainColumn.show} class="w-4 h-4 accent-orange-600 rounded cursor-pointer" on:click|stopPropagation />
            <span class="text-xs font-bold text-orange-800 uppercase">Cột Tổng Gộp</span>
        </div>

        {#if mainColumn.show}
            <div 
                class="p-3 cursor-pointer transition-all border-l-4 {activeContext === 'main' ? 'bg-orange-50/50 border-orange-500' : 'bg-white border-transparent hover:bg-gray-50'}"
                on:click={() => setContext('main')}
            >
                <div class="flex items-center gap-1.5 mb-1">
                    <span class="font-bold text-sm text-gray-800 truncate">{mainColumn.header}</span>
                    {#if mainColumn.showSL}<span class="px-1.5 py-0.5 text-[8px] bg-orange-200 text-orange-800 font-bold rounded uppercase ml-1">Kép</span>{/if}
                </div>
                <div class="text-[10px] text-gray-500 mt-1">{mainColumn.items?.length || 0} mục đã chọn</div>
            </div>
        {/if}
    </div>

    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
        <div class="bg-gray-100 px-3 py-2 text-gray-700 font-bold text-xs uppercase border-b border-gray-200">
            Các cột phân tích
        </div>
        
        <div class="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-2 custom-scrollbar">
            {#each subColumns as col, i}
                <div 
                    class="p-2.5 rounded-lg cursor-pointer transition-all border-2 group flex justify-between items-center
                    {activeContext.startsWith('sub') && activeSubIndex === i ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 bg-white hover:border-blue-300'}"
                    on:click={() => { if(col.type !== 'PERCENT') setContext('sub_items', i); else setContext('sub_num', i); }}
                >
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="flex items-center gap-1.5 mb-1">
                            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: {col.color || '#3b82f6'}"></span>
                            <span class="font-bold text-sm text-gray-800 truncate">{col.header || `Cột ${i+1}`}</span>
                            {#if col.showSL}<span class="px-1.5 py-0.5 text-[8px] bg-gray-200 text-gray-600 font-bold rounded uppercase ml-1">Kép</span>{/if}
                        </div>
                        <div class="text-[10px] text-gray-500 font-medium">
                            {col.type === 'PERCENT' ? 'Tỷ lệ %' : (col.type === 'SL' ? 'Số lượng' : (col.type === 'DTQD' ? 'DTQĐ' : 'Doanh thu'))}
                        </div>
                    </div>
                    
                    <button 
                        on:click|stopPropagation={() => removeSubColumn(i)} 
                        class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0" 
                        title="Xóa cột"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            {/each}
        </div>
        
        <div class="p-2 border-t border-gray-100">
            <button on:click={addSubColumn} class="w-full py-2 bg-gray-50 hover:bg-blue-50 text-blue-600 border border-dashed border-blue-200 hover:border-blue-400 rounded-lg font-bold text-xs transition-colors">
                + Thêm Cột
            </button>
        </div>
    </div>
</div>