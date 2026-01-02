import readXlsxFile from 'read-excel-file';

// Cấu hình Schema để map cột từ Excel sang biến
const SCHEMA = {
  'Mã nhân viên': {
    prop: 'ma_nv',
    type: String,
    required: true
  },
  'Tên nhân viên': {
    prop: 'ten_nv',
    type: String,
    required: true
  },
  'Mã kho': {
    prop: 'ma_kho',
    type: String,
    required: true
  },
  'Mã cụm': {
    prop: 'ma_cum',
    type: String,
    // Không bắt buộc required: true nếu có nhân viên không thuộc cụm, 
    // nhưng cần định nghĩa để map đúng cột
  },
  'Vị trí': {
    prop: 'vi_tri',
    type: String
  },
  'Ngày vào làm': {
    prop: 'ngay_vao_lam',
    type: Date
  }
  // Thêm các cột khác nếu cần thiết
};

export const parseEmployeeData = async (file) => {
  try {
    const { rows, errors } = await readXlsxFile(file, { schema: SCHEMA });

    if (errors && errors.length > 0) {
      console.error('Lỗi đọc file nhân viên:', errors);
      // Có thể throw lỗi hoặc vẫn xử lý tiếp tùy logic business
    }

    // Set để lưu các mã duy nhất
    const warehouseSet = new Set();
    const clusterSet = new Set();

    // Duyệt qua từng dòng để xử lý dữ liệu và thu thập meta data
    const processedData = rows.map((row) => {
      // Chuẩn hóa dữ liệu (trim spaces, uppercase nếu cần)
      const maKho = row.ma_kho ? row.ma_kho.toString().trim().toUpperCase() : '';
      const maCum = row.ma_cum ? row.ma_cum.toString().trim().toUpperCase() : '';

      // Thêm vào Set để đếm
      if (maKho) warehouseSet.add(maKho);
      if (maCum) clusterSet.add(maCum);

      return {
        ...row,
        ma_kho: maKho,
        ma_cum: maCum,
        // Giữ lại giá trị gốc hoặc xử lý thêm các trường khác tại đây
      };
    });

    // --- LOGIC XỬ LÝ ĐA KHO & BỘ LỌC ---
    
    // Chuyển Set thành Array
    const uniqueWarehouses = Array.from(warehouseSet).sort();
    const uniqueClusters = Array.from(clusterSet).sort();

    // Logic kích hoạt chế độ đa kho: Nếu có từ 2 mã kho trở lên
    const isMultiWarehouseMode = uniqueWarehouses.length >= 2;

    // Chuẩn bị dữ liệu cho bộ lọc (Filter Options)
    // 1. Options cho Kho (giữ nguyên mã)
    const warehouseOptions = uniqueWarehouses.map(code => ({
      value: code,
      label: code,
      type: 'warehouse'
    }));

    // 2. Options cho Cụm (Thêm chữ "Cụm" vào label để phân biệt)
    const clusterOptions = uniqueClusters.map(code => ({
      value: code, // Value vẫn giữ nguyên để filter dữ liệu chính xác
      label: `Cụm ${code}`, // Label hiển thị: "Cụm AG01"
      type: 'cluster'
    }));

    // Gộp tất cả option vào một mảng filter chung (nếu UI dùng chung 1 dropdown)
    // Hoặc UI có thể dùng riêng lẻ từ meta
    const allFilterOptions = [...warehouseOptions, ...clusterOptions];

    // Trả về cấu trúc đầy đủ
    return {
      data: processedData,
      meta: {
        isMultiWarehouseMode, // Flag kích hoạt chế độ
        uniqueWarehouses,     // Danh sách mã kho thô
        uniqueClusters,       // Danh sách mã cụm thô
        warehouseOptions,     // Danh sách options kho cho dropdown
        clusterOptions,       // Danh sách options cụm cho dropdown (đã format tên)
        allFilterOptions,     // Danh sách gộp
        totalRows: processedData.length
      }
    };

  } catch (error) {
    console.error("Critical error parsing employee file:", error);
    throw error;
  }
};