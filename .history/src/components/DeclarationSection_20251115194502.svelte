<script>
  import { afterUpdate } from 'svelte';
  
  // Nhận 'activeTab' từ App.svelte
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
    <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Khai báo dữ liệu</h2> 
    <div class="content-card"> 
        <p class="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg mb-4">Lưu ý: Dữ liệu khai báo tại đây sẽ được lưu vào trình duyệt và sử dụng cho các logic tính toán. Chỉnh sửa và nhấn "Lưu" để cập nhật.</p> 
        <div class="space-y-0">  
            <details class="declaration-group" open> 
                <summary>Khai báo Danh mục & Cấu trúc</summary> 
                <div class="declaration-content"> 
                    </div>
            </details>
            <details class="declaration-group"> 
                <summary>Khai báo Sản Phẩm Đặc Quyền</summary> 
                <div class="declaration-content"> 
                    </div>
            </details>
            <details class="declaration-group"> 
                <summary>Dữ liệu tính toán</summary> 
                <div class="declaration-content"> 
                    </div>
            </details>
            </div> 
    </div> 
</section>

<style>
    .declaration-group {
        border-bottom: 1px solid #e5e7eb; /* gray-200 */
    }
    .declaration-group:last-child {
        border-bottom: none;
    }
    .declaration-group summary {
        display: flex;
        justify-content: space-between; 
        align-items: center; 
        padding: 1rem 0.5rem; 
        cursor: pointer; 
        font-size: 1.125rem; /* text-lg */ 
        font-weight: 700; /* font-bold */ 
        color: #374151; /* gray-700 */ 
        list-style: none; /* Hide default marker */
    }
    .declaration-group summary::-webkit-details-marker {
        display: none; /* Hide default marker for Chrome */
    }
    .declaration-group summary:hover {
        background-color: #f9fafb; /* gray-50 */
    }
    .declaration-group summary::after {
        content: '+'; 
        font-size: 1.5rem;
        font-weight: 500; 
        color: #6b7280; /* gray-500 */ 
        transition: transform 0.2s ease-in-out;
    }
    .declaration-group[open] > summary::after {
        transform: rotate(45deg);
        content: '×';
    }
    .declaration-content {
        padding: 1rem 0.5rem 1.5rem 0.5rem;
    }
</style>