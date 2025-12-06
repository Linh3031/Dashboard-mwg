<script>
  import { notificationStore } from '../../stores.js';
</script>

{#if $notificationStore.visible}
  <div 
    class="fixed bottom-5 right-5 p-4 rounded-lg shadow-md text-white z-[1200] transition-all duration-500 transform translate-y-0
           {$notificationStore.type === 'success' ? 'bg-green-500' : 'bg-red-500'}"
    role="alert"
  >
    {$notificationStore.message}
  </div>
{/if}