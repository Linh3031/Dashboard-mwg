<script>
    import { onMount } from 'svelte';
    import { declarations, categoryStructure } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    import { parseIdentity } from '../../utils.js';

    let ycxValue = '';
    let ycxGopValue = '';
    let isSaving = false;

    // --- LOGIC QUẢN LÝ HỆ SỐ QUY ĐỔI (TREE-VIEW & OVERRIDE CHUẨN EXCEL) ---
    let rawHeSoMap = {}; // Lưu trữ map hệ số thô từ Cloud/Database
    let treeData = [];   // Cây cấu trúc: Lấy 100% từ Excel ($categoryStructure)
    let extraItems = []; // Danh sách các dòng do Admin CHỦ ĐỘNG bấm nút Thêm dòng ngoại lệ
    let searchTerm = '';
    
    // Biến lưu trạng thái mở rộng (expand) của các Ngành hàng
    let expandedCategories = {};

    const generateId = () => Math.random().toString(36).substr(2, 9);

    onMount(async () => {
        try {
            const data = await adminService.loadDeclarationsFromFirestore();
            if (data) {
                declarations.set(data);
                ycxValue = data.hinhThucXuat || data.ycx || '';
                ycxGopValue = data.hinhThucXuatGop || data.ycxGop || '';
                
                // Parse chuỗi hệ số thành Map { id/name: value }
                rawHeSoMap = parseHeSoToMap(data.heSoQuyDoi || data.heSo || '');
                buildTreeData();
            }
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
    });

    // Lắng nghe thay đổi từ categoryStructure để build lại cây
    $: if ($categoryStructure && $categoryStructure.length > 0) {
        buildTreeData();
    }

    function parseHeSoToMap(rawString) {
        const map = {};
        if (!rawString) return map;
        rawString.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const lastComma = trimmed.lastIndexOf(',');
            if (lastComma > -1) {
                const key = trimmed.substring(0, lastComma).trim();
                const valNum = parseFloat(trimmed.substring(lastComma + 1).trim().replace(',', '.')) || 1;
                map[key] = valNum;
            } else {
                map[trimmed] = 1;
            }
        });
        return map;
    }

    // [PHẪU THUẬT v3.2]: Xây dựng cây DỰA 100% VÀO EXCEL CẤU TRÚC ($categoryStructure)
    function buildTreeData() {
        const catMap = new Map();
        const knownKeys = new Set();

        if ($categoryStructure && $categoryStructure.length > 0) {
            $categoryStructure.forEach(row => {
                const nganhRaw = row.nganhHang || 'Khác';
                const nhomRaw = row.nhomHang || 'Khác';
                
                const nganhId = parseIdentity(nganhRaw).id !== 'unknown' ? parseIdentity(nganhRaw).id : nganhRaw;
                const nhomId = parseIdentity(nhomRaw).id !== 'unknown' ? parseIdentity(nhomRaw).id : nhomRaw;
                
                knownKeys.add(nganhRaw);
                knownKeys.add(String(nganhId));
                knownKeys.add(nhomRaw);
                knownKeys.add(String(nhomId));

                if (!catMap.has(nganhRaw)) {
                    // Lấy hệ số ngành từ DB cũ (nếu có), không có mặc định là 1
                    const nganhVal = rawHeSoMap[nganhRaw] !== undefined ? rawHeSoMap[nganhRaw] : (rawHeSoMap[nganhId] !== undefined ? rawHeSoMap[nganhId] : 1);
                    catMap.set(nganhRaw, {
                        id: generateId(),
                        rawKey: nganhRaw,
                        name: nganhRaw,
                        valueDisplay: nganhVal.toString().replace('.', ','),
                        childrenMap: new Map()
                    });
                }

                const catObj = catMap.get(nganhRaw);
                const currentCatVal = parseFloat(catObj.valueDisplay.replace(',', '.')) || 1;

                if (!catObj.childrenMap.has(nhomRaw)) {
                    // Tìm xem trong DB cũ có lưu giá trị cho nhóm này không
                    let storedChildVal = rawHeSoMap[nhomRaw] !== undefined ? rawHeSoMap[nhomRaw] : (rawHeSoMap[nhomId] !== undefined ? rawHeSoMap[nhomId] : undefined);
                    
                    // [CHỐT LOGIC QUAN TRỌNG]: Nếu giá trị con BẰNG Y HỆT Ngành cha -> Tự động chuyển về "Kế thừa" (không bị Ngoại lệ oan)
                    let isOverride = storedChildVal !== undefined && storedChildVal !== currentCatVal;
                    let displayVal = isOverride ? storedChildVal.toString().replace('.', ',') : '';

                    catObj.childrenMap.set(nhomRaw, {
                        id: generateId(),
                        rawKey: nhomRaw,
                        name: nhomRaw,
                        isOverride: isOverride,
                        valueDisplay: displayVal
                    });
                }
            });
        }

        // Chuyển map thành array để hiển thị
        treeData = Array.from(catMap.values()).map(cat => ({
            ...cat,
            children: Array.from(cat.childrenMap.values())
        }));

        // [KHÔNG SÁNG TẠO VÔ LẬP TRƯỜNG]: Loại bỏ hoàn toàn tính năng tự động hút mã lạ từ DB cũ lên bảng.
        // extraItems chỉ chứa những dòng do chính Admin bấm nút Thêm dòng ngoại lệ (nếu đã tạo trước đó ở session hiện tại).
        extraItems = extraItems.filter(item => item.name && item.name.trim());
    }

    // Xử lý tìm kiếm thông minh: nếu khớp con thì tự mở rộng cha
    $: filteredTree = (() => {
        if (!searchTerm) return treeData;
        const term = searchTerm.toLowerCase();
        return treeData.map(cat => {
            const catMatch = cat.name.toLowerCase().includes(term);
            const matchedChildren = cat.children.filter(child => child.name.toLowerCase().includes(term));
            
            if (matchedChildren.length > 0) {
                expandedCategories[cat.id] = true; // Tự động mở rộng
            }

            if (catMatch || matchedChildren.length > 0) {
                return {
                    ...cat,
                    children: catMatch ? cat.children : matchedChildren
                };
            }
            return null;
        }).filter(Boolean);
    })();

    $: filteredExtra = searchTerm ? extraItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) : extraItems;

    function toggleExpand(catId) {
        expandedCategories[catId] = !expandedCategories[catId];
        expandedCategories = { ...expandedCategories };
    }

    // Admin chủ động bấm thêm dòng ngoại lệ
    function addExtraItem() {
        extraItems = [{ id: generateId(), name: '', valueDisplay: '1' }, ...extraItems];
        searchTerm = '';
    }

    function removeExtraItem(id) {
        extraItems = extraItems.filter(item => item.id !== id);
    }

    // Khi gõ vào ô Ngành hàng cha -> cập nhật giá trị cha và đồng bộ trạng thái kế thừa của con
    function handleCatValueInput(cat, event) {
        let val = event.target.value;
        if (val.includes('.')) {
            alert("⚠️ Lỗi định dạng: Vui lòng sử dụng dấu phẩy (,) thay vì dấu chấm (.) cho số thập phân.\nVí dụ: 1,85");
            val = val.replace(/\./g, ',');
            event.target.value = val;
        }
        cat.valueDisplay = val;
        
        // Nếu thay đổi hệ số cha, kiểm tra lại con: đứa nào bằng số mới của cha thì cho về Kế thừa
        const newCatNum = parseFloat(val.replace(',', '.')) || 1;
        cat.children.forEach(child => {
            if (child.isOverride) {
                const childNum = parseFloat(child.valueDisplay.replace(',', '.')) || 1;
                if (childNum === newCatNum) {
                    child.isOverride = false;
                    child.valueDisplay = '';
                }
            }
        });

        treeData = [...treeData];
    }

    // Khi gõ vào ô Nhóm con -> kích hoạt chế độ Ghi đè (Override), nếu số gõ giống hệt cha -> tự động về Kế thừa
    function handleChildValueInput(child, cat, event) {
        let val = event.target.value;
        if (val.includes('.')) {
            alert("⚠️ Lỗi định dạng: Vui lòng sử dụng dấu phẩy (,) thay vì dấu chấm (.) cho số thập phân.\nVí dụ: 1,92");
            val = val.replace(/\./g, ',');
            event.target.value = val;
        }
        
        const childNum = parseFloat(val.replace(',', '.'));
        const catNum = parseFloat(cat.valueDisplay.replace(',', '.'));

        if (val.trim() === '' || (!isNaN(childNum) && childNum === catNum)) {
            child.isOverride = false;
            child.valueDisplay = '';
        } else {
            child.valueDisplay = val;
            child.isOverride = true;
        }
        
        treeData = [...treeData];
    }

    // Xóa ghi đè cho nhóm con -> quay lại kế thừa cha
    function resetChildOverride(child) {
        child.valueDisplay = '';
        child.isOverride = false;
        treeData = [...treeData];
    }

    async function saveDeclarations() {
        isSaving = true;
        try {
            const lines = [];

            // 1. Gom các Ngành cha và Nhóm con bị ghi đè Ngoại lệ
            treeData.forEach(cat => {
                if (cat.name && cat.name.trim()) {
                    let numStr = (cat.valueDisplay || '1').toString().replace(',', '.');
                    if (isNaN(parseFloat(numStr))) numStr = '1';
                    lines.push(`${cat.name.trim()},${numStr}`);
                }
                cat.children.forEach(child => {
                    if (child.isOverride && child.valueDisplay && child.name.trim()) {
                        let childNumStr = child.valueDisplay.toString().replace(',', '.');
                        if (!isNaN(parseFloat(childNumStr))) {
                            lines.push(`${child.name.trim()},${childNumStr}`);
                        }
                    }
                });
            });

            // 2. Gom các mục Khai báo bổ sung / Ngoại lệ (do Admin CHỦ ĐỘNG gõ thêm tay)
            extraItems.forEach(item => {
                if (item.name && item.name.trim()) {
                    let numStr = (item.valueDisplay || '1').toString().replace(',', '.');
                    if (isNaN(parseFloat(numStr))) numStr = '1';
                    lines.push(`${item.name.trim()},${numStr}`);
                }
            });

            const heSoString = lines.join('\n');

            // [FIX CRITICAL] Đóng gói cả Key cũ và Key mới để vỗ về Firebase
            const payload = {
                ycx: ycxValue || '',
                ycxGop: ycxGopValue || '',
                heSo: heSoString || '',
                hinhThucXuat: ycxValue || '',
                hinhThucXuatGop: ycxGopValue || '',
                heSoQuyDoi: heSoString || ''
            };

            await adminService.saveDeclarationsToFirestore(payload);
            declarations.set(payload);
            
            // Cập nhật lại map cục bộ sau khi lưu thành công
            rawHeSoMap = parseHeSoToMap(heSoString);
            alert("✅ Đã lưu cấu hình Hệ số quy đổi theo Ngành hàng thành công!");
        } catch (error) {
            console.error("Lưu thất bại:", error);
            alert("❌ Lưu thất bại: " + error.message);
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
                <h3 class="font-bold text-slate-800">Hệ số quy đổi Ngành Hàng (Kế thừa & Ngoại lệ)</h3>
                <p class="text-xs text-slate-500">Danh sách hiển thị 100% theo file Excel Cấu trúc. Nhóm con mặc định kế thừa Ngành cha.</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 md:gap-3">
                <div class="relative flex-grow md:flex-grow-0">
                    <span class="absolute left-3 top-2.5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input 
                        type="text" 
                        bind:value={searchTerm} 
                        placeholder="Tìm ngành hoặc nhóm hàng..." 
                        class="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                    />
                </div>
                
                <button on:click={addExtraItem} class="bg-slate-200 text-slate-700 px-3 md:px-4 py-2 rounded-lg hover:bg-slate-300 flex items-center gap-2 font-bold transition shadow-sm whitespace-nowrap" title="Chỉ dùng khi cần thêm thủ công mã lạ không có trong Excel">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                    <span class="hidden sm:inline">Thêm dòng ngoại lệ</span>
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

        <div class="max-h-[550px] overflow-y-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-6 py-3 text-xs font-bold text-slate-500 uppercase">
                            Ngành Hàng / Nhóm Hàng
                        </th>
                        <th class="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-48 text-center">
                            Hệ số quy đổi
                        </th>
                        <th class="px-6 py-3 w-28 text-right text-xs font-bold text-slate-500 uppercase">
                            Trạng thái
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <!-- KHU VỰC 1: CÂY NGÀNH HÀNG VÀ NHÓM HÀNG CHUẨN EXCEL CẤU TRÚC -->
                    {#each filteredTree as cat (cat.id)}
                        <!-- Dòng Ngành Hàng Cha -->
                        <tr class="bg-slate-100/70 hover:bg-slate-200/60 font-bold transition-colors cursor-pointer select-none" on:click={() => toggleExpand(cat.id)}>
                            <td class="px-6 py-3 flex items-center gap-2 text-slate-800">
                                <span class="text-xs text-slate-400 w-4 inline-block transition-transform transform {expandedCategories[cat.id] ? 'rotate-90 text-blue-600' : ''}">▶</span>
                                <span>{cat.name}</span>
                                {#if cat.children.length > 0}
                                    <span class="text-[11px] font-normal bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-2">
                                        {cat.children.length} nhóm con
                                    </span>
                                {/if}
                            </td>
                            <td class="px-6 py-2" on:click|stopPropagation>
                                <input 
                                    type="text" 
                                    value={cat.valueDisplay} 
                                    on:input={(e) => handleCatValueInput(cat, e)} 
                                    class="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm font-extrabold text-blue-700 text-center focus:ring-2 focus:ring-blue-500 shadow-inner" 
                                    title="Hệ số chung cho toàn bộ ngành này"
                                />
                            </td>
                            <td class="px-6 py-2 text-right text-xs text-slate-500 font-normal">
                                <span class="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">Ngành cha</span>
                            </td>
                        </tr>

                        <!-- Các Dòng Nhóm Hàng Con (Khi được mở rộng) -->
                        {#if expandedCategories[cat.id]}
                            {#each cat.children as child (child.id)}
                                <tr class="hover:bg-blue-50/50 transition-colors {child.isOverride ? 'bg-amber-50/40' : ''}">
                                    <td class="pl-12 pr-6 py-2 text-sm text-slate-600 flex items-center gap-2">
                                        <span class="text-slate-300">└</span>
                                        <span class={child.isOverride ? 'font-bold text-amber-900' : ''}>{child.name}</span>
                                    </td>
                                    <td class="px-6 py-1.5">
                                        <div class="relative flex items-center">
                                            <input 
                                                type="text" 
                                                value={child.isOverride ? child.valueDisplay : cat.valueDisplay} 
                                                on:input={(e) => handleChildValueInput(child, cat, e)} 
                                                class="w-full border rounded px-2 py-1 text-sm text-center transition-all {child.isOverride ? 'bg-amber-100 border-amber-400 font-bold text-amber-900 shadow-sm' : 'bg-slate-50/50 border-slate-200 text-slate-400 italic'}" 
                                                placeholder={cat.valueDisplay}
                                                title={child.isOverride ? "Đang ghi đè hệ số riêng" : "Đang kế thừa hệ số từ Ngành cha"}
                                            />
                                            {#if child.isOverride}
                                                <button 
                                                    on:click={() => resetChildOverride(child)} 
                                                    class="absolute right-1 text-amber-600 hover:text-red-600 p-1 text-xs font-bold"
                                                    title="Xóa ngoại lệ, quay lại kế thừa cha"
                                                >
                                                    ↺
                                                </button>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="px-6 py-1.5 text-right text-xs">
                                        {#if child.isOverride}
                                            <span class="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">Ngoại lệ</span>
                                        {:else}
                                            <span class="text-slate-400 italic">Kế thừa</span>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    {/each}

                    <!-- KHU VỰC 2: KHAI BÁO BỔ SUNG / ĐẶC THÙ (CHỈ HIỆN KHI ADMIN CHỦ ĐỘNG BẤM NÚT THÊM DÒNG) -->
                    {#if extraItems.length > 0}
                        <tr class="bg-slate-200/80 font-bold text-slate-700 border-t-2 border-slate-300">
                            <td colspan="3" class="px-6 py-2.5 text-xs uppercase tracking-wider flex items-center gap-1 text-amber-800">
                                <span>⭐ Khai báo bổ sung / Đặc thù (Do Admin chủ động thêm tay)</span>
                            </td>
                        </tr>
                        {#each filteredExtra as item (item.id)}
                            <tr class="hover:bg-amber-50 transition-colors bg-amber-50/20">
                                <td class="px-6 py-2">
                                    <input 
                                        type="text" 
                                        value={item.name} 
                                        on:input={(e) => { item.name = e.target.value; }} 
                                        class="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-700" 
                                        placeholder="Nhập tên nhóm / mã hàng đặc thù..." 
                                    />
                                </td>
                                <td class="px-6 py-2">
                                    <input 
                                        type="text" 
                                        value={item.valueDisplay} 
                                        on:input={(e) => handleCatValueInput(item, e)} 
                                        class="w-full bg-white border border-amber-300 rounded px-2 py-1 text-sm font-bold text-amber-800 text-center focus:ring-2 focus:ring-amber-500" 
                                    />
                                </td>
                                <td class="px-6 py-2 text-right">
                                    <button on:click={() => removeExtraItem(item.id)} class="text-slate-400 hover:text-red-500 p-1 transition" title="Xóa dòng này">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    {/if}

                    {#if filteredTree.length === 0 && filteredExtra.length === 0}
                        <tr>
                            <td colspan="3" class="px-6 py-10 text-center text-slate-400 italic">Không tìm thấy Ngành hàng hay Nhóm hàng nào (Hãy kiểm tra tab Nạp dữ liệu cấu trúc)</td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
        
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
            <span>Hiển thị: <b>{treeData.length}</b> Ngành hàng chuẩn Excel | <b>{extraItems.length}</b> mục bổ sung</span>
            <span class="italic text-xs">* Mẹo: Click vào Ngành hàng để xem/sửa Nhóm con bên trong</span>
        </div>
    </div>
</div>