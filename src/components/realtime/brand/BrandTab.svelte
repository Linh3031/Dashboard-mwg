<script>
  import { realtimeYCXData } from '../../../stores.js';
  import { cleanCategoryName } from '../../../utils.js';
  import BrandTable from './BrandTable.svelte';

  export let selectedWarehouse = '';

  // 1. CẤU HÌNH DIMENSIONS (Các chiều dữ liệu)
  const AVAILABLE_DIMENSIONS = [
      { id: 'nganhHang', label: 'Ngành hàng', default: true },
      { id: 'nhomHang', label: 'Nhóm hàng', default: true },
      { id: 'nhaSanXuat', label: 'Nhà sản xuất', default: true },
      { id: 'nhanVienTao', label: 'Người tạo', default: false },
      { id: 'tenSanPham', label: 'Tên sản phẩm', default: false }
  ];

  // 2. CẤU HÌNH METRICS (Mapping keys từ CSV/Excel)
  const METRIC_KEYS = {
      quantity: ['soLuong', 'so_luong', 'Số lượng', 'Quantity', 'SL', 'soluong'],
      revenue: ['doanhThu', 'thanhTien', 'Thành tiền', 'Doanh thu', 'Revenue', 'TIEN_SAU_CK', 'tongTien', 'Total', 'Giá bán', 'Phải thu'],
      revenueQD: ['doanhThuQuyDoi', 'dtqd', 'Doanh thu quy đổi', 'DTQD', 'DoanhThuQuyDoi', 'revenueQuyDoi'],
      warehouse: ['maKho', 'ma_kho', 'Mã kho', 'Warehouse', 'Kho', 'MaKho', 'Mã kho tạo'],
      // Cột hình thức xuất để lọc trả góp
      hinhThucXuat: ['hinhThucXuat', 'Hình thức xuất', 'HinhThucXuat']
  };

  // State
  let activeDimensionIds = ['nganhHang', 'nhaSanXuat'];
  let treeData = [];
  let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
  let currentFilters = {}; 
  let filterOptions = {};

  // --- HÀM TÌM KIẾM KEY THÔNG MINH ---
  function findValue(item, possibleKeys) {
      // 1. Tìm chính xác
      for (const key of possibleKeys) {
          if (item[key] !== undefined && item[key] !== null) return item[key];
      }
      // 2. Tìm không phân biệt hoa thường
      const itemKeys = Object.keys(item);
      for (const key of possibleKeys) {
          const lowerKey = key.toLowerCase();
          const foundKey = itemKeys.find(k => k.toLowerCase() === lowerKey);
          if (foundKey) return item[foundKey];
      }
      return null;
  }

  // --- LOGIC KIỂM TRA TRẢ CHẬM (CHUẨN HÓA THEO YÊU CẦU MỚI) ---
  function checkTraCham(item) {
      // Lấy giá trị cột "Hình thức xuất"
      const val = String(findValue(item, METRIC_KEYS.hinhThucXuat) || '').toLowerCase();
      
      // Danh sách các hình thức xuất được tính là trả góp:
      // 1. Xuất bán hàng trả góp tại siêu thị
      // 2. Xuất bán trả góp ưu đãi cho nhân viên
      // 3. Xuất bán trả góp cho NV phục vụ công việc
      // 4. Xuất bán pre-order trả góp tại siêu thị
      // 5. Xuất bán pre-order trả góp tại siêu thị (TCĐM)
      
      // -> Tất cả đều chứa từ khóa "trả góp". 
      // -> Logic: Chỉ cần "Hình thức xuất" có chứa chữ "trả góp" là ĐÚNG.
      return val.includes('trả góp');
  }

  function getRawValue(item, dimId) {
      const keyMap = {
          'nganhHang': ['nganhHang', 'Ngành hàng', 'NGANH HANG', 'NganhHang'],
          'nhomHang': ['nhomHang', 'nhom_hang', 'Nhóm hàng', 'NhomHang'],
          'nhaSanXuat': ['nhaSanXuat', 'hang', 'Hãng', 'Nhà sản xuất', 'NhaSanXuat'],
          'nhanVienTao': ['nhanVienTao', 'nguoiTao', 'Nhân viên', 'Người tạo', 'NhanVien'],
          'tenSanPham': ['tenSanPham', 'ten_sp', 'Tên sản phẩm', 'Product Name', 'TenSP']
      };
      const possibleKeys = keyMap[dimId] || [dimId];
      const val = findValue(item, possibleKeys);
      return val !== null ? String(val) : '(Khác)';
  }

  function extractFilterOptions(data) {
      const options = {};
      AVAILABLE_DIMENSIONS.forEach(dim => {
          const uniqueValues = new Set();
          data.forEach(item => {
              let val = getRawValue(item, dim.id);
              if (dim.id === 'nganhHang') val = cleanCategoryName(val);
              if (val && val !== '(Khác)' && val !== '(Trống)') {
                  uniqueValues.add(val);
              }
          });
          options[dim.id] = Array.from(uniqueValues).sort();
      });
      return options;
  }

  // --- THUẬT TOÁN GOM NHÓM ---
  function buildHierarchy(items, dimensionIds, level = 0, parentId = 'root') {
      if (level >= dimensionIds.length || items.length === 0) return [];
      const currentDimId = dimensionIds[level];
      const groups = {};

      items.forEach(item => {
          let val = getRawValue(item, currentDimId);
          if (!val) val = '(Trống)';
          if (currentDimId === 'nganhHang') val = cleanCategoryName(val);

          if (!groups[val]) {
              groups[val] = {
                  id: `${parentId}_${val}`,
                  name: val,
                  level: level,
                  items: [],
                  quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0
              };
          }
          groups[val].items.push(item);
          
          // Metrics
          const sl = Number(findValue(item, METRIC_KEYS.quantity) || 0);
          const dt = Number(findValue(item, METRIC_KEYS.revenue) || 0);
          const dtqd = Number(findValue(item, METRIC_KEYS.revenueQD) || dt);
          
          // Check trả chậm
          const isTraCham = checkTraCham(item);

          groups[val].quantity += sl;
          groups[val].revenue += dt;
          groups[val].revenueQD += dtqd;
          if (isTraCham) groups[val].revenueTraCham += dt;
      });

      return Object.values(groups)
          .sort((a, b) => b.revenue - a.revenue)
          .map(group => {
              const children = buildHierarchy(group.items, dimensionIds, level + 1, group.id);
              delete group.items; 
              return { ...group, children, isLeaf: children.length === 0 };
          });
  }

  // --- REACTIVE MAIN FLOW ---
  $: {
      if ($realtimeYCXData && $realtimeYCXData.length > 0) {
          let processedData = $realtimeYCXData;

          // 1. Lọc theo Kho
          const sampleItem = processedData[0];
          const hasWarehouseKey = findValue(sampleItem, METRIC_KEYS.warehouse) !== null;
          if (selectedWarehouse && hasWarehouseKey) {
              processedData = processedData.filter(x => {
                  const khoVal = findValue(x, METRIC_KEYS.warehouse);
                  return (khoVal || '').toString().includes(selectedWarehouse);
              });
          }

          // 2. Filter Options
          filterOptions = extractFilterOptions(processedData);

          // 3. Apply Filters
          processedData = processedData.filter(item => {
              return AVAILABLE_DIMENSIONS.every(dim => {
                  const selectedValues = currentFilters[dim.id];
                  if (!selectedValues || selectedValues.length === 0) return true;
                  let val = getRawValue(item, dim.id);
                  if (dim.id === 'nganhHang') val = cleanCategoryName(val);
                  return selectedValues.includes(val);
              });
          });

          // 4. Global Totals
          totalMetrics = processedData.reduce((acc, item) => {
              const sl = Number(findValue(item, METRIC_KEYS.quantity) || 0);
              const dt = Number(findValue(item, METRIC_KEYS.revenue) || 0);
              const dtqd = Number(findValue(item, METRIC_KEYS.revenueQD) || dt);
              
              const isTraCham = checkTraCham(item);

              acc.quantity += sl;
              acc.revenue += dt;
              acc.revenueQD += dtqd;
              if (isTraCham) acc.revenueTraCham += dt;
              return acc;
          }, { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 });

          // 5. Build Tree
          treeData = buildHierarchy(processedData, activeDimensionIds);
      } else {
          treeData = [];
          totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
          filterOptions = {};
      }
  }

  function handleConfigChange(event) {
      activeDimensionIds = event.detail;
  }

  function handleFilterChange(event) {
      const { key, selected } = event.detail;
      currentFilters = { ...currentFilters, [key]: selected };
  }
</script>

<div class="animate-fade-in pb-10">
    <BrandTable 
        data={treeData} 
        {totalMetrics}
        allDimensions={AVAILABLE_DIMENSIONS}
        activeIds={activeDimensionIds}
        {filterOptions}
        {currentFilters}
        on:configChange={handleConfigChange}
        on:filterChange={handleFilterChange}
    />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>