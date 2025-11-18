<script>
  // Component này nhận dữ liệu đã được xử lý và chỉ render ra HTML.
  import { formatters } from '../../utils/formatters.js';

  export let reportData;

  // --- Logic render được di chuyển từ ui-thidua-vung.js ---
  let summary, coGiai, sapCoGiai, tiemNang, canCoGangNhieu;
  let keyMap = {};
  let soonPrizeTitleText = '';
  let tyLeDatClass = '';

  // Helper function (giữ nguyên từ file gốc)
  const findKey = (item, keyword) => {
      if (!item) return keyword; 
      return Object.keys(item).find(k => k.trim().toLowerCase().includes(keyword.toLowerCase())) || keyword;
  }

  // $: là một khối reactive. Nó sẽ tự động chạy lại khi 'reportData' thay đổi.
  $: {
    if (!reportData) {
      // Nếu không có data, reset
      summary = null;
      coGiai = [];
      sapCoGiai = [];
      tiemNang = [];
      canCoGangNhieu = [];
} else {
      // Destructure dữ liệu
      ({ summary, coGiai, sapCoGiai, tiemNang, canCoGangNhieu } = reportData);

      // Tìm keys (giống hệt logic cũ)
      const firstItem = coGiai[0] || sapCoGiai[0] || tiemNang[0] || canCoGangNhieu[0];
      keyMap = {
          sieuThi: findKey(summary, 'siêu thị'),
          tongThuongTamTinh: findKey(summary, 'tổng thưởng tạm tỉnh'),
          slThiDua: findKey(summary, 'sl nh thi đua'),
          slDat: findKey(summary, 'sl nh >100%'),
          tyLeDat: findKey(summary, 'tỷ lệ nh đạt >100%'),
          slCoGiai: findKey(summary, 'sl nh dự kiến đạt giải'),
          nganhHang: findKey(firstItem, 'ngành hàng'),
          phanTramDuKien: findKey(firstItem, '% dự kiến'),
          duKienVuot: findKey(firstItem, 'dự kiến d.thu'),
          hangVuotTroi: findKey(firstItem, 'hạng vượt trội'),
          hangTarget: findKey(firstItem, 'hạng % target'),
          tongThuong: findKey(firstItem, 'tổng thưởng'),
          hangCoGiaiKenh: 'hangCoGiaiKenh'
      };

      // Tính toán text/class (giống hệt logic cũ)
      const totalSoonPrize = sapCoGiai.reduce((sum, item) => sum + (item.thuongTiemNang || 0), 0);
      soonPrizeTitleText = totalSoonPrize > 0 ? ` - DK: ${formatters.formatNumber(totalSoonPrize)}đ` : '';

      const tyLeDatValue = summary[keyMap.tyLeDat] || 0;
      tyLeDatClass = tyLeDatValue >= 0.6 ? 'tdv-tyledat-high' : 'tdv-tyledat-low';
    }
  }
</script>

