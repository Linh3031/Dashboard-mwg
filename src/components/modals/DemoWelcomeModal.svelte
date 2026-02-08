<script>
  import { onMount } from 'svelte';
  // Không cần import store hay service phức tạp nữa
  
  let showModal = false;

  onMount(() => {
    const hasData = localStorage.getItem('danhSachNhanVien'); 
    const isDemo = localStorage.getItem('isDemoMode') === 'true';
    
    // Nếu chưa có dữ liệu và chưa phải demo thì hiện modal
    if (!hasData && !isDemo) {
      showModal = true;
    }
  });

  function startDemo() {
    // 1. Bật cờ Demo lưu vào LocalStorage
    localStorage.setItem('isDemoMode', 'true');

    // 2. [QUAN TRỌNG] Reload trang ngay lập tức
    // Việc này buộc App.svelte chạy lại từ đầu (Cold Start)
    // Giúp tránh lỗi treo máy và đảm bảo dữ liệu được nạp sạch sẽ
    window.location.reload();
  }

  function skipDemo() {
    showModal = false;
    localStorage.setItem('hasSkippedDemo', 'true');
  }
</script>

{#if showModal}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
  <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-100">
    <div class="mb-6 flex justify-center">
       <div class="p-4 bg-blue-50 rounded-full">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
       </div>
    </div>
    
    <h2 class="text-2xl font-bold text-gray-800 mb-2">Chào mừng bạn!</h2>
    <p class="text-gray-500 mb-8 leading-relaxed">
      Hệ thống phát hiện bạn chưa có dữ liệu.
      Bạn có muốn sử dụng <b>Dữ liệu Mẫu (Demo)</b> để trải nghiệm ngay các tính năng không?
    </p>

    <div class="flex flex-col gap-3">
      <button 
        on:click={startDemo}
        class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
      >
        <span>🚀</span> Trải nghiệm Demo ngay
      </button>
      
      <button 
        on:click={skipDemo}
        class="w-full py-3 px-4 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl transition-colors"
      >
        Không, tôi sẽ tự nhập liệu
      </button>
    </div>
  </div>
</div>
{/if}