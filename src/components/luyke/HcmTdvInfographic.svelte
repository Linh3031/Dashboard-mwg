<script>
    import { slide } from 'svelte/transition';
    import { fade } from 'svelte/transition';

    export let data = null; // { supermarketList: [], details: {} }

    let selectedSupermarket = '';
    let searchTerm = '';
    let isDropdownOpen = false;

    $: filteredSupermarkets = data?.supermarketList?.filter(st => 
        st.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    $: currentDetail = selectedSupermarket ? data?.details[selectedSupermarket] : null;

    function selectSupermarket(st) {
        selectedSupermarket = st;
        isDropdownOpen = false;
        searchTerm = '';
    }

    function formatCurrency(value) {
        if (!value || isNaN(value)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }
</script>

<div class="w-full h-full flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between z-20">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span class="text-blue-600">🏆</span> Kết Quả Thi Đua Vùng HCM
        </h2>
        
        <div class="relative w-72">
            <div 
                class="flex items-center justify-between w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:border-blue-500 transition-colors"
                on:click={() => isDropdownOpen = !isDropdownOpen}
                on:keydown={(e) => e.key === 'Enter' && (isDropdownOpen = !isDropdownOpen)}
                tabindex="0"
                role="button"
            >
                <span class="truncate font-medium {selectedSupermarket ? 'text-gray-900' : 'text-gray-400'}">
                    {selectedSupermarket || '-- Chọn Siêu Thị --'}
                </span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            {#if isDropdownOpen}
                <div class="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 flex flex-col z-50" transition:slide={{duration: 200}}>
                    <div class="p-2 border-b border-gray-100">
                        <input 
                            type="text" 
                            bind:value={searchTerm}
                            placeholder="Tìm siêu thị..." 
                            class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div class="overflow-y-auto flex-1 p-1">
                        {#each filteredSupermarkets as st}
                            <button 
                                class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 rounded transition-colors {selectedSupermarket === st ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'}"
                                on:click={() => selectSupermarket(st)}
                            >
                                {st}
                            </button>
                        {/each}
                        {#if filteredSupermarkets.length === 0}
                            <div class="px-3 py-4 text-sm text-center text-gray-500">Không tìm thấy siêu thị</div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
        {#if !data || !data.supermarketList || data.supermarketList.length === 0}
            <div class="h-full flex flex-col items-center justify-center text-gray-400" in:fade>
                <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p class="text-lg">Chưa có dữ liệu, vui lòng upload file excel HCM.</p>
            </div>
        {:else if currentDetail}
            <div class="max-w-5xl mx-auto space-y-6" in:fade>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
                        <div>
                            <p class="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">Tổng Thưởng</p>
                            <h3 class="text-3xl font-bold">{formatCurrency(currentDetail.tongThuong)}</h3>
                        </div>
                        <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
                        <div>
                            <p class="text-purple-100 text-sm font-medium uppercase tracking-wider mb-1">Số Giải Đạt Được</p>
                            <h3 class="text-3xl font-bold">{currentDetail.soGiai} <span class="text-lg font-normal opacity-80">Giải</span></h3>
                        </div>
                        <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                        <h3 class="font-bold text-gray-800">Chi Tiết Thưởng Ngành Hàng</h3>
                    </div>
                    
                    <div class="p-6">
                        {#if currentDetail.categories && currentDetail.categories.length > 0}
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {#each currentDetail.categories as cat}
                                    <div class="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex flex-col justify-between group">
                                        <div>
                                            <div class="flex justify-between items-start mb-2">
                                                <h4 class="font-semibold text-gray-800 line-clamp-2" title={cat.name}>{cat.name}</h4>
                                                {#if cat.loaiGiai}
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {cat.loaiGiai.toLowerCase().includes('target') ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}">
                                                        {cat.loaiGiai}
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                        <div class="mt-3 pt-3 border-t border-gray-50 flex justify-between items-end">
                                            <span class="text-xs text-gray-500">Mức thưởng:</span>
                                            <span class="font-bold text-green-600">{formatCurrency(cat.thuong)}</span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="text-center py-8 text-gray-500">Siêu thị chưa có dữ liệu thưởng chi tiết cho ngành hàng.</p>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <div class="h-full flex flex-col items-center justify-center text-gray-400" in:fade>
                <div class="w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                </div>
                <p class="text-lg text-gray-500">Hãy chọn một siêu thị từ menu để xem kết quả.</p>
            </div>
        {/if}
    </div>
</div>