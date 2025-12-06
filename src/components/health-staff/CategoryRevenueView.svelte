<script>
  import CategoryRevenueTable from './CategoryRevenueTable.svelte';

  export let reportData = [];

  // Kiểm tra nếu không có dữ liệu nào
  $: hasAnyData = reportData.some(item => 
      (item.dtICT || 0) > 0 || (item.dtPhuKien || 0) > 0 || 
      (item.dtGiaDung || 0) > 0 || (item.dtCE || 0) > 0 || (item.dtBaoHiem || 0) > 0
  );
</script>

{#if !hasAnyData}
    <div class="p-12 text-center bg-yellow-50 rounded-lg border border-yellow-200">
         <p class="text-yellow-700 font-semibold text-lg">Không tìm thấy doanh thu cho các ngành hàng chính.</p>
    </div>
{:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        <div data-capture-group="1">
            <CategoryRevenueTable 
                title="ICT (Điện thoại - Laptop)" 
                headerClass="category-header-ict"
                {reportData}
                mainRevenueKey="dtICT"
                mainQuantityKey="slICT"
                subQuantityKeys={['slDienThoai', 'slLaptop']}
                subQuantityLabels={['SL Điện thoại', 'SL Laptop']}
            />
        </div>

        <div data-capture-group="1">
            <CategoryRevenueTable 
                title="PHỤ KIỆN" 
                headerClass="category-header-phukien"
                {reportData}
                mainRevenueKey="dtPhuKien"
                mainQuantityKey="slPhuKien"
                subQuantityKeys={['slPinSDP', 'slCamera', 'slTaiNgheBLT']}
                subQuantityLabels={['SL Pin SDP', 'SL Camera', 'SL Tai nghe']}
            />
        </div>

        <div data-capture-group="2">
            <CategoryRevenueTable 
                title="GIA DỤNG" 
                headerClass="category-header-giadung"
                {reportData}
                mainRevenueKey="dtGiaDung"
                mainQuantityKey="slGiaDung"
                subQuantityKeys={['slNoiChien', 'slMLN', 'slRobotHB']}
                subQuantityLabels={['SL Nồi chiên', 'SL MLN', 'SL Robot HB']}
            />
        </div>

        <div data-capture-group="2">
            <CategoryRevenueTable 
                title="CE (Điện tử - Điện lạnh)" 
                headerClass="category-header-ce"
                {reportData}
                mainRevenueKey="dtCE"
                mainQuantityKey="slCE"
                subQuantityKeys={['slTivi', 'slTuLanh', 'slMayGiat', 'slMayLanh']}
                subQuantityLabels={['SL Tivi', 'SL Tủ lạnh', 'SL Máy giặt', 'SL Máy lạnh']}
            />
        </div>

        <div class="lg:col-span-2" data-capture-group="3">
            <CategoryRevenueTable 
                title="DỊCH VỤ & BẢO HIỂM" 
                headerClass="category-header-baohiem"
                {reportData}
                mainRevenueKey="dtBaoHiem"
                mainQuantityKey="slBaoHiem"
                subQuantityKeys={['slBH1d1', 'slBHXM', 'slBHRV', 'slBHMR']}
                subQuantityLabels={['BH 1 đổi 1', 'BH Xe máy', 'BH Rơi vỡ', 'BH Mở rộng']}
            />
        </div>
    </div>
{/if}