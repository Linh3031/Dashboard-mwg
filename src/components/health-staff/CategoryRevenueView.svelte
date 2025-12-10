<script>
  import { onMount } from 'svelte';
  import { customRevenueTables, modalState, isAdmin } from '../../stores.js';
  import { adminService } from '../../services/admin.service.js';
  import CategoryRevenueTable from './CategoryRevenueTable.svelte';

  export let reportData = [];

  $: tables = $customRevenueTables || [];
  $: visibleTables = tables.filter(t => t.isVisible !== false);

  onMount(async () => {
      const systemTables = await adminService.loadSystemRevenueTables();
      const localSaved = localStorage.getItem('customRevenueTables');
      let userTables = [];
      if (localSaved) {
          try { userTables = JSON.parse(localSaved).filter(t => !t.isSystem); } catch(e) {}
      }
      customRevenueTables.set([...systemTables, ...userTables]);
  });

  function saveLocal() {
      localStorage.setItem('customRevenueTables', JSON.stringify($customRevenueTables));
  }

  function toggleTableVisibility(id) {
      customRevenueTables.update(items => items.map(t => t.id === id ? { ...t, isVisible: !t.isVisible } : t));
      saveLocal();
  }

  function editTable(table) {
      if (table.isSystem && !$isAdmin) return; 
      modalState.update(s => ({ ...s, activeModal: 'add-revenue-table-modal', payload: table }));
  }

  async function deleteTable(id) {
      if(!confirm("Bạn có chắc muốn xóa bảng này?")) return;
      const targetTable = $customRevenueTables.find(t => t.id === id);
      customRevenueTables.update(items => items.filter(t => t.id !== id));
      saveLocal();

      if (targetTable?.isSystem && $isAdmin) {
          await adminService.saveSystemRevenueTables($customRevenueTables);
      }
  }

  function openAddModal() {
      modalState.update(s => ({ ...s, activeModal: 'add-revenue-table-modal', payload: null }));
  }

  $: hasAnyData = reportData.length > 0;
  const colors = ['blue', 'green', 'orange', 'purple', 'teal', 'indigo', 'rose'];
  const getColor = (index) => colors[index % colors.length];
</script>

{#if tables.length > 0}
<div class="mb-6 flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
    <div class="text-xs font-bold uppercase text-gray-500 mr-2 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
        Bảng hiển thị:
    </div>
    {#each tables as table}
        <button 
            class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 select-none
                   {table.isVisible !== false ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}"
            on:click={() => toggleTableVisibility(table.id)}
        >
            {table.title}
        </button>
    {/each}
    <button class="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors ml-auto flex items-center gap-1" on:click={openAddModal}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Tạo mới
    </button>
</div>
{/if}

{#if !hasAnyData}
    <div class="p-12 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed">
         <p class="text-gray-500 font-medium">Chưa có dữ liệu báo cáo nhân viên.</p>
    </div>
{:else if tables.length === 0}
    <div class="p-12 text-center bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col items-center">
         <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
         <p class="text-gray-500 font-medium">Bạn đã ẩn tất cả các bảng. Vui lòng bật lại trên thanh công cụ.</p>
    </div>
{:else}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
        {#each visibleTables as table, index (table.id)}
            <div data-capture-group="category-revenue">
                <CategoryRevenueTable 
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