<script>
  // Version 3.2 - Fix Timeline Jump Loop & Maintain Layout Stability
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { homeConfig } from '../stores.js';
  import { adminService } from '../services/admin.service.js';
  import { analyticsService } from '../services/analytics.service.js';
  import { formatters } from '../utils/formatters.js';

  export let activeTab;

  let slideIndex = 0;
  let slideInterval;
  let showQRModal = false;
  // [GENESIS]: LINK TẢI BOOKMARK
  const bookmarkUrl = 'https://firebasestorage.googleapis.com/v0/b/qlst-9e6bd.firebasestorage.app/o/templates%2FShare_QLST.zip?alt=media&token=5ea0dd5b-9126-4fdc-b2a2-b01ac4de812c';
  let stats = {
      totalUsers: 0,
      totalVisits: 0,
      totalActions: 0
  };
  
  // Cấu hình mặc định
  let config = {
      videoUrl: 'https://www.youtube.com/embed/bmImlht_yB4',
      timeline: [],
      sliderImages: [],
      changelogs: []
  };

  // [CODEGENESIS FIX START] --- Cấu hình ảnh Local ---
  const localImages = [
      { title: "Sức khỏe siêu thị", url: "/images/slides/suc-khoe-sieu-thi.png" },
      { title: "Chi tiết ngành hàng", url: "/images/slides/Chi-tiet-nganh-hang.png" },
      { title: "Biểu đồ tỷ trọng ngành hàng", url: "/images/slides/Bieu-do.png" },
      { title: "Thi đua siêu thị lũy kế", url: "/images/slides/thi-dua-st.png" },
      { title: "Tiền thưởng thi đua vùng", url: "/images/slides/thi-dua-vung.png" }
  ];

  // Reactive config sync
  $: config = {
      ...($homeConfig || config),
      sliderImages: localImages
  };

  // --- LOGIC XỬ LÝ VIDEO & TIMELINE (FIXED) ---
  
  // 1. Hàm trích xuất ID Video chuẩn xác
  function getVideoId(url) {
      if (!url) return '';
      if (url.includes('/embed/')) {
          return url.split('/embed/')[1].split('?')[0];
      } else if (url.includes('v=')) {
          return url.split('v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
          return url.split('youtu.be/')[1].split('?')[0];
      }
      return '';
  }

  // 2. Hàm làm sạch URL để hiển thị mặc định
  function getSafeVideoUrl(url) {
      const id = getVideoId(url);
      return id ? `https://www.youtube.com/embed/${id}` : '';
  }

  // 3. Biến quản lý trạng thái Override (Khi user bấm jump)
  let overrideUrl = '';
  let lastVideoId = '';

  // 4. Theo dõi thay đổi của Config để Reset override nếu video gốc đổi
  $: {
      const currentId = getVideoId(config.videoUrl);
      if (currentId && currentId !== lastVideoId) {
          lastVideoId = currentId;
          overrideUrl = ''; // Reset trạng thái jump khi video chính thay đổi
      }
  }

  // 5. URL cuối cùng được đưa vào Iframe (Ưu tiên overrideUrl nếu có)
  $: finalVideoSrc = overrideUrl || getSafeVideoUrl(config.videoUrl);


  function jumpToTime(timeStr) {
      const parts = timeStr.split(':');
      let seconds = 0;
      if (parts.length === 2) {
         seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else {
          seconds = parseInt(timeStr);
      }
      
      const videoId = getVideoId(config.videoUrl);
      
      // [FIX]: Thay vì sửa config (gây loop), ta sửa biến cục bộ overrideUrl
      if (videoId) {
          // Thêm autoplay=1 và rel=0 để trải nghiệm tốt nhất
          overrideUrl = `https://www.youtube.com/embed/${videoId}?start=${seconds}&autoplay=1&rel=0`;
      }
  }
  // ----------------------------------------------------

  onMount(async () => {
      adminService.loadHomeConfig();
      startSlideShow();
      const data = await analyticsService.getSystemStats();
      if (data) stats = data;
  });

  onDestroy(() => {
      stopSlideShow();
  });

  $: if (activeTab === 'home-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') window.feather.replace();
    });
  }

  function startSlideShow() {
      stopSlideShow();
      slideInterval = setInterval(() => {
          if (config.sliderImages.length > 1) {
              slideIndex = (slideIndex + 1) % config.sliderImages.length;
          }
      }, 5000);
  }

  function stopSlideShow() {
      if (slideInterval) clearInterval(slideInterval);
  }

  function nextSlide() {
      stopSlideShow();
      if (config.sliderImages.length > 0) {
          slideIndex = (slideIndex + 1) % config.sliderImages.length;
      }
      startSlideShow();
  }

  function prevSlide() {
      stopSlideShow();
      if (config.sliderImages.length > 0) {
          slideIndex = (slideIndex - 1 + config.sliderImages.length) % config.sliderImages.length;
      }
      startSlideShow();
  }
