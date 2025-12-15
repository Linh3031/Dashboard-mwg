<script>
  import { onMount } from 'svelte';
  import { customRevenueTables, modalState, isAdmin, selectedWarehouse } from '../../stores.js';
  import { adminService } from '../../services/admin.service.js';
  import { datasyncService } from '../../services/datasync.service.js';
  import DynamicRevenueTable from './DynamicRevenueTable.svelte';

  export let reportData = [];

  let isLoading = false;
  // Biến tĩnh (module-level) để ghi nhớ kho đã tải lần cuối cùng component này được mount
  let lastLoadedWarehouse = '';

  // [FIX CRASH] Logic tính toán visibleTables an toàn tuyệt đối
  $: visibleTables = ($customRevenueTables || []).reduce((acc, table, index) => {
      // Chỉ lấy bảng chưa bị ẩn
      if (table.isVisible !== false) {
          acc.push({
              ...table,
              // Nếu id null/undefined, tạo id tạm dựa trên index để Svelte không báo duplicate key
              id: table.id ? table.id : `fallback_render_id_${index}` 
          });
      }
      return acc;
  }, []);

  // [LOGIC MỚI] Khi Kho thay đổi -> Tải lại dữ liệu (Có kiểm tra Cache)
  $: if ($selectedWarehouse) {
      handleWarehouseDataLoad($selectedWarehouse);
  }

  async function handleWarehouseDataLoad(kho) {
      // CASE 1: Dữ liệu đã có trong Store và đúng là của kho hiện tại (hoặc chưa chọn kho specific)
      // -> KHÔNG TẢI LẠI (Instant load)
      if ($customRevenueTables.length > 0 && lastLoadedWarehouse === kho) {
          console.log(`[CategoryView] Dùng Cache Store cho kho: ${kho}`);
          return;
      }

      // CASE 2: Chưa có dữ liệu hoặc đổi kho -> Tiến hành tải
      await loadData(kho);
  }

  async function loadData(kho) {
      console.log(`[CategoryView] Loading tables for warehouse: ${kho}`);
      
      // Chỉ hiện loading nếu Store đang rỗng (tránh chớp nháy khi refresh ngầm)
      if ($customRevenueTables.length === 0) {
          isLoading = true;
      }
      
      try {
          // 1. Tải bảng Hệ thống (Global)
          const systemTables = await adminService.loadSystemRevenueTables();
          
          // 2. Tải bảng Cá nhân (Warehouse Cloud)
          const personalTables = await datasyncService.loadPersonalRevenueTables(kho);

          // 3. Tải Preferences ẩn/hiện (Local)
          const hiddenSystemIds = JSON.parse(localStorage.getItem('hiddenSystemTableIds') || '[]');

          // 4. Merge & Sanitize (Làm sạch dữ liệu)
          const finalSystemTables = (systemTables || []).map((t, index) => ({
              ...t,
              id: t.id || `sys_gen_${index}_${Date.now()}`, 
              isSystem: true,
              isVisible: !hiddenSystemIds.includes(t.id)
          }));

          const safePersonalTables = (personalTables || []).map((t, index) => ({
              ...t,
              id: t.id || `per_gen_${index}_${Date.now()}` 
          }));

          // Cập nhật Store
          customRevenueTables.set([...finalSystemTables, ...safePersonalTables]);
          
          // Ghi nhớ kho đã tải thành công
          lastLoadedWarehouse = kho;

      } catch (e) {
          console.error("[CategoryView] Lỗi tải dữ liệu bảng:", e);
      } finally {
          isLoading = false;
      }
  }

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
  async function savePersonalTables() {
      if (!$selectedWarehouse) return;
      const personalTables = $customRevenueTables.filter(t => !t.isSystem);
      await datasyncService.savePersonalRevenueTables($selectedWarehouse, personalTables);
  }

  function saveHiddenPreferences() {
      const hiddenIds = $customRevenueTables
          .filter(t => t.isSystem && t.isVisible === false)
          .map(t => t.id);
      localStorage.setItem('hiddenSystemTableIds', JSON.stringify(hiddenIds));
  }

  function toggleTableVisibility(id) {
      if (!id || String(id).startsWith('fallback_render_id_')) return;
      customRevenueTables.update(items => items.map(t => t.id === id ? { ...t, isVisible: !t.isVisible } : t));
      savePersonalTables();
      saveHiddenPreferences();
  }

  function editTable(table) {
      if (String(table.id).startsWith('fallback_render_id_')) {
          alert("Bảng này đang bị lỗi dữ liệu, không thể sửa.");
          return;
      }
      if (table.isSystem && !$isAdmin) {
          alert("Bạn không có quyền chỉnh sửa Bảng hệ thống.");
          return;
      }
      modalState.update(s => ({ ...s, activeModal: 'add-revenue-table-modal', payload: table }));
  }

  async function deleteTable(id) {
      if (!id || String(id).startsWith('fallback_render_id_')) {
          customRevenueTables.update(items => items.filter(t => t.id)); 
          return;
      }

      const targetTable = $customRevenueTables.find(t => t.id === id);
      if (!targetTable) return;

      if (targetTable.isSystem) {
          if ($isAdmin) {
               if (!confirm("CẢNH BÁO ADMIN: Xóa bảng HỆ THỐNG này vĩnh viễn?")) return;
              const newTables = $customRevenueTables.filter(t => t.id !== id);
              customRevenueTables.set(newTables);
              await adminService.saveSystemRevenueTables(newTables);
          } else {
              if (!confirm("Ẩn bảng này khỏi màn hình của bạn?")) return;
              customRevenueTables.update(items => items.map(t => t.id === id ? { ...t, isVisible: false } : t));
              saveHiddenPreferences();
          }
      } else {
          if (!confirm("Bạn có chắc muốn xóa bảng này? Hành động này sẽ xóa trên Cloud của kho hiện tại.")) return;
          customRevenueTables.update(items => items.filter(t => t.id !== id));
          await savePersonalTables();
      }
  }

  function openAddModal() {
      if (!$selectedWarehouse) {
          alert("Vui lòng chọn Kho trước khi tạo bảng mới.");
          return;
      }
     modalState.update(s => ({ ...s, activeModal: 'add-revenue-table-modal', payload: null }));
  }

  $: hasAnyData = reportData.length > 0;
  const colors = ['blue', 'green', 'orange', 'purple', 'teal', 'indigo', 'rose'];
  const getColor = (index) => colors[index % colors.length];
