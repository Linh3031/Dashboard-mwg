<script>
    import { afterUpdate } from 'svelte';
    import { helpContent } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    // 1. Định nghĩa trước các mốc gắn dấu "?" trên hệ thống
    const tutorialTargets = [
        { id: 'ycx-luy-ke', label: 'Khối 1: Yêu cầu xuất lũy kế (File Excel)' },
        { id: 'doanh-thu-bi', label: 'Khối 1: Doanh thu BI' },
        { id: 'thi-dua-nv', label: 'Khối 1: Thi đua nhân viên' },
        { id: 'data-luy-ke', label: 'Khối 1: Thi đua siêu thị lũy kế (Paste)' },
        { id: 'gio-cong', label: 'Khối 2: Giờ công' },
        { id: 'thuong-nong', label: 'Khối 2: Thưởng nóng' },
        { id: 'thuong-erp', label: 'Khối 2: Thưởng ERP' },
        { id: 'danh-sach-nv', label: 'Khối 3: Danh sách nhân viên' },
        { id: 'ycx-thang-truoc', label: 'Khối 3: YCX Lũy Kế tháng trước' },
        { id: 'thuong-nong-thang-truoc', label: 'Khối 3: Thưởng nóng tháng trước' },
        { id: 'ycx-cung-ky-nam', label: 'Khối 3: YCX Lũy kế năm trước' },
        { id: 'thuong-erp-thang-truoc', label: 'Khối 3: Thưởng ERP tháng trước' },

        { id: 'subtab-luyke-sieu-thi', label: 'Sức khỏe siêu thị: Siêu thị Lũy kế' },
        { id: 'subtab-luyke-thi-dua', label: 'Sức khỏe siêu thị: Thi đua ST Lũy kế' },
        { id: 'subtab-luyke-category', label: 'Sức khỏe siêu thị: Chi tiết Ngành hàng' },
        { id: 'subtab-luyke-thidua-vung', label: 'Sức khỏe siêu thị: Thi Đua Vùng TNB-HCM' },
        { id: 'subtab-dt-ck-nam', label: 'Sức khỏe siêu thị: SSG' },
        { id: 'subtab-luyke-address', label: 'Sức khỏe siêu thị: Thống kê địa chỉ' },

        { id: 'sknv', label: 'Sức khỏe nhân viên: SKNV' },
        { id: 'doanhthu', label: 'Sức khỏe nhân viên: Doanh thu LK' },
        { id: 'thunhap', label: 'Sức khỏe nhân viên: Thu nhập' },
        { id: 'hieuqua', label: 'Sức khỏe nhân viên: Hiệu quả NV LK' },
        { id: 'daily-trend', label: 'Sức khỏe nhân viên: Xu hướng ngày' },
        { id: 'thidua', label: 'Sức khỏe nhân viên: Thi đua NV LK' },
        { id: 'tragop', label: 'Sức khỏe nhân viên: Trả chậm' },

        { id: 'subtab-realtime-sieu-thi', label: 'Doanh thu Realtime: Siêu thị Real' },
        { id: 'subtab-realtime-nhan-vien', label: 'Doanh thu Realtime: DT NV Real' },
        { id: 'subtab-realtime-hieu-qua-nhan-vien', label: 'Doanh thu Realtime: Hiệu quả NV Real' },
        { id: 'subtab-realtime-hang-ban', label: 'Doanh thu Realtime: Chi tiết YCX Real' },
        { id: 'subtab-realtime-thi-dua', label: 'Doanh thu Realtime: Thi đua NV Real' },
        { id: 'subtab-realtime-tragop', label: 'Doanh thu Realtime: Trả chậm Real' },
        { id: 'subtab-realtime-dia-chi', label: 'Doanh thu Realtime: Địa chỉ Real' }
    ];

    let localHelpContent = {};
    tutorialTargets.forEach(t => {
        localHelpContent[t.id] = { title: '', desc: '', youtubeUrl: '' };
    });

    // [PHẪU THUẬT LOGIC]: Chữa lỗi Svelte Reactivity Reassignment & Race Condition
    let syncedString = '';
    $: if ($helpContent && Object.keys($helpContent).length > 0) {
        const incomingString = JSON.stringify($helpContent);
        
        // Chỉ nạp lại Form nếu dữ liệu store THỰC SỰ thay đổi (Khắc phục lỗi data đến trễ sau F5)
        if (incomingString !== syncedString) {
            let updatedContent = { ...localHelpContent };
            for (const key in $helpContent) {
                if (updatedContent[key] && typeof $helpContent[key] === 'object') {
                    updatedContent[key] = { ...updatedContent[key], ...$helpContent[key] };
                }
            }
            
            // LUẬT CỦA SVELTE: Phải gán lại (Reassign) biến chính để ép UI render text
            localHelpContent = updatedContent;
            syncedString = incomingString; // Lưu lại mốc data để không bị re-render đè phím lúc gõ
        }
    }

    let isSaving = false;

    async function saveHelp() {
        isSaving = true;
        try {
            for (const key in localHelpContent) {
                let url = localHelpContent[key].youtubeUrl;
                if (url) {
                    if (url.includes('watch?v=')) {
                        url = url.replace('watch?v=', 'embed/');
                        const ampIdx = url.indexOf('&');
                        if (ampIdx !== -1) url = url.substring(0, ampIdx);
                    } else if (url.includes('youtu.be/')) {
                        url = url.replace('youtu.be/', 'www.youtube.com/embed/');
                    }
                    if (!url.includes('?')) url += '?rel=0&modestbranding=1&autoplay=1';
                    localHelpContent[key].youtubeUrl = url;
                }
            }

            // Lưu local cache trước để an toàn chống F5
            helpContent.set({ ...localHelpContent });
            localStorage.setItem('cached_help_content', JSON.stringify(localHelpContent));
            
            // Đẩy lên Firebase Server Cloud
            if (typeof adminService.saveHelpContent === 'function') {
                await adminService.saveHelpContent(localHelpContent);
            }
            
            alert("✅ Đã đồng bộ hệ thống Video Hướng Dẫn thành công lên Server Cloud!");
        } catch (error) {
            console.error("Lỗi xử lý:", error);
            alert("⚠️ Lỗi không thể lưu lên Server: " + error.message);
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
                <div class="p-2 bg-green-50 rounded-lg text-green-600">
                    <i data-feather="youtube"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Quản lý Video Hướng Dẫn</h3>
                    <p class="text-xs text-slate-500">Gắn link Youtube cho các nút hỏi chấm (?) trên hệ thống</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary> 
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/50"> 
            
            <div class="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-200 flex items-start gap-2">
                <i data-feather="info" class="w-5 h-5 flex-shrink-0 mt-0.5"></i>
                <p>Nội dung cấu hình ở đây sẽ được nạp tự động vào các Modal Video tại trang Cập nhật dữ liệu tương ứng. Dán link gốc Youtube, hệ thống sẽ tự động ép thành link siêu nhẹ.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> 
                {#each tutorialTargets as target}
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
                        <div class="absolute -top-3 left-4 bg-green-100 text-green-800 px-2 py-0.5 text-xs font-bold rounded shadow-sm">
                            {target.label}
                        </div>

                        <div class="mt-2">
                            <label class="block text-xs font-bold text-slate-500 mb-1">Tiêu đề Video</label>
                            <input 
                                type="text" 
                                bind:value={localHelpContent[target.id].title}
                                class="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" 
                                placeholder="VD: Hướng dẫn xuất YCX"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Mô tả ngắn gọn (Tips)</label>
                            <textarea 
                                bind:value={localHelpContent[target.id].desc}
                                rows="2" 
                                class="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none text-slate-600 resize-none" 
                                placeholder="Nhập ghi chú nhỏ hiển thị dưới video..."
                            ></textarea>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-red-500 mb-1 flex items-center gap-1">
                                <i data-feather="link" class="w-3 h-3"></i> Youtube Link
                            </label>
                            <input 
                                type="text" 
                                bind:value={localHelpContent[target.id].youtubeUrl}
                                class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-red-400 focus:border-red-400 outline-none" 
                                placeholder="Dán link Youtube vào đây..."
                            />
                        </div>
                    </div>
                {/each}
            </div> 
            
            <div class="mt-6 flex justify-end pt-4 border-t border-slate-200">
                <button 
                    on:click={saveHelp} 
                    disabled={isSaving}
                    class="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                    <div class={isSaving ? 'hidden' : 'block'}>
                        <i data-feather="save" class="w-4 h-4 mt-1"></i>
                    </div>
                    
                    <div class={isSaving ? 'block' : 'hidden'}>
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                    
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu Hướng Dẫn'}</span>
                </button> 
            </div> 
        </div>
    </details>
</div>