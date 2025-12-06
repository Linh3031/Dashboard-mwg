<script>
  import { formatters } from '../../../../utils/formatters.js';
  export let hoTen;
  export let maNV;
  export let boPhan;
</script>

<div class="flex-grow min-w-0 ml-3">
  <p class="font-bold text-gray-900 text-base truncate leading-tight" title="{hoTen} - {maNV}">
    {formatters.getShortEmployeeName(hoTen, maNV)}
  </p>
  <p class="text-xs text-gray-500 truncate">{boPhan}</p>
</div>