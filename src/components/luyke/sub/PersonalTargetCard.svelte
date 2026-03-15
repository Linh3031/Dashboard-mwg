<script>
    import { luykeNameMappings } from '../../../stores.js';
    
    export let item;
    export let empCount;
    export let targetRatio = 100; // Nhận tỷ lệ % từ thanh trượt

    $: type = item.type;
    // Tính toán Target gốc nhân với tỷ lệ (%)
    $: rawTarget = (parseFloat(item.target) || 0) * (targetRatio / 100);
    // Chia đều cho nhân viên
    $: pTarget = empCount > 0 ? (type === 'soLuong' ? Math.ceil(rawTarget / empCount) : Math.round(rawTarget / empCount)) : 0;
    
    $: formattedTarget = new Intl.NumberFormat('vi-VN').format(pTarget) + (type === 'doanhThu' ? ' Tr' : '');
    $: formattedTotal = new Intl.NumberFormat('vi-VN').format(rawTarget) + (type === 'doanhThu' ? ' Tr' : '');
    
    $: isQty = type === 'soLuong';
    $: bgClass = isQty ? 'bg-orange-50' : 'bg-blue-50';
    $: borderClass = isQty ? 'border-orange-200' : 'border-blue-200';
    $: textClass = isQty ? 'text-orange-700' : 'text-blue-700';
    $: icon = isQty ? 'box' : 'dollar-sign';
    
    $: mappingData = $luykeNameMappings && $luykeNameMappings[item.name];
    $: displayTitle = (typeof mappingData === 'object' && mappingData !== null) ? (mappingData.shortName || item.name) : (mappingData || item.name);
</script>

<div class="flex items-center justify-between p-3.5 rounded-xl border {bgClass} {borderClass} shadow-sm group">
    <div class="flex flex-col flex-1 pr-2 min-w-0 capture-pt-target-name">
        <div class="flex items-center gap-1.5 mb-1 {textClass}">
            <i data-feather={icon} class="w-3.5 h-3.5"></i>
            <span class="text-[9px] font-black uppercase tracking-wider opacity-80">
                {isQty ? 'Số Lượng' : 'Doanh Thu'}
            </span>
        </div>
        <div class="text-[14px] font-bold text-gray-800 line-clamp-2 leading-[1.3] pb-1 capture-pt-title" title={displayTitle}>
            {displayTitle}
        </div>
        <div class="mt-auto pt-1.5">
            <span class="text-[10px] text-gray-500 font-semibold tracking-wide bg-white/60 px-2 py-0.5 rounded border border-black/5 shadow-sm inline-block">
                Tổng: <b class="text-gray-700">{formattedTotal}</b>
            </span>
        </div>
    </div>
    
    <div class="flex flex-col items-end justify-center shrink-0 border-l border-black/10 pl-4 py-2 capture-pt-value-right">
        <span class="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Target 1 NV</span>
        <span class="text-3xl font-black {textClass} leading-[1.1] tracking-tighter drop-shadow-sm capture-pt-value pb-1">
            {formattedTarget}
        </span>
    </div>
</div>