<script>
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let key = '';           // Key định danh cột
  export let label = '';         // Tên hiển thị
  export let sortKey = '';       // Cột đang được sort
  export let sortDirection = 'desc'; // Hướng sort
  export let align = 'left';     // Căn lề: left, right, center
  export let className = '';     // Class tùy chỉnh thêm (vd: sticky, width)

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('sort', key);
  }

  $: isActive = sortKey === key;
  
  // Logic căn lề flexbox
  $: alignClass = align === 'right' ? 'justify-end' : 
                  align === 'center' ? 'justify-center' : 
                  'justify-start';

  // Logic căn lề text
  $: textAlignClass = align === 'right' ? 'text-right' : 
                      align === 'center' ? 'text-center' : 
                      'text-left';
</script>

<th 
  class="px-4 py-3 cursor-pointer transition select-none hover:bg-slate-200 {textAlignClass} {className} {isActive ? 'bg-blue-50' : ''}"
  on:click={handleClick}
  role="columnheader"
  aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
>
  <div class="flex items-center gap-1 {alignClass}">
    <span class="font-bold uppercase text-xs {isActive ? 'text-blue-800' : 'text-slate-700'}">
      {label}
    </span>
    
    <span class="flex flex-col items-center justify-center w-4 h-4">
      {#if !isActive}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      {:else if sortDirection === 'asc'}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      {/if}
    </span>
  </div>
</th>