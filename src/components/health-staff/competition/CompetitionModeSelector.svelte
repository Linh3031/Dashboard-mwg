<script>
  import { createEventDispatcher } from 'svelte';
  export let activeView = 'employee'; // 'program' | 'employee'

  const dispatch = createEventDispatcher();

  function setView(view) {
      dispatch('change', view);
  }
</script>

<div class="flex justify-start items-center">
    <div class="flex bg-gray-200 p-1 rounded-lg shadow-inner">
        <button 
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 {activeView === 'employee' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
            on:click={() => setView('employee')}
        >
            Theo Nhân Viên
        </button>
        <button 
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 {activeView === 'program' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
            on:click={() => setView('program')}
        >
            Theo Chương Trình
        </button>
    </div>
</div>