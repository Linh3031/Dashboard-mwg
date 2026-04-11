// src/components/luyke/address/addressLogic.js

import { buildDictionary, parseAddress } from './addressParser.js';

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

    const dictionary = buildDictionary(ycxData);

    ycxData.forEach(row => {
        const htx = row.hinhThucXuat;
        
        // --- [SURGICAL FIX]: BỘ LỌC ĐỒNG BỘ VỚI TAB CHI TIẾT YCX ---
        const thuTien = (row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || "").trim();
        const huy = (row.trangThaiHuy || row.TRANG_THAI_HUY || "").trim();
        const tra = (row.tinhTrangTra || row.TINH_TRANG_TRA || "").trim();
        const xuat = (row.trangThaiXuat || row.TRANG_THAI_XUAT || "").trim();

        const isThuTien = thuTien === 'Đã thu';
        const isChuaHuy = huy === 'Chưa hủy';
        const isChuaTra = tra === 'Chưa trả';
        const isDaXuat = xuat === 'Đã xuất';
        
        const isValidRow = isThuTien && isChuaHuy && isChuaTra && isDaXuat;
        // -------------------------------------------------------------

        // Chỉ cộng tiền khi Hình thức xuất hợp lệ VÀ Đơn hàng thỏa mãn bộ lọc chặt
        if (validHtx.has(htx) && isValidRow) {
            const sl = (parseInt(String(row.soLuong || "0"), 10) || 0);
            const dt = (row.revenue !== undefined ? row.revenue : (parseFloat(String(row.thanhTien).replace(/,/g, '')) || 0));
            const nhomHang = String(row.nhomHang || 'Khác').trim();
            const tenSanPham = String(row.tenSanPham || row.tenHang || 'Không xác định').trim();

            addStatsToNode(rootNode, sl, dt, nhomHang, tenSanPham);

            const parsedAddr = parseAddress(row.diaChi, dictionary);
            
            if (parsedAddr) {
                const { tinhThanh, quanHuyen, xaPhuong, apDuong } = parsedAddr;

                if (!rootNode.children[tinhThanh]) {
                    rootNode.children[tinhThanh] = { id: tinhThanh, name: tinhThanh, level: 1, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const tNode = rootNode.children[tinhThanh];
                addStatsToNode(tNode, sl, dt, nhomHang, tenSanPham);

                const idHuyen = `${tinhThanh}|${quanHuyen}`;
                if (!tNode.children[quanHuyen]) {
                    tNode.children[quanHuyen] = { id: idHuyen, name: quanHuyen, level: 2, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const hNode = tNode.children[quanHuyen];
                addStatsToNode(hNode, sl, dt, nhomHang, tenSanPham);

                const idXa = `${idHuyen}|${xaPhuong}`;
                if (!hNode.children[xaPhuong]) {
                    hNode.children[xaPhuong] = { id: idXa, name: xaPhuong, level: 3, soLuong: 0, doanhThu: 0, products: {}, children: {} };
                }
                const xNode = hNode.children[xaPhuong];
                addStatsToNode(xNode, sl, dt, nhomHang, tenSanPham);

                const idAp = `${idXa}|${apDuong}`;
                if (!xNode.children[apDuong]) {
                    xNode.children[apDuong] = { id: idAp, name: apDuong, level: 4, soLuong: 0, doanhThu: 0, products: {}, children: null };
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