<script>
  import { formatters } from '../../../../utils/formatters.js';
  export let hoTen;
  export let maNV;
  // Đã xóa export let boPhan
  export let rank = 999; 

  $: nameColorClass = rank <= 3 ? 'text-blue-700 font-extrabold' : 'text-gray-900 font-bold';

  function truncateTextSimple(text, maxLength = 25) {
      if (!text) return '';
      let cleanName = formatters.getShortEmployeeName(text, maNV);
      if (cleanName.length <= maxLength) return cleanName;
      return cleanName.substring(0, maxLength) + '...';
  }
</script>

<div class="flex-grow min-w-0 ml-3">
  <p class="{nameColorClass} text-base leading-tight overflow-hidden" 
     title="{hoTen} - {maNV}"
     style="height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
    {truncateTextSimple(hoTen, 50)} 
  </p>
  </div>