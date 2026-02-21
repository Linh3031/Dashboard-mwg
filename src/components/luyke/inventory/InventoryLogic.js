// src/components/inventory/InventoryLogic.js
/* global XLSX */

/**
 * Hàm trích xuất ID từ chuỗi dữ liệu ERP
 * VD: "1491 - Smartphone" -> Trả về "1491"
 */
function extractId(rawString) {
    if (!rawString) return 'UNKNOWN';
    const str = rawString.toString().trim();
    const match = str.match(/^(\d+)/);
    return match ? match[1] : 'UNKNOWN';
}

export const inventoryHelper = {
    /**
     * Đọc file Excel Tồn Kho, trích xuất ID và gộp tổng Số Lượng (Như SUMIFS)
     */
    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    // Đọc file thành mảng 2 chiều
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (!json || json.length === 0) throw new Error("File Excel trống dữ liệu.");

                    // 1. Tìm dòng Header để xác định vị trí các cột
                    let headerRowIndex = -1;
                    let colMap = { nganhHang: -1, nhomHang: -1, maSp: -1, sl: -1 };
                    
                    for (let i = 0; i < Math.min(json.length, 20); i++) {
                        const row = json[i];
                        if (!row) continue;
                        const rowStr = row.map(cell => (cell || '').toString().toLowerCase().trim());
                        
                        const nganhHangIdx = rowStr.findIndex(c => c === 'ngành hàng');
                        const nhomHangIdx = rowStr.findIndex(c => c === 'nhóm hàng');
                        const maSpIdx = rowStr.findIndex(c => c === 'mã sản phẩm' || c === 'mã sp' || c === 'mã');
                        const slIdx = rowStr.findIndex(c => c === 'số lượng' || c === 'tồn' || c === 'sl');

                        // Chỉ cần có cột Số Lượng và ít nhất 1 cột ID là bắt đầu quét được
                        if (slIdx !== -1 && (maSpIdx !== -1 || nhomHangIdx !== -1 || nganhHangIdx !== -1)) {
                            headerRowIndex = i;
                            colMap = { nganhHang: nganhHangIdx, nhomHang: nhomHangIdx, maSp: maSpIdx, sl: slIdx };
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        throw new Error("Không tìm thấy cấu trúc cột chuẩn (Ngành hàng, Nhóm hàng, Mã sản phẩm, Số lượng).");
                    }

                    // 2. Khởi tạo Index (Cơ sở dữ liệu gộp - SUMIFS)
                    const index = {
                        products: {},   // Lưu tổng tồn kho theo ID Sản Phẩm
                        groups: {},     // Lưu tổng tồn kho theo ID Nhóm Hàng
                        categories: {}  // Lưu tổng tồn kho theo ID Ngành Hàng
                    };

                    // 3. Duyệt từng dòng dữ liệu và gộp (SUM)
                    for (let i = headerRowIndex + 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || row.length === 0) continue;

                        const sl = parseFloat(row[colMap.sl]) || 0;
                        if (sl <= 0) continue; // Bỏ qua nếu tồn kho = 0

                        // Lấy ID
                        const spId = colMap.maSp !== -1 ? (row[colMap.maSp] || '').toString().trim() : '';
                        const groupId = colMap.nhomHang !== -1 ? extractId(row[colMap.nhomHang]) : 'UNKNOWN';
                        const catId = colMap.nganhHang !== -1 ? extractId(row[colMap.nganhHang]) : 'UNKNOWN';

                        // Thực thi SUMIFS ngầm định
                        if (spId) index.products[spId] = (index.products[spId] || 0) + sl;
                        if (groupId !== 'UNKNOWN') index.groups[groupId] = (index.groups[groupId] || 0) + sl;
                        if (catId !== 'UNKNOWN') index.categories[catId] = (index.categories[catId] || 0) + sl;
                    }

                    console.log("[InventoryLogic] Đã trích xuất ID và Build Index Tồn Kho:", index);
                    resolve(index);
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Map số tồn kho vào Cây dữ liệu Sức bán và chạy Công thức Cảnh báo
     */
    enrichTreeWithInventory(treeNodes, index, velocityDays, alertDays) {
        if (!treeNodes || !index) return;

        treeNodes.forEach(node => {
            let inventoryQty = 0;
            let isMatched = false;

            // BƯỚC 1: TÌM MATCHING THEO ĐỘ ƯU TIÊN ID
            if (node.productCode) {
                inventoryQty = index.products[node.productCode] || 0;
                isMatched = true;
            } else if (node.groupId) {
                inventoryQty = index.groups[node.groupId] || 0;
                isMatched = true;
            } else if (node.categoryId) {
                inventoryQty = index.categories[node.categoryId] || 0;
                isMatched = true;
            }

            // Xử lý đệ quy xuống các node con
            if (node.children && node.children.length > 0) {
                this.enrichTreeWithInventory(node.children, index, velocityDays, alertDays);
                
                // BƯỚC 2: Gom từ dưới lên (Bottom-up) nếu bản thân node này không match được ID nào
                if (!isMatched) {
                    inventoryQty = node.children.reduce((sum, child) => sum + (child.inventoryQty || 0), 0);
                }
            }

            node.inventoryQty = inventoryQty;

            // BƯỚC 3: CÔNG THỨC SO SÁNH (Theo logic: Tồn chia [alertDays] so với Bán chia [velocityDays])
            // node.quantity ở đây đã được LuykeCategoryView chia sẵn cho velocityDays (Sức bán TB / Ngày)
            const avgDailySales = node.quantity || 0; 
            const avgDailyInventoryCapability = inventoryQty / alertDays;

            if (avgDailySales === 0 && inventoryQty === 0) {
                node.inventoryStatus = 'none';
                node.inventoryMessage = '-';
            } else if (avgDailyInventoryCapability < avgDailySales) {
                node.inventoryStatus = 'alert';
                node.inventoryMessage = `Thiếu hàng`; 
            } else {
                node.inventoryStatus = 'ok';
                node.inventoryMessage = `Đủ hàng`;
            }
        });
    }
};