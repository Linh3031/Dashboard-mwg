<script>
    import { declarations } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let ycxValue = '';
    let ycxGopValue = '';
    let heSoValue = '';

    $: if ($declarations) {
        ycxValue = $declarations.hinhThucXuat || '';
        ycxGopValue = $declarations.hinhThucXuatGop || '';
        heSoValue = $declarations.heSoQuyDoi || '';
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
</script>

<details class="declaration-group"> 
    <summary>Dữ liệu tính toán</summary> 
    <div class="declaration-content"> 
        <div class="grid md:grid-cols-2 gap-6 mt-4"> 
            <div>
                <label for="decl-ycx" class="block text-md font-semibold text-gray-700 mb-2">Hình thức xuất (Tính doanh thu)</label> 
                <textarea id="decl-ycx" rows="8" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" placeholder="Mỗi loại một dòng..." bind:value={ycxValue}></textarea> 
            </div>
            <div> 
                <label for="decl-ycx-gop" class="block text-md font-semibold text-gray-700 mb-2">Hình thức xuất (Trả góp)</label> 
                <textarea id="decl-ycx-gop" rows="8" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" placeholder="Mỗi loại một dòng..." bind:value={ycxGopValue}></textarea> 
            </div>
            <div class="md:col-span-2"> 
                <label for="decl-heso" class="block text-md font-semibold text-gray-700 mb-2">Hệ số quy đổi</label> 
                <textarea id="decl-heso" rows="8" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" placeholder="Định dạng: Tên nhóm hàng,Hệ số" bind:value={heSoValue}></textarea> 
            </div>
        </div> 
        <div class="mt-4 flex justify-end">
            <button on:click={saveDeclarations} class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-bold shadow-sm">
                Lưu Dữ liệu tính toán
            </button> 
        </div> 
    </div>
</details>