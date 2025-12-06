<script>
  export let isAbove = false;
</script>

<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide {isAbove ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
  {isAbove ? 'Trên TB' : 'Dưới TB'}
</span>