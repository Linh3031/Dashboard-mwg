<script>
  import { onMount, afterUpdate } from 'svelte';
  
  export let activeTab;

  $: if (activeTab === 'home-section') {
    Promise.resolve().then(() => {
      // SỬA LỖI: Thêm 'window.'
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
</script>

<section id="home-section" class="page-section {activeTab === 'home-section' ? '' : 'hidden'}">
    <div class="page-header">
        <h2 class="page-header__title">Hướng Dẫn & Góp Ý</h2> 
        <div id="usage-counter-display" class="text-sm font-semibold"> 
           <span class="text-blue-600">Người dùng:</span> 
           <span id="user-count" class="text-red-600 font-bold">-</span> 
           <span class="text-blue-600 ml-4">Lượt truy cập:</span> 
           <span id="visitor-count" class="text-red-600 font-bold">-</span> 
           <span class="text-blue-600 ml-4">Lượt sử dụng:</span> 
           <span id="action-count" class="text-red-600 font-bold">-</span> 
       </div>
   </div>

   <div class="content-card">
       <h3 class="content-card__header">Video Hướng Dẫn Sử Dụng Nhanh</h3> 
       <div id="video-container" class="bg-gray-200 rounded-lg"> 
           <iframe
               class="w-full h-full aspect-video" 
               src="https://www.youtube.com/embed/bmImlht_yB4?si=iIo9NZ7wc9FvKZKf" 
               title="YouTube video player" 
               frameborder="0" 
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
               allowfullscreen> 
           </iframe>
        </div> 
   </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8"> 
       <div class="flex flex-col"> 
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Góp ý & Thảo luận</h2> 
           <div id="feedback-composer" class="bg-white rounded-xl shadow-md p-6 border border-gray-200 flex-grow"> 
           </div> 
       </div>

       <div class="flex flex-col"> 
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Danh sách góp ý</h2> 
            <div id="feedback-list-container" class="bg-white rounded-xl shadow-md p-6 border border-gray-200 flex-grow"> 
               <div id="feedback-list" class="space-y-6"> 
               </div> 
            </div>
       </div>
   </div> 

    <div class="mt-12"> 
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Lịch sử cập nhật</h2> 
        <div id="update-history-list" class="space-y-6"> 
        </div> 
   </div>
</section>

<style>
    #video-container iframe {
        aspect-ratio: 16 / 9;
        width: 100%;
        height: auto;
        border-radius: 0.5rem;
    }
</style>