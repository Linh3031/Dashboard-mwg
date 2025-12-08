<script>
  import { afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';

  export let items = [];
  
  const iconMap = {
      'pctPhuKien': 'headphones', 'pctGiaDung': 'home', 'pctMLN': 'droplet',
      'pctSim': 'cpu', 'pctVAS': 'layers', 'pctBaoHiem': 'shield', 'tyLeTraCham': 'credit-card'
  };

  function getProgressColor(val, target) {
      const t = (target || 0) / 100;
      if (t === 0) return '#3b82f6';
      return val >= t ? '#22c55e' : '#ef4444';
  }

  afterUpdate(() => {
    if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="luyke-widget h-full">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-blue-100 rounded text-blue-600 mr-2">
          <i data-feather="bar-chart-2" class="w-4 h-4"></i>
      </div>
      <span>Hiệu Quả Khai Thác</span>
    </div>
  </div>

  <div class="luyke-widget-body custom-scrollbar">
    {#if items.length === 0}
       <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <p class="text-sm">Chưa có dữ liệu.</p>
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each items as item}
          {@const targetVal = (item.target || 0) / 100}
          {@const color = getProgressColor(item.value, item.target)}
          {@const percent = Math.min((item.value * 100), 100)}
          
          <div class="eff-item-compact">
            <div class="eff-icon-compact">
                <i data-feather={iconMap[item.id] || 'activity'} class="w-4 h-4"></i>
            </div>
            
            <div class="eff-content-compact">
                <div class="eff-row-top">
                    <span class="eff-label-text">{item.label}</span>
                    <span class="eff-value-text" style="color: {color}">
                        {formatters.formatPercentage(item.value)}
                    </span>
                </div>
                
                <div class="eff-row-bottom">
                    <div class="eff-bar-container">
                        <div 
                            class="eff-bar-fill" 
                            style="width: {percent}%; background-color: {color};"
                        ></div>
                    </div>
                    {#if targetVal > 0}
                        <span class="eff-target-text">MT: {item.target}%</span>
                    {/if}
                </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>