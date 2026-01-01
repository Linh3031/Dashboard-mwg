<script>
    import { onMount, afterUpdate } from 'svelte';
    import { declarations } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    import { config } from '../../config.js';

    // Biến lưu trạng thái form
    let ycxValue = '';
    let ycxGopValue = '';
    let heSoValue = '';
    let isSaving = false;

    // --- LOGIC 1: TẢI DỮ LIỆU CHỦ ĐỘNG (FIX LỖI F5 MẤT) ---
    onMount(async () => {
        console.log("🚀 [AdminCalculation] Component Mounted via CodeGenesis");
        try {
            // Gọi trực tiếp service để lấy dữ liệu mới nhất từ Cloud, không chờ Store
            const data = await adminService.loadDeclarationsFromFirestore();
            console.log("📥 [Load] Dữ liệu tải về từ Firestore:", data);
            
            if (data) {
                // Ép dữ liệu vào Store để cập nhật UI
                declarations.set(data);
            }
        } catch (error) {
            console.error("❌ [Load Error] Không thể tải dữ liệu:", error);
        }
    });

    // --- LOGIC 2: ĐỒNG BỘ UI VỚI STORE ---
    $: if ($declarations) {
        console.log("🔄 [Sync] Store đã cập nhật:", $declarations);
        
        // Logic ưu tiên: Key Mới -> Key Cũ -> Mặc định
        ycxValue = $declarations.hinhThucXuat || $declarations.ycx || config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU.join('\n');
        ycxGopValue = $declarations.hinhThucXuatGop || $declarations.ycxGop || config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP.join('\n');
        
        // Xử lý hệ số (Object hoặc String)
        if ($declarations.heSoQuyDoi) {
            heSoValue = $declarations.heSoQuyDoi;
        } else if ($declarations.heSo) {
             heSoValue = $declarations.heSo;
        } else {
            heSoValue = Object.entries(config.DEFAULT_DATA.HE_SO_QUY_DOI)
                .map(([k, v]) => `${k},${v}`)
                .join('\n');
        }
    }

    // --- LOGIC 3: LƯU DỮ LIỆU (FIX LỖI LƯU ẢO) ---
    async function saveDeclarations() {
        if (isSaving) return;
        isSaving = true;

        // Chuẩn bị dữ liệu: Gửi cả key cũ và mới để đảm bảo tương thích
        const dataToSave = {
            // Key cho logic hiển thị mới
            hinhThucXuat: ycxValue || '',
            hinhThucXuatGop: ycxGopValue || '',
            heSoQuyDoi: heSoValue || '',
            
            // Key cho logic cũ (Service/Legacy)
            ycx: ycxValue || '',
            ycxGop: ycxGopValue || '',
            heSo: heSoValue || ''
        };

        console.log("📤 [Save] Đang gửi dữ liệu đi:", dataToSave);

        try {
            await adminService.saveDeclarationsToFirestore(dataToSave);
            console.log("✅ [Save] Service báo thành công!");
            
            // Cập nhật lại Store ngay lập tức
            declarations.set(dataToSave);
            
            alert("✅ Đã lưu cấu hình thành công!"); 
        } catch (error) {
            console.error("❌ [Save Error] Lỗi chi tiết:", error);
            alert("❌ Lỗi hệ thống: " + (error.message || "Không thể lưu"));
        } finally {
            isSaving = false;
        }
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group">
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <i data-feather="sliders"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Dữ liệu tính toán & Logic</h3>
                    <p class="text-xs text-slate-500">Cấu hình Hình thức xuất, Hệ số quy đổi...</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary>
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/50">
            <div class="grid md:grid-cols-2 gap-6"> 
                <div>
                    <label for="decl-ycx" class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        Hình thức xuất (Tính doanh thu)
                        <span class="text-xs font-normal text-slate-400 bg-white border px-2 py-0.5 rounded-full">Mỗi loại 1 dòng</span>
                    </label> 
                    <textarea id="decl-ycx" rows="8" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs bg-white text-slate-600 leading-relaxed shadow-sm" placeholder="Nhập dữ liệu..." bind:value={ycxValue}></textarea> 
                </div>
                <div> 
                    <label for="decl-ycx-gop" class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        Hình thức xuất (Trả góp)
                         <span class="text-xs font-normal text-slate-400 bg-white border px-2 py-0.5 rounded-full">Mỗi loại 1 dòng</span>
                    </label> 
                    <textarea id="decl-ycx-gop" rows="8" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs bg-white text-slate-600 leading-relaxed shadow-sm" placeholder="Nhập dữ liệu..." bind:value={ycxGopValue}></textarea> 
                </div>
                <div class="md:col-span-2"> 
                    <label for="decl-heso" class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        Hệ số quy đổi
                        <span class="text-xs font-normal text-slate-400 bg-white border px-2 py-0.5 rounded-full">Format: Tên nhóm hàng, Hệ số</span>
                    </label> 
                    <textarea id="decl-heso" rows="8" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs bg-white text-slate-600 leading-relaxed shadow-sm" placeholder="VD: Điện thoại, 1" bind:value={heSoValue}></textarea> 
                </div>
            </div> 
            
            <div class="mt-6 flex justify-end pt-4 border-t border-slate-200">
                <button on:click={saveDeclarations} disabled={isSaving} class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50">
                    {#if isSaving}
                        <span class="animate-spin">⏳</span> Đang lưu...
                    {:else}
                        <i data-feather="save" class="w-4 h-4"></i> Lưu Cấu Hình
                    {/if}
                </button> 
            </div> 
        </div>
    </details>
</div>