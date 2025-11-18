// File: src/services/reportService.js
// Version 1.2 - Thêm logic báo cáo Thi Đua Vùng
import { get } from 'svelte/store';
import { config } from '../config.js';
// SỬA LỖI V1.1: Import * as utils thay vì { cleanCategoryName }
import * as utils from '../utils.js';
import { dataProcessing } from './dataProcessing.js';
import {
    danhSachNhanVien,
    // SỬA LỖI V1.1: Import các store cần thiết cho các hàm mới
    employeeMaNVMap,
    employeeNameToMaNVMap,
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    specialProductList,
    masterReportData,
    // === THÊM MỚI (V1.2) ===
    thiDuaVungChiTiet,
    thiDuaVungTong
    // === KẾT THÚC THÊM MỚI ===
} from '../stores.js';
// === THÊM MỚI (V1.2) ===
import { formatters } from '../utils/formatters.js';
// === KẾT THÚC THÊM MỚI ===

const reportGeneration = {
    // Logic `calculateSpecialProductReport` (Giữ nguyên)
    calculateSpecialProductReport(sourceYcxData, specialProgramConfigs) {
        const $specialProductList = get(specialProductList);
        if (!sourceYcxData || sourceYcxData.length === 0 ||
            !specialProgramConfigs || specialProgramConfigs.length === 0 ||
            !$specialProductList || $specialProductList.length === 0) {
            return [];
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const validSalesData = sourceYcxData.filter(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Đã xuất';
            return isBaseValid && isDoanhThuHTX;
        });
        if (validSalesData.length === 0) return [];

        const $danhSachNhanVien = get(danhSachNhanVien);
        const report = specialProgramConfigs.map(program => {
            const programGroups = new Set((program.groups || []).map(g => String(g).trim()));
            if (programGroups.size === 0) return null;

            const specialProductSet = new Set(
                $specialProductList
                    .filter(sp => programGroups.has(String(sp.nhomHang).trim()))
                    .map(sp => String(sp.maSanPham).trim())
            );

            const totalGroupSales = validSalesData.filter(row => 
                programGroups.has(String(row.nhomHang).trim())
            );
    
            if (totalGroupSales.length === 0) return null;

            const employeeResults = $danhSachNhanVien.map(employee => {
                const stats = { slDacQuyen: 0, slNhomHang: 0, dtDacQuyen: 0, dtNhomHang: 0 };
                const employeeSales = totalGroupSales.filter(row => {
                    const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                    return msnvMatch && msnvMatch[1].trim() === employee.maNV;
                });
                if (employeeSales.length === 0) {
                    return { ...employee, ...stats, tyLeSL: 0, tyLeDT: 0 };
                }

                employeeSales.forEach(row => {
                    const maSanPham = String(row.maSanPham || '').trim();
                    const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                    const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;

                    stats.slNhomHang += soLuong;
                    stats.dtNhomHang += thanhTien;

                    if (specialProductSet.has(maSanPham)) {
                        stats.slDacQuyen += soLuong;
                        stats.dtDacQuyen += thanhTien;
                    }
                });
                const tyLeSL = stats.slNhomHang > 0 ? (stats.slDacQuyen / stats.slNhomHang) : 0;
                const tyLeDT = stats.dtNhomHang > 0 ? (stats.dtDacQuyen / stats.dtNhomHang) : 0;

                return {
                    maNV: employee.maNV,
                    hoTen: employee.hoTen,
                    boPhan: employee.boPhan,
                    ...stats,
                    tyLeSL,
                    tyLeDT
                };
            }).filter(e => e.slNhomHang > 0); 

            return {
                program: program,
                employeeData: employeeResults,
            };
        }).filter(Boolean); 

        return report;
    },

    // Logic `calculateCompetitionFocusReport` [cite: 834-853] (Giữ nguyên)
    calculateCompetitionFocusReport(sourceYcxData, competitionConfigs) {
        if (!sourceYcxData || sourceYcxData.length === 0 || !competitionConfigs || competitionConfigs.length === 0) {
            return [];
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const validSalesData = sourceYcxData.filter(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                 (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Đã xuất';
            return isBaseValid && isDoanhThuHTX;
        });
        const $danhSachNhanVien = get(danhSachNhanVien);

        const report = competitionConfigs.map(config => {
            const cleanedConfigGroups = new Set((config.groups || []).map(g => utils.cleanCategoryName(g)));

            let baseSalesData = validSalesData.filter(row => {
                const cleanNhomHangFromYCX = utils.cleanCategoryName(row.nhomHang);
                const isInGroup = cleanedConfigGroups.has(cleanNhomHangFromYCX);
                
                if (!isInGroup) return false;

                if (config.type === 'soluong' && (config.minPrice > 0 || config.maxPrice > 0)) {
                    const price = (parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0) / (parseInt(String(row.soLuong || "1"), 10) || 1);
                    const minPrice = config.minPrice || 0;
                    const maxPrice = config.maxPrice || Infinity;
                    if (price < minPrice || price > maxPrice) return false;
                }
                return true;
            });

            if (config.excludeApple) {
                baseSalesData = baseSalesData.filter(row => row.nhaSanXuat !== 'Apple');
            }

            const employeeResults = $danhSachNhanVien.map(employee => {
                let performanceByBrand = {};
                let totalTargetRevenue = 0;
                let totalTargetQuantity = 0;
                let baseCategoryRevenue = 0;
                let baseCategoryQuantity = 0;

                baseSalesData.forEach(row => {
                    const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                     if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                        const revenueValue = (parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0);
                        const quantityValue = (parseInt(String(row.soLuong || "0"), 10) || 0);

                        baseCategoryRevenue += revenueValue;
                        baseCategoryQuantity += quantityValue;

                        const brand = row.nhaSanXuat;
                        if ((config.brands || []).includes(brand)) {
                            if (!performanceByBrand[brand]) {
                                performanceByBrand[brand] = { revenue: 0, quantity: 0 };
                            }
                            performanceByBrand[brand].revenue += revenueValue;
                            performanceByBrand[brand].quantity += quantityValue;

                            totalTargetRevenue += revenueValue;
                            totalTargetQuantity += quantityValue;
                        }
                    }
                });
                return {
                    maNV: employee.maNV,
                    hoTen: employee.hoTen,
                    boPhan: employee.boPhan,
                    performanceByBrand,
                    targetBrandsRevenue: totalTargetRevenue,
                    targetBrandsQuantity: totalTargetQuantity,
                    baseCategoryRevenue,
                    baseCategoryQuantity,
                    tyLeDT: baseCategoryRevenue > 0 ? (totalTargetRevenue / baseCategoryRevenue) : 0,
                    tyLeSL: baseCategoryQuantity > 0 ? (totalTargetQuantity / baseCategoryQuantity) : 0,
                };
            }).filter(e => e.baseCategoryRevenue > 0 || e.baseCategoryQuantity > 0);

            return {
                competition: config,
                employeeData: employeeResults,
            };
        }).filter(r => r.employeeData.length > 0);

        return report;
    },

    // === START: THÊM CÁC HÀM BỊ THIẾU (V1.1) ===
    
    /**
     * Tạo dữ liệu báo cáo tổng hợp.
     * [cite: 905-975]
     */
    generateMasterReportData: (sourceData, goalSettings, isRealtime = false) => {
        const $danhSachNhanVien = get(danhSachNhanVien);
        if ($danhSachNhanVien.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const hinhThucXuatTraGop = dataProcessing.getHinhThucXuatTraGop();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const PG = config.PRODUCT_GROUPS;
        const gioCongByMSNV = dataProcessing.processGioCongData();
        
        const $thuongNongData = get(thuongNongData);
        const $employeeNameToMaNVMap = get(employeeNameToMaNVMap);
        const $thuongNongDataThangTruoc = get(thuongNongDataThangTruoc);
        const $thuongERPData = get(thuongERPData);
        const $thuongERPDataThangTruoc = get(thuongERPDataThangTruoc);

        const thuongNongByMSNV = {};
        $thuongNongData.forEach(row => {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) {
                const diemThuongValue = parseFloat(String(row.diemThuong || '0').replace(/,/g, '')) || 0;
                thuongNongByMSNV[foundMaNV] = (thuongNongByMSNV[foundMaNV] || 0) + diemThuongValue;
            }
        });

        const thuongNongThangTruocByMSNV = {};
        $thuongNongDataThangTruoc.forEach(row => {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) {
                const diemThuongValue = parseFloat(String(row.diemThuong || '0').replace(/,/g, '')) || 0;
                thuongNongThangTruocByMSNV[foundMaNV] = (thuongNongThangTruocByMSNV[foundMaNV] || 0) + diemThuongValue;
            }
        });

        return $danhSachNhanVien.map((employee) => {
            let data = {
                doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0, doanhThuTraGopQuyDoi: 0,
                doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
                doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
                dtICT: 0, dtCE: 0, dtPhuKien: 0, dtGiaDung: 0, dtMLN: 0,
                slICT: 0, dtBaoHiem: 0, slBaoHiem: 0,
                slPhuKien: 0, slGiaDung: 0, slCE: 0, slPinSDP: 0, slCamera: 0,
                slTaiNgheBLT: 0, slNoiChien: 0, slMLN: 0, slRobotHB: 0,
                slBH1d1: 0, slBHXM: 0, slBHRV: 0, slBHMR: 0,
                dtTivi: 0, slTivi: 0, dtTuLanh: 0, slTuLanh: 0,
                dtMayGiat: 0, slMayGiat: 0, dtMayLanh: 0, slMayLanh: 0,
                dtDienThoai: 0, slDienThoai: 0, dtLaptop: 0, slLaptop: 0,
                doanhThuTheoNganhHang: {}, slSimOnline: 0, slUDDD: 0, slBaoHiemVAS: 0, slSmartphone: 0, slBaoHiemDenominator: 0,
                qdc: {}
            };

            for (const key in PG.QDC_GROUPS) data.qdc[key] = { sl: 0, dt: 0, dtqd: 0, name: PG.QDC_GROUPS[key].name };

            sourceData.forEach(row => {
                const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                    const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
                    const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && (row.trangThaiHuy || "").trim() === 'Chưa hủy' && (row.tinhTrangTra || "").trim() === 'Chưa trả';

                    if (isBaseValid && isDoanhThuHTX) {
                        const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                        if(isNaN(thanhTien)) return;

                         const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        const trangThaiXuat = (row.trangThaiXuat || "").trim();

                        const nhomHangCode = String(row.nhomHang || '').match(/^\d+/)?.[0] || null;
                        const nganhHangCode = String(row.nganhHang || '').match(/^\d+/)?.[0] || null;

                        const isICT = PG.ICT.includes(nhomHangCode);
                        const isCE = PG.CE.includes(nhomHangCode);
                        const isPhuKien = PG.PHU_KIEN.includes(nganhHangCode);
                        const isGiaDung = PG.GIA_DUNG.includes(nganhHangCode);
                        const isMLN = PG.MAY_LOC_NUOC.includes(nhomHangCode);

                        if (trangThaiXuat === 'Chưa xuất') {
                            data.doanhThuChuaXuat += thanhTien;
                            data.doanhThuQuyDoiChuaXuat += thanhTien * heSo;
                        } else if (trangThaiXuat === 'Đã xuất') {
                            const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                            if(isNaN(soLuong)) return;

                            const nganhHangName = utils.cleanCategoryName(row.nganhHang);

                            data.doanhThu += thanhTien;
                            data.doanhThuQuyDoi += thanhTien * heSo;

                            if (isRealtime && row.ngayTao && row.ngayHenGiao) {
                                const diffTime = row.ngayHenGiao - row.ngayTao;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays >= 2) {
                                    data.doanhThuGiaoXa += thanhTien;
                                    data.doanhThuQuyDoiGiaoXa += thanhTien * heSo;
                                }
                            }

                            if (hinhThucXuatTraGop.has(row.hinhThucXuat)) { data.doanhThuTraGop += thanhTien; data.doanhThuTraGopQuyDoi += thanhTien * heSo; }

                            if (nganhHangName) {
                                if (!data.doanhThuTheoNganhHang[nganhHangName]) data.doanhThuTheoNganhHang[nganhHangName] = { revenue: 0, quantity: 0, revenueQuyDoi: 0 };
                                data.doanhThuTheoNganhHang[nganhHangName].revenue += thanhTien;
                                data.doanhThuTheoNganhHang[nganhHangName].quantity += soLuong;
                                data.doanhThuTheoNganhHang[nganhHangName].revenueQuyDoi += thanhTien * heSo;
                            }

                            if (isICT) { data.dtICT += thanhTien; }
                            if (isCE) { data.dtCE += thanhTien; data.slCE += soLuong; }
                            if (isPhuKien) { data.dtPhuKien += thanhTien; data.slPhuKien += soLuong; }
                            if (isGiaDung) { data.dtGiaDung += thanhTien; data.slGiaDung += soLuong; }
                            if (isMLN) { data.dtMLN += thanhTien; data.slMLN += soLuong; }

                            if (PG.DIEN_THOAI.includes(nhomHangCode)) { data.dtDienThoai += thanhTien; data.slDienThoai += soLuong; }
                            if (PG.LAPTOP.includes(nhomHangCode)) { data.dtLaptop += thanhTien; data.slLaptop += soLuong; }
                            if (PG.TIVI.includes(nhomHangCode)) { data.dtTivi += thanhTien; data.slTivi += soLuong; }
                            if (PG.TU_LANH.includes(nhomHangCode)) { data.dtTuLanh += thanhTien; data.slTuLanh += soLuong; }
                            if (PG.MAY_GIAT.includes(nhomHangCode)) { data.dtMayGiat += thanhTien; data.slMayGiat += soLuong; }
                            if (PG.MAY_LANH.includes(nhomHangCode)) { data.dtMayLanh += thanhTien; data.slMayLanh += soLuong; }

                            const loaiBaoHiem = dataProcessing.classifyInsurance(row.tenSanPham);
                            if (loaiBaoHiem) {
                                data.dtBaoHiem += thanhTien; data.slBaoHiem += soLuong;
                                if (loaiBaoHiem === 'BH1d1') data.slBH1d1 += soLuong;
                                if (loaiBaoHiem === 'BHXM') data.slBHXM += soLuong;
                                if (loaiBaoHiem === 'BHRV') data.slBHRV += soLuong;
                                if (loaiBaoHiem === 'BHMR') data.slBHMR += soLuong;
                            }
                            if (nhomHangCode === PG.PIN_SDP) data.slPinSDP += soLuong;
                            if (nhomHangCode === PG.CAMERA_TRONG_NHA || nhomHangCode === PG.CAMERA_NGOAI_TROI) data.slCamera += soLuong;
                            if (nhomHangCode === PG.TAI_NGHE_BLT) data.slTaiNgheBLT += soLuong;
                            if (nhomHangCode === PG.NOI_CHIEN) data.slNoiChien += soLuong;
                            if (nhomHangCode === PG.ROBOT_HB) data.slRobotHB += soLuong;

                            if (PG.SIM.includes(nhomHangCode)) data.slSimOnline += soLuong;
                            if (PG.VAS.includes(nhomHangCode)) data.slUDDD += soLuong;
                            if (PG.SMARTPHONE.includes(nhomHangCode)) data.slSmartphone += soLuong;
                            if (PG.BAO_HIEM_VAS.includes(nhomHangCode)) data.slBaoHiemVAS += soLuong;
                            if (PG.BAO_HIEM_DENOMINATOR.includes(nhomHangCode)) data.slBaoHiemDenominator += soLuong;
                            for (const key in PG.QDC_GROUPS) if (PG.QDC_GROUPS[key].codes.includes(nhomHangCode)) {
                                data.qdc[key].sl += soLuong; data.qdc[key].dt += thanhTien; data.qdc[key].dtqd += thanhTien * heSo;
                            }
                        }
                    }
                }
            });

            data.slICT = data.slDienThoai + data.slLaptop;
            const gioCong = gioCongByMSNV[employee.maNV] || 0;
            const thuongNong = thuongNongByMSNV[employee.maNV] || 0;
            const erpEntry = $thuongERPData.find(e => e.name.includes(employee.hoTen));
            const thuongERP = erpEntry ? parseFloat(erpEntry.bonus.replace(/,/g, '')) : 0;
            const tongThuNhap = thuongNong + thuongERP;
            const today = new Date();
            const currentDay = today.getDate();
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            let thuNhapDuKien = 0;
            if (currentDay > 1) thuNhapDuKien = (tongThuNhap / (currentDay - 1)) * daysInMonth;
            else if (currentDay === 1) thuNhapDuKien = tongThuNhap * daysInMonth;

            const thuongNongThangTruoc = thuongNongThangTruocByMSNV[employee.maNV] || 0;
            const erpEntryThangTruoc = $thuongERPDataThangTruoc.find(e => e.name.includes(employee.hoTen));
            const thuongERPThangTruoc = erpEntryThangTruoc ? parseFloat(erpEntryThangTruoc.bonus.replace(/,/g, '')) : 0;
            const thuNhapThangTruoc = thuongNongThangTruoc + thuongERPThangTruoc;
            const chenhLechThuNhap = thuNhapDuKien - thuNhapThangTruoc;

            const hieuQuaQuyDoi = data.doanhThu > 0 ? (data.doanhThuQuyDoi / data.doanhThu) - 1 : 0;
            const tyLeTraCham = data.doanhThu > 0 ? data.doanhThuTraGop / data.doanhThu : 0;
            const pctPhuKien = data.dtICT > 0 ? data.dtPhuKien / data.dtICT : 0;
            const pctGiaDung = data.dtCE > 0 ? data.dtGiaDung / data.dtCE : 0;
            const pctMLN = data.dtCE > 0 ? data.dtMLN / data.dtCE : 0;
            const pctSim = data.slSmartphone > 0 ? data.slSimOnline / data.slSmartphone : 0;
            const pctVAS = data.slSmartphone > 0 ? data.slUDDD / data.slSmartphone : 0;
            const pctBaoHiem = data.slBaoHiemDenominator > 0 ? data.slBaoHiemVAS / data.slBaoHiemDenominator : 0;
            data.donGiaTivi = data.slTivi > 0 ? data.dtTivi / data.slTivi : 0;
            data.donGiaTuLanh = data.slTuLanh > 0 ? data.dtTuLanh / data.slTuLanh : 0;
            data.donGiaMayGiat = data.slMayGiat > 0 ? data.dtMayGiat / data.slMayGiat : 0;
            data.donGiaMayLanh = data.slMayLanh > 0 ? data.dtMayLanh / data.slMayLanh : 0;
            data.donGiaDienThoai = data.slDienThoai > 0 ? data.dtDienThoai / data.slDienThoai : 0;
            data.donGiaLaptop = data.slLaptop > 0 ? data.dtLaptop / data.slLaptop : 0;
            const totalQuantity = Object.values(data.doanhThuTheoNganhHang).reduce((sum, category) => sum + category.quantity, 0);
            const donGiaTrungBinh = totalQuantity > 0 ? data.doanhThu / totalQuantity : 0;

            return { ...employee, ...data, gioCong, thuongNong, thuongERP, tongThuNhap, thuNhapDuKien, thuNhapThangTruoc, chenhLechThuNhap, hieuQuaQuyDoi, tyLeTraCham, pctPhuKien, pctGiaDung, pctMLN, pctSim, pctVAS, pctBaoHiem, donGiaTrungBinh, mucTieu: goalSettings };
        });
    },

    /**
     * Tạo báo cáo doanh thu chưa xuất.
     * [cite: 976-985]
     */
    generateLuyKeChuaXuatReport(sourceYcxData) {
        if (!sourceYcxData || sourceYcxData.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const report = {};

        sourceYcxData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Chưa xuất';

            if (isBaseValid && isDoanhThuHTX) {
                const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                if (isNaN(thanhTien) || isNaN(soLuong)) return;

                const nganhHangName = utils.cleanCategoryName(row.nganhHang);
                const heSo = heSoQuyDoi[row.nhomHang] || 1;

                if (!report[nganhHangName]) {
                    report[nganhHangName] = {
                        nganhHang: nganhHangName,
                        soLuong: 0,
                        doanhThuThuc: 0,
                        doanhThuQuyDoi: 0
                    };
                }

                report[nganhHangName].soLuong += soLuong;
                report[nganhHangName].doanhThuThuc += thanhTien;
                report[nganhHangName].doanhThuQuyDoi += thanhTien * heSo;
            }
        });

        return Object.values(report);
    },

    /**
     * Tạo báo cáo realtime chưa xuất.
     * [cite: 986-995]
     */
    generateRealtimeChuaXuatReport(sourceRealtimeYcxData) {
        if (!sourceRealtimeYcxData || sourceRealtimeYcxData.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const report = {};

        sourceRealtimeYcxData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Chưa xuất';

            if (isBaseValid && isDoanhThuHTX) {
                const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                if (isNaN(thanhTien) || isNaN(soLuong)) return;

                const nganhHangName = utils.cleanCategoryName(row.nganhHang);
                const heSo = heSoQuyDoi[row.nhomHang] || 1;

                if (!report[nganhHangName]) {
                    report[nganhHangName] = {
                        nganhHang: nganhHangName,
                        soLuong: 0,
                        doanhThuThuc: 0,
                        doanhThuQuyDoi: 0
                    };
                }

                report[nganhHangName].soLuong += soLuong;
                report[nganhHangName].doanhThuThuc += thanhTien;
                report[nganhHangName].doanhThuQuyDoi += thanhTien * heSo;
            }
        });

        return Object.values(report);
    },

    /**
     * Tính trung bình bộ phận.
     * [cite: 996-1005]
     */
    calculateDepartmentAverages(departmentName, reportData) {
        const departmentEmployees = reportData.filter(e => e.boPhan === departmentName);
        if (departmentEmployees.length === 0) return {};

        const totals = departmentEmployees.reduce((acc, curr) => {
            Object.keys(curr).forEach(key => {
                if (typeof curr[key] === 'number') acc[key] = (acc[key] || 0) + curr[key];
                if (key === 'qdc' && typeof curr[key] === 'object') {
                    if (!acc.qdc) acc.qdc = {};
                    for (const qdcKey in curr.qdc) {
                        if (!acc.qdc[qdcKey]) acc.qdc[qdcKey] = { sl: 0, dt: 0, dtqd: 0 };
                        acc.qdc[qdcKey].sl += curr.qdc[qdcKey].sl;
                        acc.qdc[qdcKey].dt += curr.qdc[qdcKey].dt;
                        acc.qdc[qdcKey].dtqd += curr.qdc[qdcKey].dtqd;
                    }
                }
            });
            return acc;
        }, {});

        const averages = {};
        for (const key in totals) {
            if (key !== 'qdc') averages[key] = totals[key] / departmentEmployees.length;
            else {
                averages.qdc = {};
                for (const qdcKey in totals.qdc) averages.qdc[qdcKey] = {
                    sl: totals.qdc[qdcKey].sl / departmentEmployees.length,
                    dt: totals.qdc[qdcKey].dt / departmentEmployees.length,
                    dtqd: totals.qdc[qdcKey].dtqd / departmentEmployees.length
                };
            }
        }
        return averages;
    },

    /**
     * Tạo báo cáo chi tiết realtime cho nhân viên.
     * [cite: 1006-1022]
     */
    generateRealtimeEmployeeDetailReport(employeeMaNV, realtimeYCXData) {
        if (!employeeMaNV || !realtimeYCXData || realtimeYCXData.length === 0) return null;

        const employeeData = realtimeYCXData.filter(row => {
            const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
            return msnvMatch && msnvMatch[1].trim() === String(employeeMaNV);
        });

        if (employeeData.length === 0) return null;

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();

        const summary = {
            totalRealRevenue: 0,
            totalConvertedRevenue: 0,
            unexportedRevenue: 0
        };
        const byProductGroup = {};
        const byCustomer = {};

        employeeData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && (row.trangThaiHuy || "").trim() === 'Chưa hủy' && (row.tinhTrangTra || "").trim() === 'Chưa trả';

            if (isDoanhThuHTX && isBaseValid) {
                const realRevenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const quantity = parseInt(String(row.soLuong || "0"), 10) || 0;
                const heSo = heSoQuyDoi[row.nhomHang] || 1;
                const convertedRevenue = realRevenue * heSo;
                const groupName = utils.cleanCategoryName(row.nhomHang || 'Khác');
                const customerName = row.tenKhachHang || 'Khách lẻ';

                if ((row.trangThaiXuat || "").trim() === 'Đã xuất') {
                    summary.totalRealRevenue += realRevenue;
                    summary.totalConvertedRevenue += convertedRevenue;

                    if (!byProductGroup[groupName]) {
                        byProductGroup[groupName] = { name: groupName, quantity: 0, realRevenue: 0, convertedRevenue: 0 };
                    }
                    byProductGroup[groupName].quantity += quantity;
                    byProductGroup[groupName].realRevenue += realRevenue;
                    byProductGroup[groupName].convertedRevenue += convertedRevenue;

                    if (!byCustomer[customerName]) {
                        byCustomer[customerName] = { name: customerName, products: [], totalQuantity: 0 };
                    }
                    byCustomer[customerName].products.push({
                        productName: row.tenSanPham,
                        quantity: quantity,
                        realRevenue: realRevenue,
                        convertedRevenue: convertedRevenue,
                    });
                    byCustomer[customerName].totalQuantity += quantity;
                } else if ((row.trangThaiXuat || "").trim() === 'Chưa xuất') {
                    summary.unexportedRevenue += convertedRevenue;
                }
            }
        });

        summary.totalOrders = Object.keys(byCustomer).length;
        summary.bundledOrderCount = Object.values(byCustomer).filter(c => c.totalQuantity > 1).length;
        summary.conversionRate = summary.totalRealRevenue > 0 ? (summary.totalConvertedRevenue / summary.totalRealRevenue) - 1 : 0;

        return {
            summary,
            byProductGroup: Object.values(byProductGroup).sort((a, b) => b.realRevenue - a.realRevenue),
            byCustomer: Object.values(byCustomer)
        };
    },

    /**
     * Tạo báo cáo chi tiết lũy kế cho nhân viên.
     * [cite: 1023-1061]
     */
    generateLuyKeEmployeeDetailReport(employeeMaNV, luykeYCXData) {
        if (!employeeMaNV || !luykeYCXData || luykeYCXData.length === 0) {
            return null;
        }

        const employeeData = luykeYCXData.filter(row => {
            const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
            return msnvMatch && msnvMatch[1].trim() === String(employeeMaNV);
        });

        if (employeeData.length === 0) {
             return null;
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();

        const summary = {
            totalRealRevenue: 0,
            totalConvertedRevenue: 0,
            unexportedRevenue: 0, 
        };
        const byProductGroup = {};
        const byCustomer = {};
        const categoryChartDataMap = {};
        const dailyStats = {}; 
        const unexportedDetails = {};
        
        const $masterReportData = get(masterReportData);
        const employeeMasterData = $masterReportData.sknv.find(e => String(e.maNV) === String(employeeMaNV));
        if (employeeMasterData) {
            summary.unexportedRevenue = employeeMasterData.doanhThuChuaXuat || 0;
        }

        employeeData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả';

            if (isDoanhThuHTX && isBaseValid) {
                const realRevenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const quantity = parseInt(String(row.soLuong || "0"), 10) || 0;
                if(isNaN(realRevenue) || isNaN(quantity)) return;

                const heSo = heSoQuyDoi[row.nhomHang] || 1;
                const convertedRevenue = realRevenue * heSo;
                const groupName = utils.cleanCategoryName(row.nhomHang || 'Khác');
                const customerName = row.tenKhachHang || 'Khách Lẻ';
                const categoryName = utils.cleanCategoryName(row.nganhHang || 'Khác');
                const productName = row.tenSanPham || 'Không rõ';
                
                if ((row.trangThaiXuat || "").trim() === 'Đã xuất') {
                    summary.totalRealRevenue += realRevenue;
                    summary.totalConvertedRevenue += convertedRevenue;

                    if (!byProductGroup[groupName]) {
                        byProductGroup[groupName] = { name: groupName, quantity: 0, realRevenue: 0, convertedRevenue: 0 };
                    }
                    byProductGroup[groupName].quantity += quantity;
                    byProductGroup[groupName].realRevenue += realRevenue;
                    byProductGroup[groupName].convertedRevenue += convertedRevenue;

                    if (!categoryChartDataMap[categoryName]) {
                        categoryChartDataMap[categoryName] = { name: categoryName, revenue: 0 };
                    }
                    categoryChartDataMap[categoryName].revenue += realRevenue;
                    if (!byCustomer[customerName]) {
                        byCustomer[customerName] = { name: customerName, products: [], totalQuantity: 0, totalRealRevenue: 0, totalConvertedRevenue: 0 };
                    }
                    byCustomer[customerName].products.push({
                        productName: row.tenSanPham,
                        quantity: quantity,
                        realRevenue: realRevenue,
                        convertedRevenue: convertedRevenue,
                    });
                    byCustomer[customerName].totalQuantity += quantity;
                    byCustomer[customerName].totalRealRevenue += realRevenue;
                    byCustomer[customerName].totalConvertedRevenue += convertedRevenue;
                    
                    const ngayTao = row.ngayTao;
                    if (ngayTao instanceof Date) {
                        const dateString = ngayTao.toISOString().split('T')[0];
                        if (!dailyStats[dateString]) {
                            dailyStats[dateString] = { date: ngayTao, revenue: 0, convertedRevenue: 0 };
                        }
                        dailyStats[dateString].revenue += realRevenue;
                        dailyStats[dateString].convertedRevenue += convertedRevenue;
                    }

                } else if ((row.trangThaiXuat || "").trim() === 'Chưa xuất') {
                    if (!unexportedDetails[groupName]) {
                        unexportedDetails[groupName] = { name: groupName, totalSL: 0, totalDTQD: 0, products: {} };
                    }
                    if (!unexportedDetails[groupName].products[productName]) {
                        unexportedDetails[groupName].products[productName] = { name: productName, sl: 0, dtqd: 0 };
                    }
                    unexportedDetails[groupName].products[productName].sl += quantity;
                    unexportedDetails[groupName].products[productName].dtqd += convertedRevenue;
                    unexportedDetails[groupName].totalSL += quantity;
                    unexportedDetails[groupName].totalDTQD += convertedRevenue;
                }
            }
        });

        summary.totalOrders = Object.keys(byCustomer).length;
        summary.bundledOrderCount = Object.values(byCustomer).filter(c => c.products.length > 1).length;
        summary.conversionRate = summary.totalRealRevenue > 0 ? (summary.totalConvertedRevenue / summary.totalRealRevenue) - 1 : 0;

        for (const customerName in byCustomer) {
            const customer = byCustomer[customerName];
            customer.conversionRate = customer.totalRealRevenue > 0 ? (customer.totalConvertedRevenue / customer.totalRealRevenue) - 1 : 0;
        }
        for (const groupName in byProductGroup) {
            const group = byProductGroup[groupName];
            group.conversionRate = group.realRevenue > 0 ? (group.convertedRevenue / group.realRevenue) - 1 : 0;
        }

        const finalDailyStats = Object.values(dailyStats).sort((a, b) => a.date - b.date);
        const finalUnexportedDetails = Object.values(unexportedDetails)
            .map(group => ({
                ...group,
                products: Object.values(group.products).sort((a, b) => b.dtqd - a.dtqd)
            }))
            .sort((a, b) => b.totalDTQD - a.totalDTQD);

        return {
            summary,
            topProductGroups: Object.values(byProductGroup)
                .sort((a, b) => b.realRevenue - a.realRevenue)
                .slice(0, 8),
            categoryChartData: Object.values(categoryChartDataMap),
            byCustomer: Object.values(byCustomer)
                .sort((a,b) => b.totalRealRevenue - a.totalRealRevenue),
            dailyStats: finalDailyStats, 
            unexportedDetails: finalUnexportedDetails 
        };
    },

    /**
     * Tạo báo cáo realtime theo hãng.
     * [cite: 1062-1069]
     */
    generateRealtimeBrandReport(realtimeYCXData, selectedCategory, selectedBrand) {
        if (!realtimeYCXData || realtimeYCXData.length === 0) return { byBrand: [], byEmployee: [] };
        
        const $employeeMaNVMap = get(employeeMaNVMap);

        const filteredData = realtimeYCXData.filter(row => {
            const categoryMatch = !selectedCategory || utils.cleanCategoryName(row.nganhHang) === selectedCategory;
            const brandMatch = !selectedBrand || (row.nhaSanXuat || 'Hãng khác') === selectedBrand;
            const isDoanhThuHTX = dataProcessing.getHinhThucXuatTinhDoanhThu().has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && (row.trangThaiHuy || "").trim() === 'Chưa hủy' && (row.tinhTrangTra || "").trim() === 'Chưa trả' && (row.trangThaiXuat || "").trim() === 'Đã xuất';

            return categoryMatch && brandMatch && isDoanhThuHTX && isBaseValid;
        });

        const byBrand = {};
        const byEmployee = {};

        filteredData.forEach(row => {
            const brand = row.nhaSanXuat || 'Hãng khác';
            const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
            const employeeId = msnvMatch ? msnvMatch[1].trim() : 'Unknown';
            const realRevenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
            const quantity = parseInt(String(row.soLuong || "0"), 10) || 0;

            if (!byBrand[brand]) {
                byBrand[brand] = { name: brand, quantity: 0, revenue: 0 };
            }
            byBrand[brand].quantity += quantity;
            byBrand[brand].revenue += realRevenue;

            if (!byEmployee[employeeId]) {
                const employeeInfo = $employeeMaNVMap.get(employeeId);
                byEmployee[employeeId] = { id: employeeId, name: employeeInfo ? employeeInfo.hoTen : `NV ${employeeId}`, quantity: 0, revenue: 0 };
            }
            byEmployee[employeeId].quantity += quantity;
            byEmployee[employeeId].revenue += realRevenue;
        });

        const brandArray = Object.values(byBrand).map(b => ({...b, avgPrice: b.quantity > 0 ? b.revenue / b.quantity : 0})).sort((a,b) => b.revenue - a.revenue);
        const employeeArray = Object.values(byEmployee).sort((a,b) => b.revenue - a.revenue);

        return { byBrand: brandArray, byEmployee: employeeArray };
    },

    /**
     * Tổng hợp báo cáo (dùng cho Supermarket).
     * [cite: 996-1005]
     */
    aggregateReport(reportData, selectedWarehouse = null) {
        if (!reportData || reportData.length === 0) {
            const emptyShell = { doanhThu: 0, doanhThuQuyDoi: 0, dtCE: 0, dtICT: 0, qdc: {}, nganhHangChiTiet: {}, comparisonData: { value: 0, percentage: 'N/A' } };
            const numericKeys = ['doanhThuTraGop', 'doanhThuChuaXuat','doanhThuQuyDoiChuaXuat', 'dtGiaDung', 'dtMLN', 'dtPhuKien', 'slSmartphone', 'slSimOnline', 'slUDDD', 'slBaoHiemDenominator', 'slBaoHiemVAS'];
            numericKeys.forEach(key => emptyShell[key] = 0);
            return emptyShell;
        }

        const supermarketReport = reportData.reduce((acc, curr) => {
            for (const key in curr) {
                if (typeof curr[key] === 'number') {
                    acc[key] = (acc[key] || 0) + curr[key];
                } else if (key === 'qdc' && typeof curr.qdc === 'object') {
                    if (!acc.qdc) acc.qdc = {};
                    for (const qdcKey in curr.qdc) {
                        if (!acc.qdc[qdcKey]) acc.qdc[qdcKey] = { sl: 0, dt: 0, dtqd: 0, name: curr.qdc[qdcKey].name };
                        acc.qdc[qdcKey].sl += curr.qdc[qdcKey].sl;
                        acc.qdc[qdcKey].dt += curr.qdc[qdcKey].dt;
                        acc.qdc[qdcKey].dtqd += curr.qdc[qdcKey].dtqd;
                    }
                }
            }
            acc.maKho = selectedWarehouse || '';
            return acc;
        }, {});

        const aggregatedNganhHang = {};
        reportData.forEach(employee => {
            if (employee.doanhThuTheoNganhHang) {
                Object.entries(employee.doanhThuTheoNganhHang).forEach(([name, values]) => {
                    if (!aggregatedNganhHang[name]) aggregatedNganhHang[name] = { name: name, quantity: 0, revenue: 0, revenueQuyDoi: 0, donGia: 0 };
                    aggregatedNganhHang[name].quantity += values.quantity;
                    aggregatedNganhHang[name].revenue += values.revenue;
                    aggregatedNganhHang[name].revenueQuyDoi += values.revenueQuyDoi;
                });
            }
        });
        for (const name in aggregatedNganhHang) {
            const item = aggregatedNganhHang[name];
            item.donGia = item.quantity > 0 ? item.revenue / item.quantity : 0;
        }
        supermarketReport.nganhHangChiTiet = aggregatedNganhHang;

        supermarketReport.hieuQuaQuyDoi = supermarketReport.doanhThu > 0 ? (supermarketReport.doanhThuQuyDoi / supermarketReport.doanhThu) - 1 : 0;
        supermarketReport.tyLeTraCham = supermarketReport.doanhThu > 0 ? supermarketReport.doanhThuTraGop / supermarketReport.doanhThu : 0;
        supermarketReport.pctGiaDung = supermarketReport.dtCE > 0 ? supermarketReport.dtGiaDung / supermarketReport.dtCE : 0;
        supermarketReport.pctMLN = supermarketReport.dtCE > 0 ? supermarketReport.dtMLN / supermarketReport.dtCE : 0;
        supermarketReport.pctPhuKien = supermarketReport.dtICT > 0 ? supermarketReport.dtPhuKien / supermarketReport.dtICT : 0;
        supermarketReport.pctSim = supermarketReport.slSmartphone > 0 ? supermarketReport.slSimOnline / supermarketReport.slSmartphone : 0;
        supermarketReport.pctVAS = supermarketReport.slSmartphone > 0 ? supermarketReport.slUDDD / supermarketReport.slSmartphone : 0;
        supermarketReport.pctBaoHiem = supermarketReport.slBaoHiemDenominator > 0 ? supermarketReport.slBaoHiemVAS / supermarketReport.slBaoHiemDenominator : 0;

        // Tạm thời vô hiệu hóa việc đọc DOM, vì chúng ta chưa có component đó
        // const pastedLuyKeData = dataProcessing.parseLuyKePastedData(document.getElementById('paste-luyke')?.value || '');
        // supermarketReport.comparisonData = pastedLuyKeData.comparisonData;
        supermarketReport.comparisonData = { value: 0, percentage: 'N/A' }; // Giá trị tạm thời


        if (supermarketReport.qdc) {
            for (const key in supermarketReport.qdc) {
                const group = supermarketReport.qdc[key];
                group.donGia = group.sl > 0 ? group.dt / group.sl : 0;
            }
        }

        return supermarketReport;
    },
    
    // === START: DI CHUYỂN TỪ DỰ ÁN CŨ ===
    generateThiDuaVungReport(selectedSupermarket) {
        const $thiDuaVungChiTiet = get(thiDuaVungChiTiet);
        const $thiDuaVungTong = get(thiDuaVungTong);

        if (!selectedSupermarket || !$thiDuaVungChiTiet || $thiDuaVungChiTiet.length === 0 || !$thiDuaVungTong || $thiDuaVungTong.length === 0) {
            return null;
        }

        const findKey = (data, keyword) => {
            if (!data || data.length === 0) return null;
            return Object.keys(data[0]).find(k => k.trim().toLowerCase().includes(keyword.toLowerCase())) || keyword;
        };
        const supermarketKeyTong = findKey($thiDuaVungTong, 'siêu thị');
        const supermarketKeyChiTiet = findKey($thiDuaVungChiTiet, 'siêu thị');
        const tongThuongKey = findKey($thiDuaVungChiTiet, 'tổng thưởng');
        const hangVuotTroiKey = findKey($thiDuaVungChiTiet, 'hạng vượt trội');
        const hangTargetKey = findKey($thiDuaVungChiTiet, 'hạng % target');
        const layTopKey = findKey($thiDuaVungChiTiet, 'lấy top');
        const kenhKey = findKey($thiDuaVungChiTiet, 'kênh');
        const nganhHangKey = findKey($thiDuaVungChiTiet, 'ngành hàng');

        if (!supermarketKeyTong || !supermarketKeyChiTiet) {
            console.error("Không thể tìm thấy cột 'siêu thị' trong dữ liệu.");
            return null;
        }

        const summary = $thiDuaVungTong.find(row => row[supermarketKeyTong] === selectedSupermarket);
        if (!summary) return null;

        const chiTiet = $thiDuaVungChiTiet.filter(row => row[supermarketKeyChiTiet] === selectedSupermarket);

        if (chiTiet.length > 0 && layTopKey) {
            summary.hangCoGiaiKenh = chiTiet[0][layTopKey];
        } else {
            summary.hangCoGiaiKenh = 'N/A';
        }

        const report = { summary, coGiai: [], sapCoGiai: [], tiemNang: [], canCoGangNhieu: [] };

        const getPotentialPrize = (kenh, nganhHang) => {
            const winningSupermarkets = $thiDuaVungChiTiet.filter(sm =>
                sm[kenhKey] === kenh && sm[nganhHangKey] === nganhHang && sm[tongThuongKey] > 0
            );
            if (winningSupermarkets.length === 0) return 0;
            return Math.min(...winningSupermarkets.map(s => s[tongThuongKey]));
        };

        chiTiet.forEach(nganhHang => {
            if (nganhHang[tongThuongKey] > 0) {
                report.coGiai.push(nganhHang);
            } else {
                const hangVuotTroi = nganhHang[hangVuotTroiKey] || Infinity;
                const hangTarget = nganhHang[hangTargetKey] || Infinity;
                const hangCoGiai = nganhHang[layTopKey] || 0;

                const khoangCach = Math.min(
                    (hangVuotTroi > 0 && hangVuotTroi > hangCoGiai) ? hangVuotTroi - hangCoGiai : Infinity,
                    (hangTarget > 0 && hangTarget > hangCoGiai) ? hangTarget - hangCoGiai : Infinity
                );
                nganhHang.khoangCach = khoangCach;

                if (hangCoGiai > 0 && khoangCach <= 20) {
                    nganhHang.thuongTiemNang = getPotentialPrize(nganhHang[kenhKey], nganhHang[nganhHangKey]);
                    report.sapCoGiai.push(nganhHang);
                } else if (hangCoGiai > 0 && khoangCach > 20 && khoangCach <= 40) {
                    report.tiemNang.push(nganhHang);
                } else {
                    report.canCoGangNhieu.push(nganhHang);
                }
            }
        });

        report.coGiai.sort((a, b) => b[tongThuongKey] - a[tongThuongKey]);
        report.sapCoGiai.sort((a, b) => a.khoangCach - b.khoangCach);
        report.tiemNang.sort((a, b) => a.khoangCach - b.khoangCach);

        return report;
    }
    // === KẾT THÚC: DI CHUYỂN TỪ DỰ ÁN CŨ ===
};

// Export đối tượng
export const reportService = reportGeneration;