</script>

{#if isLoading}
    <div class="flex flex-col items-center justify-center p-12 text-blue-500">
        <svg class="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-sm font-semibold">Đang tải cấu hình bảng...</p>
    </div>
{:else}

    {#if $customRevenueTables.length > 0}
    <div class="mb-6 flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div class="text-xs font-bold uppercase text-gray-500 mr-2 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Bảng hiển thị:
        </div>
        {#each $customRevenueTables as table, index}
            <button 
                class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all 
                    duration-200 flex items-center gap-1.5 select-none
                    {table.isVisible !== false ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}
                    {table.isSystem ? 'border-dashed' : ''}"
                on:click={() => toggleTableVisibility(table.id || `fallback_render_id_${index}`)}
                title={table.isSystem ? "Bảng hệ thống" : "Bảng cá nhân"}
            >
                {#if table.isSystem}<span class="text-[10px] mr-0.5 opacity-70">🌐</span>{/if}
                {table.title || '(Không tên)'}
            </button>
        {/each}
        <button class="px-3 py-1.5 rounded-full text-xs font-bold border 
    border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors ml-auto flex items-center gap-1" on:click={openAddModal}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Tạo mới
        </button>
    </div>
    {/if}

    {#if !hasAnyData}
        <div class="p-12 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed">
            <p class="text-gray-500 font-medium">Chưa có dữ liệu báo cáo nhân viên.</p>
        </div>
    {:else if $customRevenueTables.length === 0}
        <div class="p-12 text-center bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col items-center">
            <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 
    0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h4 class="text-lg font-bold text-gray-800 mb-2">Chưa có Bảng báo cáo nào</h4>
            <p class="text-gray-500 mb-6 max-w-md">Bạn chưa tạo bảng theo dõi nào.</p>
            <button class="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2" on:click={openAddModal}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                Tạo bảng ngay
            </button>
        </div>
    {:else if visibleTables.length === 0}
        <div class="p-12 text-center bg-gray-50 rounded-xl border border-gray-200">
            <p class="text-gray-500 font-medium">Bạn đã ẩn tất cả các bảng. Vui 
    lòng bật lại trên thanh công cụ.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
            {#each visibleTables as table, index (table.id)}
                <div data-capture-group="category-revenue">
                    <DynamicRevenueTable 
                        config={table}
                        {reportData}
                        colorTheme={getColor(index)}
                        on:edit={() => editTable(table)}
                        on:delete={() => deleteTable(table.id)}
                    />
                </div>
            {/each}
        </div>
    {/if}

{/if}