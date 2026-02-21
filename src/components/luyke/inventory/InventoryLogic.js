// src/components/inventory/InventoryLogic.js
/* global XLSX */

function extractId(rawString) {
    if (!rawString) return 'UNKNOWN';
    const str = rawString.toString().trim();
    const match = str.match(/^(\d+)/);
    return match ? match[1] : 'UNKNOWN';
}

function robustParseFloat(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    return parseFloat(str) || 0;
}

export const inventoryHelper = {
    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (!json || json.length === 0) throw new Error("File Excel trống dữ liệu.");

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

                        if (slIdx !== -1 && (maSpIdx !== -1 || nhomHangIdx !== -1 || nganhHangIdx !== -1)) {
                            headerRowIndex = i;
                            colMap = { nganhHang: nganhHangIdx, nhomHang: nhomHangIdx, maSp: maSpIdx, sl: slIdx };
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        throw new Error("Không tìm thấy cấu trúc cột chuẩn.");
                    }

                    const index = { products: {}, groups: {}, categories: {} };

                    for (let i = headerRowIndex + 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || row.length === 0) continue;

                        const sl = parseFloat(row[colMap.sl]) || 0;
                        if (sl <= 0) continue; 

                        const spId = colMap.maSp !== -1 ? (row[colMap.maSp] || '').toString().trim() : '';
                        const groupId = colMap.nhomHang !== -1 ? extractId(row[colMap.nhomHang]) : 'UNKNOWN';
                        const catId = colMap.nganhHang !== -1 ? extractId(row[colMap.nganhHang]) : 'UNKNOWN';

                        if (spId) index.products[spId] = (index.products[spId] || 0) + sl;
                        if (groupId !== 'UNKNOWN') index.groups[groupId] = (index.groups[groupId] || 0) + sl;
                        if (catId !== 'UNKNOWN') index.categories[catId] = (index.categories[catId] || 0) + sl;
                    }

                    console.log("[InventoryLogic] Build Index OK. Total Products mapped:", Object.keys(index.products).length);
                    resolve(index);
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    enrichTreeWithInventory(treeNodes, index, velocityDays, alertDays) {
        if (!treeNodes || !index) return;

        treeNodes.forEach(node => {
            // 1. Duyệt sâu xuống con trước
            if (node.children && node.children.length > 0) {
                this.enrichTreeWithInventory(node.children, index, velocityDays, alertDays);
            }

            // 2. Tìm Tồn Kho bằng ID
            let inv = 0;
            let matchSource = 'none';

            if (node.productCode && index.products[node.productCode] !== undefined) {
                inv = index.products[node.productCode];
                matchSource = 'productCode';
            } else if (node.groupId && index.groups[node.groupId] !== undefined) {
                inv = index.groups[node.groupId];
                matchSource = 'groupId';
            } else if (node.categoryId && index.categories[node.categoryId] !== undefined) {
                inv = index.categories[node.categoryId];
                matchSource = 'categoryId';
            } else if (node.children && node.children.length > 0) {
                inv = node.children.reduce((sum, child) => sum + robustParseFloat(child.inventoryQty), 0);
                matchSource = 'bottom-up-children';
            }

            node.inventoryQty = robustParseFloat(inv);

            // 3. Tính toán
            const currentInv = node.inventoryQty;
            const dailySales = robustParseFloat(node.quantity); 
            const alertD = robustParseFloat(alertDays) || 1;
            const dailyInv = currentInv / alertD;

            // Log Console ĐỂ BẮT LỖI (chỉ log những sản phẩm có dữ liệu để tránh lag)
            // Nếu bạn đang xem iPhone 17, nó sẽ in ra chi tiết phép tính của dòng này.
            if (node.name && (node.name.toLowerCase().includes('iphone 17') || (dailySales > 0 && currentInv === 0))) {
                console.warn(`[DEBUG INVENTORY] 🔍 Phân tích node: ${node.name}`);
                console.table({
                    "1. Match Type": matchSource,
                    "2. Raw Quantity (Sức Bán)": typeof node.quantity === 'object' ? JSON.stringify(node.quantity) : node.quantity,
                    "3. Parsed Daily Sales": dailySales,
                    "4. Raw Inventory (Tồn)": inv,
                    "5. Parsed Inventory": currentInv,
                    "6. Alert Days": alertD,
                    "7. Daily Inv Capacity (Tồn / Ngày)": dailyInv,
                    "8. Toán tử So sánh (dailyInv < dailySales)": `${dailyInv} < ${dailySales}`,
                    "9. Kết quả So sánh": dailyInv < dailySales
                });
            }

            if (dailySales <= 0 && currentInv <= 0) {
                node.inventoryStatus = 'none';
                node.inventoryMessage = '-';
            } else if (dailyInv < dailySales) {
                node.inventoryStatus = 'alert';
                node.inventoryMessage = `Thiếu hàng`; 
            } else {
                node.inventoryStatus = 'ok';
                node.inventoryMessage = `Đủ hàng`;
            }
        });
    }
};