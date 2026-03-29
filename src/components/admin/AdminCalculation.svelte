<script>
    import { onMount } from 'svelte';
    import { declarations } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let ycxValue = '';
    let ycxGopValue = '';
    let isSaving = false;

    // --- LOGIC QUẢN LÝ HỆ SỐ QUY ĐỔI DẠNG BẢNG ---
    let heSoItems = []; 
    let filteredItems = [];
    let searchTerm = '';
    let sortKey = null; 
    let sortDirection = 'asc';

    const generateId = () => Math.random().toString(36).substr(2, 9);

    onMount(async () => {
        try {
            const data = await adminService.loadDeclarationsFromFirestore();
            if (data) {
                declarations.set(data);
                ycxValue = data.hinhThucXuat || data.ycx || '';
                ycxGopValue = data.hinhThucXuatGop || data.ycxGop || '';
                parseHeSoToItems(data.heSoQuyDoi || data.heSo || '');
            }
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
    });

    function parseHeSoToItems(rawString) {
        if (!rawString) {
            heSoItems = [];
            applyFilterAndSort();
            return;
        }
        heSoItems = rawString.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const lastComma = line.lastIndexOf(',');
                if (lastComma > -1) {
                    const valNum = parseFloat(line.substring(lastComma + 1).trim()) || 1;
                    return { 
                        id: generateId(), 
                        name: line.substring(0, lastComma).trim(), 
                        valueDisplay: valNum.toString().replace('.', ',') 
                    };
                }
                return { id: generateId(), name: line.trim(), valueDisplay: '1' };
            });
        applyFilterAndSort();
    }

    function applyFilterAndSort() {
        let temp = [...heSoItems];
        
        if (searchTerm) {
            temp = temp.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        if (sortKey) {
            temp.sort((a, b) => {
                if (!a.name && b.name) return -1;
                if (a.name && !b.name) return 1;

                if (sortKey === 'valueDisplay') {
                    let valA = parseFloat((a.valueDisplay || '0').toString().replace(',', '.')) || 0;
                    let valB = parseFloat((b.valueDisplay || '0').toString().replace(',', '.')) || 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                } else {
                    return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                }
            });
        }
        filteredItems = temp;
    }

    $: {
        searchTerm; sortKey; sortDirection; heSoItems;
        applyFilterAndSort();
    }

    function addItem() {
        heSoItems = [{ id: generateId(), name: '', valueDisplay: '1' }, ...heSoItems];
        searchTerm = ''; 
        sortKey = null; 
    }

    function removeItem(id) {
        heSoItems = heSoItems.filter(item => item.id !== id);
    }

    function handleSort(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey = key;
            sortDirection = 'asc';
        }
    }

    function handleValueInput(item, event) {
        let val = event.target.value;
        if (val.includes('.')) {
            alert("⚠️ Lỗi định dạng: Vui lòng sử dụng dấu phẩy (,) thay vì dấu chấm (.) cho số thập phân.\nVí dụ: 4,18");
            val = val.replace(/\./g, ',');
            event.target.value = val; 
        }
        item.valueDisplay = val; 
    }

    async function saveDeclarations() {
        isSaving = true;
        try {
            const heSoString = heSoItems
                .filter(item => item.name.trim())
                .map(item => {
                    let numStr = (item.valueDisplay || '1').toString().replace(',', '.');
                    if (isNaN(parseFloat(numStr))) numStr = '1';
                    return `${item.name.trim()},${numStr}`;
                })
                .join('\n');

            // [FIX CRITICAL] Đóng gói cả Key cũ và Key mới để vỗ về Firebase
            const payload = {
                // Key cũ cho admin.service.js không bị lỗi undefined
                ycx: ycxValue || '',
                ycxGop: ycxGopValue || '',
                heSo: heSoString || '',
                // Key mới cho các file Helpers hoạt động bình thường
                hinhThucXuat: ycxValue || '',
                hinhThucXuatGop: ycxGopValue || '',
                heSoQuyDoi: heSoString || ''
            };

            // Đẩy lên Firebase (Sẽ gọi hàm notify nội bộ của file admin.service.js)
            await adminService.saveDeclarationsToFirestore(payload);
            
            // Cập nhật cục bộ cho UI
            declarations.set(payload);
        } catch (error) {
            console.error("Lưu thất bại:", error);
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="space-y-6 max-w-6xl mx-auto p-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label class="block text-sm font-bold text-slate-700 mb-2">Hình thức xuất tính DT</label>
            <textarea bind:value={ycxValue} rows="4" class="w-full p-3 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cửa hàng bán, Xuất khuyến mãi..."></textarea>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label class="block text-sm font-bold text-slate-700 mb-2">Hình thức xuất Trả góp</label>
            <textarea bind:value={ycxGopValue} rows="4" class="w-full p-3 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Xuất bán trả góp..."></textarea>
        </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h3 class="font-bold text-slate-800">Hệ số quy đổi ngành hàng</h3>
                <p class="text-xs text-slate-500">Quản lý hệ số nhân cho từng nhóm sản phẩm</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 md:gap-3">
                <div class="relative flex-grow md:flex-grow-0">
                    <span class="absolute left-3 top-2.5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input 
                        type="text" 
                        bind:value={searchTerm} 
                        placeholder="Tìm nhóm hàng..." 
                        class="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-56"
                    />
                </div>
                
                <button on:click={addItem} class="bg-slate-200 text-slate-700 px-3 md:px-4 py-2 rounded-lg hover:bg-slate-300 flex items-center gap-2 font-bold transition shadow-sm whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                    <span class="hidden sm:inline">Thêm dòng</span>
                </button>
                
                <button on:click={saveDeclarations} disabled={isSaving} class="bg-green-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-green-700 font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50 whitespace-nowrap">
                    {#if isSaving} 
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang lưu... 
                    {:else} 
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> 
                        LƯU
                    {/if}
                </button>
            </div>
        </div>

        <div class="max-h-[500px] overflow-y-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-6 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-blue-600 transition" on:click={() => handleSort('name')}>
                            Nhóm Hàng {sortKey === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="px-6 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-blue-600 transition w-40" on:click={() => handleSort('valueDisplay')}>
                            Hệ số {sortKey === 'valueDisplay' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="px-6 py-3 w-20"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    {#each filteredItems as item (item.id)}
                        <tr class="hover:bg-blue-50/50 transition-colors">
                            <td class="px-6 py-2">
                                <input type="text" value={item.name} on:input={(e) => { item.name = e.target.value; }} class="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-700" placeholder="Nhập tên nhóm hàng..." />
                            </td>
                            <td class="px-6 py-2">
                                <input type="text" value={item.valueDisplay} on:input={(e) => handleValueInput(item, e)} class="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-blue-700 text-center" />
                            </td>
                            <td class="px-6 py-2 text-right">
                                <button on:click={() => removeItem(item.id)} class="text-slate-300 hover:text-red-500 p-1 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </td>
                        </tr>
                    {/each}
                    {#if filteredItems.length === 0}
                        <tr>
                            <td colspan="3" class="px-6 py-10 text-center text-slate-400 italic">Không tìm thấy nhóm hàng nào</td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
        
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <span class="text-sm text-slate-500 font-medium">Tổng cộng: <b>{heSoItems.length}</b> nhóm hàng</span>
        </div>
    </div>
</div>