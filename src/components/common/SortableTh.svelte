<script>
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let key = '';           
  export let label = '';         
  export let sortKey = '';       
  export let sortDirection = 'desc'; 
  export let align = 'left';     
  export let className = '';     
  
  // [GENESIS SURGERY] Hứng mã màu Hex từ bảng cha
  export let themeColor = ''; 

  const dispatch = createEventDispatcher();
  function handleClick() { dispatch('sort', key); }

  $: isActive = sortKey === key;
  $: alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  $: textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  // [MAGIC TRICK]: Tự động pha màu nền từ mã Hex
  $: safeColor = themeColor ? String(themeColor).trim() : '';
  $: isValidHex = safeColor.startsWith('#') && (safeColor.length === 7 || safeColor.length === 4);
  
  // 1A = ~10% opacity | 26 = ~15% opacity
  $: customBg = isValidHex ? `background-color: ${safeColor}${isActive ? '26' : '1A'};` : '';
  $: customText = isValidHex ? `color: ${safeColor};` : '';
</script>

<th 
  class="px-4 py-3 cursor-pointer transition-all duration-200 select-none {textAlignClass} {className} {!isValidHex ? (isActive ? 'bg-blue-50' : 'hover:bg-slate-100') : 'hover:brightness-95'}"
  style={customBg}
  on:click={handleClick}
  role="columnheader"
  aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
>
  <div class="flex items-center gap-1.5 {alignClass}">
    <span 
      class="font-bold uppercase text-[13px] {!isValidHex ? (isActive ? 'text-blue-800' : 'text-slate-700') : ''}"
      style={customText}
    >
      {label}
    </span>
    
    <span class="flex flex-col items-center justify-center w-4 h-4">
      {#if !isActive}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-40 transition-opacity hover:opacity-100" style={customText} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      {:else if sortDirection === 'asc'}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" style={customText || 'color: #1e40af;'} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" style={customText || 'color: #1e40af;'} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      {/if}
    </span>
  </div>
</th>