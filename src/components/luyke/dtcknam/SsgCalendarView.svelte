<script>
    import SsgCalendarCell from './SsgCalendarCell.svelte';
    export let calendarGrid = [];
    
    // Đủ 4 Toggles theo yêu cầu
    let toggles = { show2025: true, showThuc: true, showQd: false, showGrowth: true };
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-300 mt-6 overflow-hidden">
    <div class="bg-[#1e293b] px-4 py-3 flex flex-wrap justify-between items-center">
        <h3 class="text-white font-bold text-sm uppercase flex items-center gap-2">
            <i data-feather="calendar" class="w-4 h-4 text-blue-400"></i> CHI TIẾT DOANH THU NGÀY (TRIỆU)
        </h3>
        <div class="flex gap-4 bg-slate-700 px-3 py-1.5 rounded-lg">
            <label class="flex items-center gap-1.5 text-xs text-white font-bold cursor-pointer"><input type="checkbox" bind:checked={toggles.show2025} class="accent-blue-500 w-3.5 h-3.5" /> 2025</label>
            <label class="flex items-center gap-1.5 text-xs text-blue-300 font-bold cursor-pointer"><input type="checkbox" bind:checked={toggles.showThuc} class="accent-blue-500 w-3.5 h-3.5" /> DT Thực</label>
            <label class="flex items-center gap-1.5 text-xs text-emerald-300 font-bold cursor-pointer"><input type="checkbox" bind:checked={toggles.showQd} class="accent-blue-500 w-3.5 h-3.5" /> DT Quy Đổi</label>
            <label class="flex items-center gap-1.5 text-xs text-white font-bold cursor-pointer"><input type="checkbox" bind:checked={toggles.showGrowth} class="accent-blue-500 w-3.5 h-3.5" /> Tăng/Giảm</label>
        </div>
    </div>

    <div class="p-4 bg-gray-50/50">
        <div class="grid grid-cols-7 border border-gray-300 rounded-t-lg overflow-hidden mb-2">
            {#each ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'] as day}
                <div class="text-center text-[11px] font-bold text-slate-700 bg-slate-200 py-2 border-r border-gray-300 uppercase">{day}</div>
            {/each}
            {#each ['Thứ Bảy', 'Chủ Nhật'] as day}
                <div class="text-center text-[11px] font-bold text-red-700 bg-red-100 py-2 border-r last:border-r-0 border-red-200 uppercase">{day}</div>
            {/each}
        </div>
        
        <div class="grid grid-cols-7 gap-2">
            {#each calendarGrid as cellData}
                <SsgCalendarCell data={cellData} {toggles} />
            {/each}
        </div>
    </div>
</div>