<script>
    import { onMount, afterUpdate } from 'svelte';
    import { declarations } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    import { config } from '../../config.js';

    let ycxValue = '';
    let ycxGopValue = '';
    let heSoValue = '';

    $: if ($declarations) {
        ycxValue = $declarations.hinhThucXuat || config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU.join('\n');
        ycxGopValue = $declarations.hinhThucXuatGop || config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP.join('\n');
        
        if ($declarations.heSoQuyDoi) {
            heSoValue = $declarations.heSoQuyDoi;
        } else {
            heSoValue = Object.entries(config.DEFAULT_DATA.HE_SO_QUY_DOI)
                .map(([k, v]) => `${k},${v}`)
                .join('\n');
        }
    }

    async function saveDeclarations() {
        const dataToSave = { ycx: ycxValue, ycxGop: ycxGopValue, heSo: heSoValue };
        await adminService.saveDeclarationsToFirestore(dataToSave);
        declarations.set({ 
            hinhThucXuat: ycxValue, 
            hinhThucXuatGop: ycxGopValue, 
            heSoQuyDoi: heSoValue 
        });
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
                <button on:click={saveDeclarations} class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold shadow-sm flex items-center gap-2">
                    <i data-feather="save" class="w-4 h-4"></i>
                    Lưu Cấu Hình
                </button> 
            </div> 
        </div>
    </details>
</div>