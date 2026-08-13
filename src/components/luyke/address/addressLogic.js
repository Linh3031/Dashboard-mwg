// src/components/luyke/address/addressLogic.js

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

export function buildAddressTree(ycxData, validHtxArray) {
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

    console.group("%c🔍 QUÉT LÕI ADDRESS LOGIC (TREE VIEW 3 TẦNG)", "color: white; background: #e91e63; font-size: 13px; padding: 4px; font-weight: bold;");
    ycxData.slice(0, 3).forEach((row, i) => {
        console.log(`\n%c--- DÒNG ${i + 1} ---`, "color: yellow; background: #333; padding: 2px;");
        const diaChiRaw = extractAddressString(row);
        console.log("1. Địa chỉ thô lấy được:", diaChiRaw || "RỖNG");
        console.log("2. Kết quả tách (3 Tầng):", parseAddress(diaChiRaw, dictionary));
    });
    console.groupEnd();

    ycxData.forEach(row => {
        const htx = row.hinhThucXuat || row['Hình thức xuất'];
        
        const thuTien = (row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || row['Trạng thái thu tiền'] || "").trim();
        const huy = (row.trangThaiHuy || row.TRANG_THAI_HUY || row['Trạng thái hủy'] || "").trim();
        const tra = (row.tinhTrangTra || row.TINH_TRANG_TRA || row['Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính'] || "").trim();
        const xuat = (row.trangThaiXuat || row.TRANG_THAI_XUAT || row['Trạng thái xuất'] || "").trim();

        const isThuTien = thuTien === 'Đã thu';
        const isChuaHuy = huy === 'Chưa hủy';
        const isChuaTra = tra === 'Chưa trả';
        const isDaXuat = (!xuat || xuat === 'Đã xuất' || xuat === 'Đã giao');
        
        const isValidRow = isThuTien && isChuaHuy && isChuaTra && isDaXuat;

        if (validHtx.has(htx) && isValidRow) {
            const sl = (parseInt(String(row.soLuong || row['Số lượng'] || "0"), 10) || 0);
            const dt = (row.revenue !== undefined ? row.revenue : (parseFloat(String(row.thanhTien || row['Giá bán'] || "0").replace(/,/g, '')) || 0));
            const nhomHang = String(row.nhomHang || row['Nhóm hàng'] || 'Khác').trim();
            const tenSanPham = String(row.tenSanPham || row.tenHang || row['Tên sản phẩm'] || 'Không xác định').trim();

            addStatsToNode(rootNode, sl, dt, nhomHang, tenSanPham);

            let diaChiRaw = extractAddressString(row);
            const parsedAddr = parseAddress(diaChiRaw, dictionary);
            
            if (parsedAddr) {
                let { tinhThanh, xaPhuong, apDuong } = parsedAddr;
                
                if (xaPhuong === '-') xaPhuong = '[Chưa rõ Phường/Xã]';
                if (apDuong === '-') apDuong = '[Chưa rõ Địa chỉ chi tiết]';

                // TẦNG 1: TỈNH / THÀNH PHỐ
                if (!rootNode.children[tinhThanh]) {
                    rootNode.children[tinhThanh] = { id: tinhThanh, name: tinhThanh, level: 1, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const tNode = rootNode.children[tinhThanh];
                addStatsToNode(tNode, sl, dt, nhomHang, tenSanPham);

                // TẦNG 2: PHƯỜNG / XÃ
                const idXa = `${tinhThanh}|${xaPhuong}`;
                if (!tNode.children[xaPhuong]) {
                    tNode.children[xaPhuong] = { id: idXa, name: xaPhuong, level: 2, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const xNode = tNode.children[xaPhuong];
                addStatsToNode(xNode, sl, dt, nhomHang, tenSanPham);

                // TẦNG 3: ĐỊA CHỈ CHI TIẾT (ẤP, ĐƯỜNG, QUẬN, SỐ NHÀ...)
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

    if (emptyNode.soLuong > 0) {
        rootNode.children['empty'] = emptyNode;
    }

    return rootNode;
}