<script>
  import { afterUpdate, tick } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName, getRandomBrightColor } from '../../../utils.js';

  export let items = []; // Ngành hàng chi tiết
  export let unexportedItems = []; // Danh sách chưa xuất

  // --- STATE ---
  let showUnexported = false;
  let viewMode = 'grid'; // 'grid' | 'chart' | 'table'
  let sortMode = 'revenue_desc';
  let searchText = '';
  
  let chartInstancePie = null;

  // --- LOGIC TITLE & THEME ---
  $: titleText = showUnexported 
      ? "CHI TIẾT CHƯA XUẤT (QĐ)" 
      : "CHI TIẾT NGÀNH HÀNG";
  
  $: titleIcon = showUnexported ? "alert-circle" : "layers";
  $: titleClass = showUnexported ? "text-red-700" : "text-blue-700";
  $: iconClass = showUnexported ? "text-red-600" : "text-blue-600";

  // Hàm chọn màu/icon cho thẻ (Copy từ Luyke)
  function getCategoryTheme(name) {
      const n = name.toLowerCase();
      if (n.includes('điện tử') || n.includes('tivi')) return { icon: 'tv', theme: 'theme-teal' };
      if (n.includes('máy giặt') || n.includes('sấy')) return { icon: 'disc', theme: 'theme-blue' };
      if (n.includes('máy lạnh') || n.includes('điều hòa')) return { icon: 'wind', theme: 'theme-blue' };
      if (n.includes('tủ lạnh') || n.includes('tủ đông')) return { icon: 'server', theme: 'theme-blue' };
      if (n.includes('lọc nước')) return { icon: 'droplet', theme: 'theme-blue' };
      if (n.includes('laptop') || n.includes('pc')) return { icon: 'monitor', theme: 'theme-teal' };
      if (n.includes('điện thoại') || n.includes('smartphone')) return { icon: 'smartphone', theme: 'theme-blue' };
      if (n.includes('gia dụng') || n.includes('bếp')) return { icon: 'home', theme: 'theme-orange' };
      if (n.includes('phụ kiện')) return { icon: 'headphones', theme: 'theme-purple' };
      if (n.includes('đồng hồ')) return { icon: 'watch', theme: 'theme-gray' };
      return { icon: 'tag', theme: 'theme-gray' };
  }

  // --- DATA LOGIC ---
  $: sourceData = showUnexported ? unexportedItems : items;

  $: filteredItems = sourceData.filter(item => {
      const name = item.name || item.nganhHang || '';
      const matchSearch = !searchText || name.toLowerCase().includes(searchText.toLowerCase());
      const hasValue = showUnexported ? (item.doanhThuQuyDoi > 0) : (item.revenue > 0 || item.quantity > 0);
      return matchSearch && hasValue;
  });

  $: sortedItems = [...filteredItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      
      if (sortMode === 'revenue_desc') return getRev(b) - getRev(a);
      if (sortMode === 'quantity_desc') return getQty(b) - getQty(a);
      return 0;
  });

  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || 0) : (item.revenue || 0)), 0);
  $: maxVal = Math.max(...sourceData.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);

  // --- CHART ---
  async function renderChart() {
      if (typeof Chart === 'undefined') return;
      await tick();
      const ctx = document.getElementById('rt-cat-chart');
      if (!ctx) return;
      if (chartInstancePie) chartInstancePie.destroy();

      const top10 = sortedItems.slice(0, 10);
      
      chartInstancePie = new Chart(ctx, {
          type: 'doughnut',
          data: {
              labels: top10.map(d => d.name || d.nganhHang),
              datasets: [{
                  data: top10.map(d => showUnexported ? d.doanhThuQuyDoi : d.revenue),
                  backgroundColor: top10.map(() => getRandomBrightColor()),
                  borderWidth: 1
              }]
          },
          options: { 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { position: 'right' } } 
          }
      });
  }

  $: if (viewMode === 'chart') setTimeout(renderChart, 0);

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="luyke-widget h-full">
    <div class="luyke-toolbar">
        <div class="luyke-toolbar-left flex-grow min-w-0">
            <h3 class="text-base sm:text-lg font-bold uppercase flex items-center gap-2 {titleClass} truncate">
                <i data-feather={titleIcon} class="{iconClass} flex-shrink-0"></i>
                <span class="truncate">{titleText}</span>
            </h3>
        </div>

        <div class="luyke-toolbar-right flex items-center gap-2">
            <div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button class="view-mode-btn {viewMode === 'grid' ? 'active' : ''}" on:click={() => viewMode = 'grid'} title="Thẻ">
                    <i data-feather="grid" class="w-4 h-4"></i>
                </button>
                <button class="view-mode-btn {viewMode === 'table' ? 'active' : ''}" on:click={() => viewMode = 'table'} title="Bảng">
                    <i data-feather="list" class="w-4 h-4"></i>
                </button>
                <button class="view-mode-btn {viewMode === 'chart' ? 'active' : ''}" on:click={() => viewMode = 'chart'} title="Biểu đồ">
                    <i data-feather="pie-chart" class="w-4 h-4"></i>
                </button>
            </div>

            <div 
                class="toggle-wrapper {showUnexported ? 'active' : ''}" 
                on:click={() => showUnexported = !showUnexported}
                title="Xem đơn hàng chưa xuất"
                style="padding: 4px 8px;"
            >
                <div class="toggle-switch" style="width: 28px; height: 16px;"></div>
                <span class="toggle-label text-xs whitespace-nowrap">Chưa xuất</span>
            </div>

            <div class="hidden sm:block">
                <input type="text" placeholder="Tìm nhanh..." class="luyke-search-input" style="width: 120px;" bind:value={searchText} />
            </div>
        </div>
    </div>

    <div class="luyke-widget-body bg-white border-t border-gray-100 p-4">
        {#if sortedItems.length === 0}
            <div class="text-center py-10 text-gray-400 italic">Không có dữ liệu hiển thị.</div>
        
        {:else if viewMode === 'grid'}
            <div class="luyke-cat-grid">
                {#each sortedItems as item}
                    {@const name = item.name || item.nganhHang}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const style = getCategoryTheme(name)}
                    {@const percent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
                    {@const finalTheme = showUnexported ? 'theme-warning' : style.theme}

                    <div class="cat-card-colorful {finalTheme}">
                        <div class="cat-top-row">
                            <div class="cat-icon-box"><i data-feather={style.icon} class="w-5 h-5"></i></div>
                            {#if !showUnexported && totalRevenue > 0}
                                <span class="cat-percent-text text-xs">{formatters.formatPercentage(revenue/totalRevenue)}</span>
                            {/if}
                        </div>
                        <h4 class="cat-name-text" title={name}>{name}</h4>
                        <div class="cat-value-text">{formatters.formatRevenue(revenue, 0)}</div>
                        <div class="cat-footer-row">
                            <span>SL: <strong>{formatters.formatNumber(quantity)}</strong></span>
                        </div>
                        <div class="cat-bar-bg"><div class="cat-bar-fill" style="width: {percent}%"></div></div>
                    </div>
                {/each}
            </div>

        {:else if viewMode === 'table'}
            <div class="overflow-x-auto">
                <table class="w-full text-sm table-bordered">
                    <thead class="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th class="px-3 py-2 text-left">Ngành hàng</th>
                            <th class="px-3 py-2 text-right">SL</th>
                            <th class="px-3 py-2 text-right">Doanh thu</th>
                            {#if showUnexported}<th class="px-3 py-2 text-right">DT Thực</th>{/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each sortedItems as item}
                            <tr class="hover:bg-gray-50">
                                <td class="px-3 py-2">{item.name || item.nganhHang}</td>
                                <td class="px-3 py-2 text-right font-bold">{formatters.formatNumber(showUnexported ? item.soLuong : item.quantity)}</td>
                                <td class="px-3 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(showUnexported ? item.doanhThuQuyDoi : item.revenue)}</td>
                                {#if showUnexported}
                                    <td class="px-3 py-2 text-right text-gray-500">{formatters.formatRevenue(item.doanhThuThuc)}</td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

        {:else}
            <div class="h-[350px] w-full relative">
                <canvas id="rt-cat-chart"></canvas>
            </div>
        {/if}
    </div>
</div>