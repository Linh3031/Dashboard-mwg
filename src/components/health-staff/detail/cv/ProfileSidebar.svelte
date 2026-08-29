<script>
    import { firebaseStore, selectedWarehouse } from '../../../../stores.js';
    import { formatters } from '../../../../utils/formatters.js';
    import { afterUpdate, onMount } from 'svelte';
    
    export let employee;
    export let totalAbove = 0;
    export let totalCriteria = 0;
    export let monthlyRevenue = [];
    
    let isUploading = false;
    let uploadProgress = 0;
    $: firstLetter = employee?.hoTen ? employee.hoTen.charAt(0).toUpperCase() : 'U';
    let avatarUrl = null;

    $: aiReview = (() => {
        if (totalCriteria === 0) return "Chưa có đủ dữ liệu để đánh giá nhân viên này.";
        const ratio = totalAbove / totalCriteria;
        if (ratio >= 0.8) return `🌟 ${employee.hoTen} đang duy trì phong độ cực kỳ xuất sắc. Đạt ${totalAbove}/${totalCriteria} chỉ tiêu. Cần tiếp tục phát huy và có thể cân nhắc làm hạt giống kế thừa.`;
        if (ratio >= 0.5) return `✅ Phong độ ổn định. Đạt ${totalAbove}/${totalCriteria} chỉ tiêu. Tuy nhiên, vẫn còn một số mảng cần cải thiện để tối ưu hóa năng lực bán hàng.`;
        if (ratio > 0) return `⚠️ Đang gặp khó khăn trong việc hoàn thành chỉ tiêu (${totalAbove}/${totalCriteria}). Cần được quản lý trực tiếp hỗ trợ, review lại kỹ năng tư vấn hoặc rà soát lại các mảng đang bị hụt số.`;
        return `❌ Báo động: Chưa đạt bất kỳ chỉ tiêu nào trong tháng. Cần can thiệp khẩn cấp.`;
    })();

    async function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Vui lòng chọn ảnh nhỏ hơn 2MB'); return; }
        if (!$firebaseStore.storage) { alert('Hệ thống Firebase Storage chưa được khởi tạo!'); return; }
        try {
            isUploading = true;
            const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
            const kho = $selectedWarehouse || 'UNKNOWN';
            const storageRef = ref($firebaseStore.storage, `avatars/${kho}/${employee.maNV}.jpg`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on('state_changed', 
                (snapshot) => { uploadProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100); }, 
                (error) => { alert('Lỗi upload: ' + error.message); isUploading = false; }, 
                async () => {
                    avatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    isUploading = false; uploadProgress = 0; alert('Cập nhật ảnh đại diện thành công!');
                }
            );
        } catch (error) { console.error(error); isUploading = false; alert('Có lỗi xảy ra.'); }
    }

    onMount(async () => {
        if (window.feather) window.feather.replace();
        if ($firebaseStore.storage && employee?.maNV) {
            try {
                const { ref, getDownloadURL } = await import('firebase/storage');
                const kho = $selectedWarehouse || 'UNKNOWN';
                avatarUrl = await getDownloadURL(ref($firebaseStore.storage, `avatars/${kho}/${employee.maNV}.jpg`));
            } catch (e) { avatarUrl = null; }
        }
    });

    afterUpdate(() => { if (window.feather) window.feather.replace(); });
</script>

<div class="w-full h-full bg-slate-800 text-white p-6 flex flex-col relative rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl shadow-xl">
    <div class="absolute top-4 right-4 flex gap-1">
        <div class="w-3 h-3 rounded-full bg-red-400"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div class="w-3 h-3 rounded-full bg-green-400"></div>
    </div>

    <div class="flex flex-col items-center border-b border-slate-600 pb-6 pt-4">
        <div class="relative w-32 h-32 rounded-full border-4 border-teal-400 bg-slate-700 flex items-center justify-center overflow-hidden mb-4 shadow-lg group">
            {#if avatarUrl}
                <img src={avatarUrl} alt="Avatar" class="w-full h-full object-cover" on:error={() => avatarUrl = null} />
            {:else}
                <span class="text-5xl font-black text-slate-400">{firstLetter}</span>
            {/if}
            <label class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                {#if isUploading}
                    <span class="text-xs font-bold text-teal-300">{uploadProgress}%</span>
                {:else}
                    <i data-feather="camera" class="w-6 h-6 text-white mb-1"></i>
                    <span class="text-[10px] uppercase font-bold text-white tracking-widest">Đổi ảnh</span>
                {/if}
                <input type="file" accept="image/*" class="hidden" on:change={handleAvatarUpload} disabled={isUploading} />
            </label>
        </div>
        <h1 class="text-xl font-black tracking-wider text-teal-300 text-center uppercase">{employee.hoTen}</h1>
        <p class="text-sm text-slate-300 font-semibold mt-1">{employee.maNV} • {employee.boPhan}</p>
        <div class="mt-3 px-3 py-1 bg-teal-500/20 border border-teal-500 rounded-full text-teal-300 text-xs font-bold shadow-[0_0_10px_rgba(45,212,191,0.2)]">
            Hồ Sơ Năng Lực
        </div>
    </div>

    <div class="mt-6">
        <div class="flex items-center gap-2 mb-2 text-teal-400">
            <i data-feather="cpu" class="w-4 h-4"></i>
            <h2 class="text-xs font-bold uppercase tracking-widest">AI Đánh giá</h2>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed text-justify">{aiReview}</p>
    </div>

    <div class="mt-6 border-t border-slate-600 pt-5 flex-grow">
        <div class="flex items-center gap-2 mb-3 text-emerald-400">
            <i data-feather="bar-chart-2" class="w-4 h-4"></i>
            <h2 class="text-xs font-bold uppercase tracking-widest">Doanh thu QĐ Từng tháng</h2>
        </div>
        <div class="space-y-2.5">
            {#each monthlyRevenue as m}
                <div class="flex justify-between items-center bg-slate-700/60 p-3 rounded-xl border border-slate-600/50">
                    <span class="text-sm font-bold text-slate-300">{m.month}</span>
                    <span class="text-base font-black text-white">{formatters.formatRevenue(m.dtqd)}</span>
                </div>
            {/each}
            {#if monthlyRevenue.length === 0}
                <p class="text-xs text-slate-400 italic">Chưa có dữ liệu tháng.</p>
            {/if}
        </div>
    </div>

    <div class="mt-4 border-t border-slate-600 pt-5">
        <h2 class="text-xs font-bold uppercase tracking-widest text-teal-400 mb-3">Mức độ Hoàn thành</h2>
        <div class="space-y-4">
            <div>
                <div class="flex justify-between text-xs font-bold mb-1.5">
                    <span>Tổng chỉ tiêu</span> 
                    <span class="text-teal-300">{totalAbove}/{totalCriteria}</span>
                </div>
                <div class="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                    <div class="h-full bg-teal-400 rounded-full transition-all duration-1000" style="width: {totalCriteria > 0 ? (totalAbove/totalCriteria)*100 : 0}%"></div>
                </div>
            </div>
        </div>
    </div>
</div>