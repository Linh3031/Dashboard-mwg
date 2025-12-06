<script>
  import { afterUpdate } from 'svelte';
  
  // Import các component con hiện có
  import AdminCategory from './admin/AdminCategory.svelte';
  import AdminSpecialProducts from './admin/AdminSpecialProducts.svelte';
  import AdminCalculation from './admin/AdminCalculation.svelte';
  import AdminMappings from './admin/AdminMappings.svelte';
  import AdminHelp from './admin/AdminHelp.svelte';
  import AdminUserStats from './admin/AdminUserStats.svelte';
  import AdminCompetition from './admin/AdminCompetition.svelte';
  
  // [MỚI] Import Component cấu hình trang chủ
  import AdminHomeConfig from './admin/AdminHomeConfig.svelte';

  export let activeTab;

  $: if (activeTab === 'declaration-section') {
    Promise.resolve().then(() => {
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    });
  }
</script>

<section id="declaration-section" class="page-section {activeTab === 'declaration-section' ? '' : 'hidden'}"> 
    <div class="max-w-5xl mx-auto pb-10">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <i data-feather="settings" class="text-blue-600"></i>
            Khai báo dữ liệu hệ thống
        </h2>
        
        <div class="mb-8">
             <p class="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3">
                <i data-feather="alert-triangle" class="flex-shrink-0 w-5 h-5 text-yellow-600"></i>
                <span>
                    <strong class="block mb-1 font-bold">Khu vực dành cho Quản trị viên:</strong> 
                    Mọi thay đổi tại đây sẽ được đồng bộ lên Cloud (Firestore) và ảnh hưởng trực tiếp đến logic tính toán toàn hệ thống.
                </span>
           </p> 
        </div>

        <div class="space-y-6 mb-8">
            <AdminHomeConfig />
        </div>

        <div class="space-y-6 mb-8">
            <AdminCompetition />
        </div>

        <div class="space-y-6">
            <AdminCategory />
            <AdminSpecialProducts />
        </div>

        <div class="space-y-0 mt-8">
            <h3 class="text-lg font-bold text-gray-700 mb-4 ml-1">Thiết lập Logic & Tính toán</h3>
            <AdminCalculation />
            <AdminMappings />
        </div>

        <div class="space-y-0 mt-8">
            <h3 class="text-lg font-bold text-gray-700 mb-4 ml-1">Hệ thống & Nội dung</h3>
            <AdminHelp />
            <AdminUserStats />
        </div>
    </div>
</section>