import { buildDictionary, parseAddress, extractAddressString } from './addressParser.js';

function addStatsToNode(node, sl, dt, nhomHang, tenSanPham) {
    node.soLuong += sl;
    node.doanhThu += dt;
    
    if (!node.products[nhomHang]) {
        node.products[nhomHang] = { nhomHang, soLuong: 0, doanhThu: 0, productDetails: {} };
    }
    node.products[nhomHang].soLuong += sl;
    node.products[nhomHang].doanhThu += dt;

    let spKey = tenSanPham || 'Không xác định';
    if (!node.products[nhomHang].productDetails[spKey]) {
        node.products[nhomHang].productDetails[spKey] = { tenSanPham: spKey, soLuong: 0, doanhThu: 0 };
    }
    node.products[nhomHang].productDetails[spKey].soLuong += sl;
    node.products[nhomHang].productDetails[spKey].doanhThu += dt;
}

export function buildAddressTree(ycxData, validHtxArray, mappingDict = {}) {
    const validHtx = new Set(validHtxArray || []);
    
    const rootNode = { 
        id: 'root', name: 'Tất cả khu vực', level: 0, 
        soLuong: 0, doanhThu: 0, products: {}, children: {} 
    };
    
    const emptyNode = { 
        id: 'empty', name: 'Trống / Sai định dạng', level: 1, 
        soLuong: 0, doanhThu: 0, products: {}, children: {} 
    };

    if (!ycxData || ycxData.length === 0) return rootNode;

    const dictionary = buildDictionary(ycxData);

    ycxData.forEach(row => {
        const htx = row.hinhThucXuat || row['Hình thức xuất'];
        const thuTien = (row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || row['Trạng thái thu tiền'] || "").trim();
        const huy = (row.trangThaiHuy || row.TRANG_THAI_HUY || row['Trạng thái hủy'] || "").trim();
        const tra = (row.tinhTrangTra || row.TINH_TRANG_TRA || row['Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính'] || "").trim();
        const xuat = (row.trangThaiXuat || row.TRANG_THAI_XUAT || row['Trạng thái xuất'] || "").trim();

        const isValidRow = thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && (!xuat || xuat === 'Đã xuất' || xuat === 'Đã giao');

        if (validHtx.has(htx) && isValidRow) {
            const sl = (parseInt(String(row.soLuong || row['Số lượng'] || "0"), 10) || 0);
            const dt = (row.revenue !== undefined ? row.revenue : (parseFloat(String(row.thanhTien || row['Giá bán'] || "0").replace(/,/g, '')) || 0));
            const nhomHang = String(row.nhomHang || row['Nhóm hàng'] || 'Khác').trim();
            const tenSanPham = String(row.tenSanPham || row.tenHang || row['Tên sản phẩm'] || 'Không xác định').trim();

            addStatsToNode(rootNode, sl, dt, nhomHang, tenSanPham);

            // [PHẪU THUẬT LOGIC]: Lưu Cache chống giật CPU
            if (row._cachedParsedAddr === undefined) {
                row._cachedDiaChiRaw = extractAddressString(row);
                row._cachedParsedAddr = parseAddress(row._cachedDiaChiRaw, dictionary);
            }
            
            let parsedAddr = row._cachedParsedAddr ? { ...row._cachedParsedAddr } : null;
            
            let tinhThanh = parsedAddr ? parsedAddr.tinhThanh : '-';
            let xaPhuong = parsedAddr ? parsedAddr.xaPhuong : '-';
            let apDuong = parsedAddr ? parsedAddr.apDuong : '-';

            let nodeNameEmpty = (!parsedAddr || (tinhThanh === '-' && xaPhuong === '-')) ? 'Trống / Sai định dạng' : null;
            
            // [PHẪU THUẬT LOGIC]: Tiêu diệt "Bóng ma khoảng trắng" bằng cách ép Trim() mọi Key
            let targetMapKey = null;
            const searchKeys = [apDuong, xaPhuong, tinhThanh, nodeNameEmpty].map(k => k ? k.trim() : null);
            
            for (let mapKey in mappingDict) {
                if (searchKeys.includes(mapKey.trim())) {
                    targetMapKey = mappingDict[mapKey];
                    break;
                }
            }

            if (targetMapKey) {
                const parts = targetMapKey.split('|');
                if (parts.length === 2) {
                    tinhThanh = parts[0];
                    xaPhuong = parts[1];
                    parsedAddr = true; 
                }
            }

            if (parsedAddr) {
                if (xaPhuong === '-') xaPhuong = '[Chưa rõ Phường/Xã]';
                if (apDuong === '-') apDuong = '[Chưa rõ Địa chỉ chi tiết]';

                if (!rootNode.children[tinhThanh]) {
                    rootNode.children[tinhThanh] = { id: tinhThanh, name: tinhThanh, level: 1, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const tNode = rootNode.children[tinhThanh];
                addStatsToNode(tNode, sl, dt, nhomHang, tenSanPham);

                const idXa = `${tinhThanh}|${xaPhuong}`;
                if (!tNode.children[xaPhuong]) {
                    tNode.children[xaPhuong] = { id: idXa, name: xaPhuong, level: 2, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const xNode = tNode.children[xaPhuong];
                addStatsToNode(xNode, sl, dt, nhomHang, tenSanPham);

                const idAp = `${idXa}|${apDuong}`;
                if (!xNode.children[apDuong]) {
                    xNode.children[apDuong] = { id: idAp, name: apDuong, level: 3, soLuong: 0, doanhThu: 0, products: {}, children: null };
                }
                const aNode = xNode.children[apDuong];
                addStatsToNode(aNode, sl, dt, nhomHang, tenSanPham);

            } else {
                addStatsToNode(emptyNode, sl, dt, nhomHang, tenSanPham);
            }
        }
    });

    if (emptyNode.soLuong > 0) rootNode.children['empty'] = emptyNode;
    return rootNode;
}