{#if reportData}
<div class="tdv-infographic-card" data-capture-group="thidua-vung">
    <div class="tdv-header">
        <h2 class="tdv-supermarket-name">{summary[keyMap.sieuThi]}</h2>
        <div class="tdv-total-prize-container">
            <span class="tdv-total-prize-label">Tổng thưởng tạm tính:</span>
            <span class="tdv-total-prize-value">{formatters.formatNumber(summary[keyMap.tongThuongTamTinh])}đ</span>
        </div>
    </div>

    <div class="tdv-summary-grid">
        <div class="tdv-summary-item">
            <span class="tdv-summary-value">{formatters.formatNumber(summary[keyMap.slThiDua])}</span>
            <span class="tdv-summary-label">Ngành thi đua</span>
        </div>
        <div class="tdv-summary-item">
            <span class="tdv-summary-value">{formatters.formatNumber(summary[keyMap.slDat])}</span>
            <span class="tdv-summary-label">Ngành >100%</span>
        </div>
        <div class="tdv-summary-item">
            <span class="tdv-summary-value {tyLeDatClass}">{formatters.formatPercentage(summary[keyMap.tyLeDat] || 0)}</span>
            <span class="tdv-summary-label">Tỷ lệ đạt</span>
        </div>
         <div class="tdv-summary-item">
            <span class="tdv-summary-value">{formatters.formatNumber(summary[keyMap.slCoGiai])}</span>
            <span class="tdv-summary-label">Ngành dự kiến có giải</span>
        </div>
        <div class="tdv-summary-item">
            <span class="tdv-summary-value">{formatters.formatNumber(summary[keyMap.hangCoGiaiKenh])}</span>
            <span class="tdv-summary-label">Hạng có giải (Kênh)</span>
        </div>
    </div>

    <div class="tdv-rows-container">
        <div class="tdv-row">
            <h3 class="tdv-row-title tdv-row-title--prize">Ngành hàng có giải ({coGiai.length})</h3>
            <div class="tdv-row-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {#if coGiai.length > 0}
                    {#each coGiai as item (item[keyMap.nganhHang])}
                        <div class="tdv-item-card">
                            <p class="tdv-item-card__title">{item[keyMap.nganhHang]}</p>
                            <div class="tdv-progress-bar-container">
                                <div class="tdv-progress-bar tdv-progress-bar--blue" style="width: {Math.min(item[keyMap.phanTramDuKien] * 100, 100)}%;"></div>
                                <span class="tdv-progress-bar__text">{formatters.formatPercentage(item[keyMap.phanTramDuKien])}</span>
                            </div>
                            <div class="tdv-item-card__details">
                                <span>Vượt: <strong>{formatters.formatNumber(item[keyMap.duKienVuot])}</strong></span>
                                <span>Hạng DT/SL: <strong>{item[keyMap.hangVuotTroi]}</strong></span>
                                <span>Hạng %: <strong>{item[keyMap.hangTarget]}</strong></span>
                                <span class="tdv-item-card__prize">Thưởng: <strong>{formatters.formatNumber(item[keyMap.tongThuong])}</strong></span>
                            </div>
                        </div>
                    {/each}
                {:else}
                    <p class="text-xs text-gray-500 col-span-full">Không có.</p>
                {/if}
            </div>
        </div>

        <div class="tdv-row">
            <h3 class="tdv-row-title tdv-row-title--soon-prize">Sắp có giải ({sapCoGiai.length})<span class="tdv-row-subtitle">{soonPrizeTitleText}</span></h3>
            <div class="tdv-row-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {#if sapCoGiai.length > 0}
                    {#each sapCoGiai as item (item[keyMap.nganhHang])}
                        <div class="tdv-item-card">
                            <p class="tdv-item-card__title">{item[keyMap.nganhHang]}</p>
                            <div class="tdv-progress-bar-container">
                                <div class="tdv-progress-bar tdv-progress-bar--yellow" style="width: {Math.min(item[keyMap.phanTramDuKien] * 100, 100)}%;"></div>
                                <span class="tdv-progress-bar__text">{formatters.formatPercentage(item[keyMap.phanTramDuKien])}</span>
                            </div>
                            <div class="tdv-item-card__details">
                                <span>Cách giải: <strong>{item.khoangCach} hạng</strong></span>
                                <span>Hạng DT/SL: <strong>{item[keyMap.hangVuotTroi]}</strong></span>
                                <span>Hạng %: <strong>{item[keyMap.hangTarget]}</strong></span>
                                <span class="tdv-item-card__prize">Thưởng DK: <strong>{formatters.formatNumber(item.thuongTiemNang)}</strong></span>
                            </div>
                        </div>
                    {/each}
                {:else}
                    <p class="text-xs text-gray-500 col-span-full">Không có.</p>
                {/if}
            </div>
        </div>

        <div class="tdv-row">
            <h3 class="tdv-row-title tdv-row-title--effort">Nhóm còn lại ({tiemNang.length + canCoGangNhieu.length})</h3>
            <div class="tdv-row-body tdv-row-body--effort">
                {#if tiemNang.length > 0}
                    <div class="tdv-effort-subgroup">
                        <h4 class="tdv-effort-subgroup__title tdv-effort-subgroup__title--potential">Tiềm năng (cách 21-40 hạng)</h4>
                        <div class="tdv-effort-list">
                            {#each tiemNang as item (item[keyMap.nganhHang])}
                                <div class="tdv-effort-item">{item[keyMap.nganhHang]} (cách {item.khoangCach})</div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if canCoGangNhieu.length > 0}
                     <div class="tdv-effort-subgroup">
                        <h4 class="tdv-effort-subgroup__title tdv-effort-subgroup__title--major">Cần cố gắng nhiều</h4>
                        <div class="tdv-effort-list">
                            {#each canCoGangNhieu as item (item[keyMap.nganhHang])}
                                <div class="tdv-effort-item">{item[keyMap.nganhHang]}</div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if tiemNang.length === 0 && canCoGangNhieu.length === 0}
                    <p class="text-xs text-gray-500">Không có.</p>
                {/if}
            </div>
        </div>
    </div>
</div>
{/if}