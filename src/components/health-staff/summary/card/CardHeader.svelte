<script>
  import { formatters } from '../../../../utils/formatters.js';
  export let hoTen;
  export let maNV;
  export let boPhan;
  export let rank = 999; // [MỚI] Nhận rank để check Top 3

  // Logic màu tên: Top 3 màu xanh dương đậm, còn lại màu đen xám
  $: nameColorClass = rank <= 3 ? 'text-blue-700 font-extrabold' : 'text-gray-900 font-bold';
</script>

<div class="flex-grow min-w-0 ml-3">
  <p class="{nameColorClass} text-base truncate leading-tight" title="{hoTen} - {maNV}">
    {formatters.getShortEmployeeName(hoTen, maNV)}
  </p>
  <p class="text-xs text-gray-500 truncate">{boPhan}</p>
</div>