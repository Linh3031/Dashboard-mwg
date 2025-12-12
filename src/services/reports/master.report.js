// src/services/reports/master.report.js
// Version 4.1 - Logic: Substring Matching based on Admin Config
import { get } from 'svelte/store';
import { config } from '../../config.js';
import * as utils from '../../utils.js';
import { dataProcessing } from '../dataProcessing.js';
import {
    danhSachNhanVien,
    employeeNameToMaNVMap,
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    macroCategoryConfig,
    macroProductGroupConfig,
    efficiencyConfig
} from '../../stores.js';

// Hàm chuẩn hóa chuỗi để so sánh (chữ thường)
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase().trim();
};

export const masterReportLogic = {
    generateMasterReportData: (sourceData, goalSettings, isRealtime = false) => {
        const $danhSachNhanVien = get(danhSachNhanVien);
        if (!$danhSachNhanVien || $danhSachNhanVien.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const hinhThucXuatTraGop = dataProcessing.getHinhThucXuatTraGop();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const gioCongByMSNV = dataProcessing.processGioCongData();
        
        // 1. Tải cấu hình từ Admin
        const $macroProductGroupConfig = get(macroProductGroupConfig) || [];
        const $macroCategoryConfig = get(macroCategoryConfig) || [];
        const $efficiencyConfig = get(efficiencyConfig) || [];

        // 2. Xây dựng bộ lọc từ khóa cho các cột UI cố định
        // Map: UI_Key -> Danh sách từ khóa (tên nhóm hàng rút gọn)
        const uiKeywords = {
            dtICT: [], dtCE: [], dtPhuKien: [], dtGiaDung: [],
            dtMLN: [], dtSim: [], dtVAS: [], dtBaoHiem: []
        };

        // Từ khóa định danh cột trên giao diện (để map với Config Admin)
        const uiIdentity = {
            dtICT: ['ict'], 
            dtCE: ['ce'], 
            dtPhuKien: ['phụ kiện'], 
            dtGiaDung: ['gia dụng'], 
            dtMLN: ['máy lọc nước', 'mln'], 
            dtSim: ['sim'], 
            dtVAS: ['vas'], 
            dtBaoHiem: ['bảo hiểm']
        };

        // Quét Config Admin để lấy danh sách "items" (tên rút gọn) đưa vào bộ lọc
        const loadKeywords = (configs) => {
            if (!Array.isArray(configs)) return;
            configs.forEach(group => {
                const groupName = normalize(group.name);
                for (const [uiKey, ids] of Object.entries(uiIdentity)) {
                    // Nếu tên Nhóm lớn chứa từ khóa định danh (VD: "Gia dụng lớn" chứa "gia dụng")
                    if (ids.some(id => groupName.includes(id))) {
                        if (group.items && Array.isArray(group.items)) {
                            // Thêm các item con (tên rút gọn) vào danh sách cần tìm
                            group.items.forEach(i => uiKeywords[uiKey].push(normalize(i)));
                        }
                    }
                }
            });
        };
        loadKeywords($macroProductGroupConfig);
        loadKeywords($macroCategoryConfig);

        // Cache kết quả so khớp để tăng tốc độ (Memoization)
        // Key: Tên nhóm hàng trong data -> Value: Set các uiKey khớp
        const matchCache = {};

        // Dữ liệu lương thưởng (Giữ nguyên)
        const $thuongNongData = get(thuongNongData) || [];
        const $employeeNameToMaNVMap = get(employeeNameToMaNVMap);
        const $thuongERPData = get(thuongERPData) || [];
        const $thuongNongDataThangTruoc = get(thuongNongDataThangTruoc) || [];
        const $thuongERPDataThangTruoc = get(thuongERPDataThangTruoc) || [];

        const thuongNongByMSNV = {};
        $thuongNongData.forEach(row => {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) thuongNongByMSNV[foundMaNV] = (thuongNongByMSNV[foundMaNV] || 0) + (parseFloat(String(row.diemThuong || '0').replace(/,/g, '')) || 0);
        });

        const thuongNongThangTruocByMSNV = {};
        $thuongNongDataThangTruoc.forEach(row => {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) thuongNongThangTruocByMSNV[foundMaNV] = (thuongNongThangTruocByMSNV[foundMaNV] || 0) + (parseFloat(String(row.diemThuong || '0').replace(/,/g, '')) || 0);
        });

        // --- XỬ LÝ DỮ LIỆU ---
        return $danhSachNhanVien.map((employee) => {
            let data = {
                doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0,
                doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
                doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
                doanhThuTheoNganhHang: {}, 
                doanhThuTheoNhomHang: {}, 
                dynamicMetrics: {},
                qdc: {},
                dtICT: 0, dtCE: 0, dtPhuKien: 0, dtGiaDung: 0, dtSim: 0, dtVAS: 0, dtBaoHiem: 0, dtMLN: 0
            };

            if (sourceData && Array.isArray(sourceData)) {
                sourceData.forEach(row => {
                    const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                    if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                        
                        // [QUAN TRỌNG] Logic lọc dữ liệu theo yêu cầu
                        const hinhThucXuat = row.hinhThucXuat;
                        const trangThaiXuat = row.trangThaiXuat;
                        
                        const isDoanhThuHTX = !hinhThucXuat || hinhThucXuatTinhDoanhThu.has(hinhThucXuat);
                        // Chỉ lấy "Đã xuất" hoặc "Đã giao" (tùy dữ liệu gốc, ở đây dùng chuẩn 'Đã xuất')
                        const isDaXuat = !trangThaiXuat || trangThaiXuat.trim() === 'Đã xuất';

                        if (isDoanhThuHTX && isDaXuat) {
                            const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                            const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                            const heSo = heSoQuyDoi[row.nhomHang] || 1;
                            
                            // Tên nhóm hàng/ngành hàng trong dữ liệu (Full name)
                            const rawNhomHang = normalize(row.nhomHang);
                            const rawNganhHang = normalize(row.nganhHang);

                            // Tracking chi tiết
                            const trackMetric = (container, name) => {
                                if (!name) return;
                                const cleanName = utils.cleanCategoryName(name); 
                                if (!container[cleanName]) {
                                    container[cleanName] = { name: cleanName, revenue: 0, quantity: 0, revenueQuyDoi: 0 };
                                }
                                container[cleanName].revenue += thanhTien;
                                container[cleanName].quantity += soLuong;
                                container[cleanName].revenueQuyDoi += thanhTien * heSo;
                            }
                            trackMetric(data.doanhThuTheoNganhHang, row.nganhHang);
                            trackMetric(data.doanhThuTheoNhomHang, row.nhomHang);

                            data.doanhThu += thanhTien;
                            data.doanhThuQuyDoi += thanhTien * heSo;

                            if (hinhThucXuat && hinhThucXuatTraGop.has(hinhThucXuat)) {
                                data.doanhThuTraGop += thanhTien;
                            }

                            // --- LOGIC MAP MỚI: CHUỖI CHỨA CHUỖI ---
                            const checkAndAdd = (uiKey) => {
                                const keywords = uiKeywords[uiKey];
                                // Nếu tên trong data chứa bất kỳ từ khóa nào trong list rút gọn của Admin -> Cộng tiền
                                const isMatch = keywords.some(k => rawNhomHang.includes(k) || rawNganhHang.includes(k));
                                if (isMatch) {
                                    data[uiKey] += thanhTien;
                                }
                            };

                            checkAndAdd('dtICT');
                            checkAndAdd('dtCE');
                            checkAndAdd('dtPhuKien');
                            checkAndAdd('dtGiaDung');
                            checkAndAdd('dtMLN');
                            checkAndAdd('dtSim');
                            checkAndAdd('dtVAS');
                            checkAndAdd('dtBaoHiem');
                        }
                        // Xử lý chưa xuất
                        else if (trangThaiXuat === 'Chưa xuất') {
                            const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                            const heSo = heSoQuyDoi[row.nhomHang] || 1;
                            data.doanhThuChuaXuat += thanhTien;
                            data.doanhThuQuyDoiChuaXuat += thanhTien * heSo;
                        }
                    }
                });
            }

            // --- TÍNH CHỈ SỐ ĐỘNG (DYNAMIC) ---
            if ($efficiencyConfig && Array.isArray($efficiencyConfig)) {
                $efficiencyConfig.forEach(cfg => {
                    try {
                        if (!cfg.id || !cfg.groupA || !cfg.groupB) return;

                        const numType = cfg.typeA || cfg.type || 'DTTL';
                        const denType = cfg.typeB || (numType === 'SL' ? 'SL' : 'DTTL');

                        const calcValue = (groupList, type) => {
                            let total = 0;
                            // Duyệt qua danh sách tên rút gọn user cấu hình
                            groupList.forEach(shortName => {
                                const normShort = normalize(shortName);
                                // Quét toàn bộ bucket đã tính
                                const scanBucket = (bucket) => {
                                    for (const [key, val] of Object.entries(bucket)) {
                                        // Key trong bucket là tên đã cleanCategoryName
                                        // Ta so sánh: Nếu TênBucket chứa TênRútGọnAdmin
                                        if (normalize(key).includes(normShort)) {
                                            if (type === 'SL') total += val.quantity;
                                            else if (type === 'DTQD') total += val.revenueQuyDoi;
                                            else total += val.revenue;
                                        }
                                    }
                                };
                                scanBucket(data.doanhThuTheoNganhHang);
                                scanBucket(data.doanhThuTheoNhomHang);
                            });
                            return total;
                        };

                        const num = calcValue(cfg.groupA, numType);
                        const den = calcValue(cfg.groupB, denType);

                        data.dynamicMetrics[cfg.id] = {
                            value: den > 0 ? num / den : 0,
                            target: goalSettings && goalSettings[cfg.id] ? parseFloat(goalSettings[cfg.id]) : (cfg.target || 0),
                            label: cfg.label
                        };
                    } catch (e) {}
                });
            }

            // Tính % Cố định
            const totalRevenue = data.doanhThu > 0 ? data.doanhThu : 1;
            const pctPhuKien = data.dtPhuKien / totalRevenue;
            const pctGiaDung = data.dtGiaDung / totalRevenue;
            const pctMLN = data.dtMLN / totalRevenue;
            const pctSim = data.dtSim / totalRevenue;
            const pctVAS = data.dtVAS / totalRevenue;
            const pctBaoHiem = data.dtBaoHiem / totalRevenue;
            const hieuQuaQuyDoi = data.doanhThu > 0 ? (data.doanhThuQuyDoi / data.doanhThu) - 1 : 0;
            const tyLeTraCham = data.doanhThu > 0 ? data.doanhThuTraGop / data.doanhThu : 0;
            
            // Lương (Giữ nguyên)
            const gioCong = gioCongByMSNV[employee.maNV] || 0;
            const thuongNong = thuongNongByMSNV[employee.maNV] || 0;
            const erpEntry = $thuongERPData.find(e => e.name.includes(employee.hoTen));
            const thuongERP = erpEntry ? parseFloat(erpEntry.bonus.replace(/,/g, '')) : 0;
            const tongThuNhap = thuongNong + thuongERP;
            const today = new Date();
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            let thuNhapDuKien = (today.getDate() > 1) ? (tongThuNhap / (today.getDate() - 1)) * daysInMonth : tongThuNhap * daysInMonth;
            
            const thuongNongThangTruoc = thuongNongThangTruocByMSNV[employee.maNV] || 0;
            const erpEntryThangTruoc = $thuongERPDataThangTruoc.find(e => e.name.includes(employee.hoTen));
            const thuongERPThangTruoc = erpEntryThangTruoc ? parseFloat(erpEntryThangTruoc.bonus.replace(/,/g, '')) : 0;
            const thuNhapThangTruoc = (thuongNongThangTruoc || 0) + thuongERPThangTruoc;
            const chenhLechThuNhap = thuNhapDuKien - thuNhapThangTruoc;

            return { 
                ...employee, ...data, 
                pctPhuKien, pctGiaDung, pctMLN, pctSim, pctVAS, pctBaoHiem,
                hieuQuaQuyDoi, tyLeTraCham,
                gioCong, thuongNong, thuongERP, tongThuNhap, thuNhapDuKien, thuNhapThangTruoc, chenhLechThuNhap, 
                mucTieu: goalSettings 
            };
        });
    },

    aggregateReport(reportData, selectedWarehouse = null) {
        if (!reportData || reportData.length === 0) return {};

        const supermarketReport = reportData.reduce((acc, curr) => {
            // Cộng dồn các trường số (dtICT, dtPhuKien...)
            for (const key in curr) {
                if (typeof curr[key] === 'number') {
                    acc[key] = (acc[key] || 0) + curr[key];
                }
            }
            // Merge chi tiết
            ['doanhThuTheoNganhHang', 'doanhThuTheoNhomHang'].forEach(dictKey => {
                if(curr[dictKey]) {
                    if(!acc[dictKey]) acc[dictKey] = {};
                    Object.entries(curr[dictKey]).forEach(([k, v]) => {
                        if(!acc[dictKey][k]) acc[dictKey][k] = { ...v };
                        else {
                            acc[dictKey][k].revenue += v.revenue;
                            acc[dictKey][k].quantity += v.quantity;
                            acc[dictKey][k].revenueQuyDoi += v.revenueQuyDoi;
                        }
                    });
                }
            });
            return acc;
        }, { doanhThu: 0, dynamicMetrics: {} });

        supermarketReport.nganhHangChiTiet = supermarketReport.doanhThuTheoNganhHang;
        supermarketReport.nhomHangChiTiet = supermarketReport.doanhThuTheoNhomHang;

        // Tính % Tổng hợp
        const totalRevenue = supermarketReport.doanhThu || 1;
        supermarketReport.pctPhuKien = (supermarketReport.dtPhuKien || 0) / totalRevenue;
        supermarketReport.pctGiaDung = (supermarketReport.dtGiaDung || 0) / totalRevenue;
        supermarketReport.pctMLN = (supermarketReport.dtMLN || 0) / totalRevenue;
        supermarketReport.pctSim = (supermarketReport.dtSim || 0) / totalRevenue;
        supermarketReport.pctVAS = (supermarketReport.dtVAS || 0) / totalRevenue;
        supermarketReport.pctBaoHiem = (supermarketReport.dtBaoHiem || 0) / totalRevenue;
        supermarketReport.hieuQuaQuyDoi = (supermarketReport.doanhThuQuyDoi || 0) / totalRevenue - 1;
        supermarketReport.tyLeTraCham = (supermarketReport.doanhThuTraGop || 0) / totalRevenue;

        // Aggregate Dynamic Metrics (Đơn giản hóa: tính lại tỷ lệ trên tổng)
        const $efficiencyConfig = get(efficiencyConfig) || [];
        if (Array.isArray($efficiencyConfig)) {
            $efficiencyConfig.forEach(cfg => {
                // Logic tính tổng tương tự như loop nhân viên, nhưng trên data tổng
                // Để đơn giản, ta có thể cộng dồn từ các nhân viên, hoặc tính lại từ bucket tổng
                // Ở đây chọn cách tính lại từ bucket tổng để chính xác hơn
                try {
                    const numType = cfg.typeA || cfg.type || 'DTTL';
                    const denType = cfg.typeB || (numType === 'SL' ? 'SL' : 'DTTL');
                    
                    const calcVal = (groupList, type) => {
                        let total = 0;
                        groupList.forEach(short => {
                            const nShort = normalize(short);
                            const scan = (bucket) => {
                                for (const [k, v] of Object.entries(bucket)) {
                                    if (normalize(k).includes(nShort)) {
                                        if(type==='SL') total+=v.quantity;
                                        else if(type==='DTQD') total+=v.revenueQuyDoi;
                                        else total+=v.revenue;
                                    }
                                }
                            };
                            scan(supermarketReport.doanhThuTheoNganhHang);
                            scan(supermarketReport.doanhThuTheoNhomHang);
                        });
                        return total;
                    };
                    const num = calcVal(cfg.groupA || [], numType);
                    const den = calcVal(cfg.groupB || [], denType);
                    
                    supermarketReport.dynamicMetrics[cfg.id] = {
                        value: den > 0 ? num/den : 0,
                        target: cfg.target,
                        label: cfg.label
                    };
                } catch(e) {}
            });
        }

        return supermarketReport;
    }
};