</script>

<section id="home-section" class="page-section {activeTab === 'home-section' ? '' : 'hidden'}">
     <div class="page-header">
         <div class="flex items-center gap-4">
             <h2 class="page-header__title">Hướng Dẫn & Góp Ý</h2> 
             
             <button 
                class="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-sm text-sm font-bold"
                on:click={() => showQRModal = true}
             >
                <i data-feather="message-circle" class="w-4 h-4"></i>
                Nhóm Line hỗ trợ
             </button>

             <a 
                href={bookmarkUrl}
                target="_blank"
                download
                class="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition shadow-sm text-sm font-bold no-underline"
                title="Tải bộ bookmark mẫu"
             >
                <i data-feather="download" class="w-4 h-4"></i>
                Tải Bookmark
             </a>
        </div>

         <div id="usage-counter-display" class="text-sm font-medium bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex gap-4 text-gray-600"> 
            <span>Người dùng: <strong class="text-blue-600">{formatters.formatNumber(stats.totalUsers)}</strong></span>
            <span class="border-l pl-4">Lượt truy cập: <strong class="text-green-600">{formatters.formatNumber(stats.totalVisits)}</strong></span>
            <span class="border-l pl-4">Lượt sử dụng: <strong class="text-purple-600">{formatters.formatNumber(stats.totalActions)}</strong></span>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="lg:col-span-2 content-card !p-0 overflow-hidden flex flex-col shadow-lg border-0">
            <div class="relative w-full" style="padding-top: 56.25%;"> 
                {#key finalVideoSrc}
                    <iframe
                        class="absolute top-0 left-0 w-full h-full"
                        src={finalVideoSrc}
                        title="Hướng dẫn sử dụng"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                    ></iframe>
                {/key}
            </div>
        </div>

        <div class="relative w-full lg:h-auto h-[400px]">
            <div class="content-card flex flex-col !mb-0 bg-white border border-gray-200 lg:absolute lg:inset-0 w-full h-full">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 shrink-0">
                     <i data-feather="list" class="text-blue-600"></i> Mục lục Video
                </h3>
                
                <div class="flex-grow overflow-y-auto pr-2 custom-scrollbar min-h-0 space-y-2">
                   {#if config.timeline && config.timeline.length > 0}
                       {#each config.timeline as item}
                           <button 
                                class="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition flex items-start gap-3 group border border-transparent hover:border-blue-100"
                                on:click={() => jumpToTime(item.time)}
                          >
                                <span class="bg-blue-100 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                     {item.time}
                                </span>
                                <span class="text-sm text-gray-700 font-medium group-hover:text-blue-800 line-clamp-2">
                                     {item.label}
                                </span>
                            </button>
                        {/each}
                    {:else}
                       <p class="text-sm text-gray-400 italic text-center py-4">Chưa có mục lục.</p>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="content-card flex flex-col h-[600px]">
            <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <i data-feather="image" class="text-blue-600"></i> Các chức năng dự án
             </h3>
            <div class="flex-grow relative group overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center">
                {#if config.sliderImages && config.sliderImages.length > 0}
                     {#each config.sliderImages as img, i}
                         <div 
                              class="absolute inset-0 transition-opacity duration-700 ease-in-out {i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}"
                        >
                            <img 
                                src={img.url} 
                                alt={img.title} 
                                class="w-full h-full object-contain"
                            >
                               <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
                                <h3 class="text-white font-bold text-lg drop-shadow-md">{img.title}</h3>
                             </div>
                           </div>
                    {/each}

                    <button class="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20 opacity-0 group-hover:opacity-100 transition" on:click={prevSlide}>
                        <i data-feather="chevron-left"></i>
                    </button>
                     <button class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20 opacity-0 group-hover:opacity-100 transition" on:click={nextSlide}>
                        <i data-feather="chevron-right"></i>
                    </button>
                     
                    <div class="absolute bottom-3 right-4 flex gap-2 z-20">
                        {#each config.sliderImages as _, i}
                             <div class="w-2 h-2 rounded-full transition-colors {i === slideIndex ? 'bg-white' : 'bg-white/40'}"></div>
                        {/each}
                    </div>
                {:else}
                    <div class="text-white/50 flex flex-col items-center">
                         <i data-feather="image" class="w-10 h-10 mb-2"></i>
                        <p>Chưa có ảnh slide.</p>
                     </div>
                {/if}
            </div>
         </div>

        <div class="content-card flex flex-col h-[600px] bg-slate-50">
            <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <i data-feather="clock" class="text-green-600"></i> Lịch sử cập nhật
            </h3>
            <div class="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-4">
                 {#if config.changelogs && config.changelogs.length > 0}
                   {#each config.changelogs as log}
                        <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div class="mb-3 border-b border-gray-100 pb-2">
                                  <span class="text-lg font-bold text-blue-700">Phiên bản {log.version} <span class="text-gray-500 font-medium text-sm ml-1">({log.date})</span></span>
                            </div>
                            <div class="text-sm text-gray-700 leading-relaxed changelog-content">
                                 {@html log.content}
                            </div>
                        </div>
                   {/each}
                {:else}
                    <p class="text-gray-500 italic text-center py-10">Chưa có thông tin cập nhật.</p>
                {/if}
            </div>
        </div>
    </div>
</section>

{#if showQRModal}
   <div 
         class="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center backdrop-blur-sm p-4"
        on:click={() => showQRModal = false}
        role="button"
        tabindex="0"
    >
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center relative animate-fade-in" on:click|stopPropagation>
            <button class="absolute top-4 right-4 text-gray-400 hover:text-red-500" on:click={() => showQRModal = false}>
                <i data-feather="x" class="w-6 h-6"></i>
            </button>
            
            <h3 class="text-xl font-bold text-green-600 mb-2">Quét mã tham gia nhóm</h3>
            <p class="text-sm text-gray-500 mb-6">Sử dụng camera hoặc Line để quét</p>
            
             <div class="bg-gray-100 p-4 rounded-xl inline-block mb-4">
                 <img 
                    src="/images/qr-line-group.jpg" 
                    alt="Mã QR Nhóm Line" 
                    class="w-48 h-48 object-contain rounded-lg"
                    on:error={(e) => e.target.src = 'https://placehold.co/200x200?text=QR+Code+Here'}
                >
            </div>
            
            <p class="text-xs text-gray-400">Giải đáp thắc mắc hoặc yêu cầu thêm tính năng</p>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    /* Style cho nội dung HTML trong Changelog */
    :global(.changelog-content ul) {
        list-style-type: disc;
        padding-left: 1.5rem;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
    }
    :global(.changelog-content li) {
        margin-bottom: 0.25rem;
    }
    :global(.changelog-content strong), :global(.changelog-content b) {
        color: #1f2937; /* gray-800 */
        font-weight: 700;
    }
    :global(.changelog-content p) {
        margin-bottom: 0.5rem;
    }
</style>