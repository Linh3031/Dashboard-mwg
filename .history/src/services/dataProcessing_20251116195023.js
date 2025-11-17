// Version 1.8 - Fix: Sửa lỗi ReferenceError (HE_SO_QY_DOI -> HE_SO_QUY_DOI)
// MODULE: SERVICES - DATA PROCESSING
// Chứa các hàm xử lý, chuẩn hóa, và phân tích cú pháp dữ liệu thô.

import { get } from 'svelte/store';
import { config } from '../config.js'; 
import { cleanCategoryName, getSortedDepartmentList } from '../utils.js'; 

// Import các store Svelte
import {
    declarations,
    debugInfo,
    rawGioCongData,
    employeeNameToMaNVMap,
    danhSachNhanVien,
    employeeMaNVMap,
    competitionData,
    competitionNameMappings,
    masterReportData,
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    specialProductList
} from '../stores.js';

export const dataProcessing = {
    /**
     * Phân tích một tập dữ liệu YCX thô để gỡ lỗi các điều kiện lọc thi đua.
     */
    debugCompetitionFiltering(rawTestData) {
        if (!rawTestData || rawTestData.length === 0) {
            return [];
        }

        const { normalizedData } = this.normalizeData(rawTestData, 'ycx');
        if (normalizedData.length === 0) {
            return [];
        }

        const hinhThucXuatTinhDoanhThu = this.getHinhThucXuatTinhDoanhThu();

        const debugResults = normalizedData.map(row => {
            const checks = {
                isDoanhThuHTX: hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat),
                isThuTien: (row.trangThaiThuTien || "").trim() === 'Đã thu',
                isChuaHuy: (row.trangThaiHuy || "").trim() === 'Chưa hủy',
                isChuaTra: (row.tinhTrangTra || "").trim() === 'Chưa trả',
                isDaXuat: (row.trangThaiXuat || "").trim() === 'Đã xuất'
            };

            const isOverallValid = checks.isDoanhThuHTX && checks.isThuTien && checks.isChuaHuy && checks.isChuaTra && checks.isDaXuat;

            return {
                rowData: row,
                checks: checks,
                isOverallValid: isOverallValid
            };
        });

        return debugResults;
    },

    /**
     * Chuẩn hóa dữ liệu từ file Cấu trúc Ngành hàng.
     */
    normalizeCategoryStructureData(rawData) {
        if (!rawData || rawData.length === 0) {
            return { success: false, error: 'File rỗng.', normalizedData: [] };
        }
        const header = Object.keys(rawData[0] || {});

        const nganhHangCol = this.findColumnName(header, ['ngành hàng', 'nganh hang']);
        const nhomHangCol = this.findColumnName(header, ['nhóm hàng', 'nhom hang']);

        if (!nganhHangCol || !nhomHangCol) {
            return { success: false, error: 'File phải có cột "Ngành hàng" và "Nhóm hàng".', normalizedData: [] };
        }

        const normalizedData = rawData
            .map(row => ({
                nganhHang: String(row[nganhHangCol] || '').trim(),
                nhomHang: String(row[nhomHangCol] || '').trim(),
            }))
            .filter(item => item.nganhHang && item.nhomHang);

        return { success: true, normalizedData };
    },
    
    /**
     * Chuẩn hóa dữ liệu từ file Sản Phẩm Đặc Quyền.
     */
    normalizeSpecialProductData(rawData) {
        if (!rawData || rawData.length === 0) {
            return { success: false, error: 'File rỗng.', normalizedData: [] };
        }
        const header = Object.keys(rawData[0] || {});

        const maSpCol = this.findColumnName(header, ['mã sản phẩm', 'masanpham', 'mã sp', 'product code']);
        const nhomHangCol = this.findColumnName(header, ['nhóm hàng', 'nhom hang']);
        const tenSpCol = this.findColumnName(header, ['tên sản phẩm', 'tensanpham', 'tên sp']);

        const missingColumns = [];
        if (!maSpCol) missingColumns.push('Mã sản phẩm');
        if (!nhomHangCol) missingColumns.push('Nhóm hàng');
        if (!tenSpCol) missingColumns.push('Tên sản phẩm');

        if (missingColumns.length > 0) {
            return { success: false, error: `File thiếu các cột bắt buộc: ${missingColumns.join(', ')}.`, normalizedData: [] };
        }

        const normalizedData = rawData
            .map(row => ({
                maSanPham: String(row[maSpCol] || '').trim(),
                nhomHang: String(row[nhomHangCol] || '').trim(),
                tenSanPham: String(row[tenSpCol] || '').trim(),
            }))
            .filter(item => item.maSanPham && item.nhomHang && item.tenSanPham);

        return { success: true, normalizedData };
    },

    /**
     * Chuẩn hóa dữ liệu từ sheet "Hãng".
     */
    normalizeBrandData(rawData) {
        if (!rawData || rawData.length === 0) {
             return { success: false, error: 'Sheet "Hãng" rỗng.', normalizedData: [] };
        }
        const header = Object.keys(rawData[0] || {});
        const brandCol = this.findColumnName(header, ['hãng', 'tên hãng', 'nhà sản xuất']);
        if (!brandCol) {
            return { success: false, error: 'Sheet "Hãng" phải có cột "Hãng" hoặc "Tên Hãng".', normalizedData: [] };
        }

        const normalizedData = rawData
            .map(row => String(row[brandCol] || '').trim())
            .filter(brand => brand);

        return { success: true, normalizedData: [...new Set(normalizedData)].sort() };
    },

    getHinhThucXuatTinhDoanhThu: () => {
        const declarationData = get(declarations).hinhThucXuat;
        if (declarationData) return new Set(declarationData.split('\n').map(l => l.trim()).filter(Boolean));
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU);
    },

    getHinhThucXuatTraGop: () => {
        const declarationData = get(declarations).hinhThucXuatGop;
        if (declarationData) return new Set(declarationData.split('\n').map(l => l.trim()).filter(Boolean));
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP);
    },

    getHeSoQuyDoi: () => {
        const declarationData = get(declarations).heSoQuyDoi;
        const heSoMap = {};
        if (declarationData) {
            declarationData.split('\n').filter(l => l.trim()).forEach(line => {
                 const parts = line.split(',');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parseFloat(parts[1].trim());
                    if (key && !isNaN(value)) heSoMap[key] = value;
                }
             });
            // === START: SỬA LỖI (v1.8) ===
            return Object.keys(heSoMap).length > 0 ? heSoMap : config.DEFAULT_DATA.HE_SO_QUY_DOI;
        }
        return config.DEFAULT_DATA.HE_SO_QUY_DOI;
        // === END: SỬA LỖI (v1.8) ===
    },

    findColumnName(header, aliases) {
        for (const colName of header) {
            const processedColName = String(colName || '').trim().toLowerCase();
            if (aliases.includes(processedColName)) {
                return colName;
            }
        }
        return null;
    },

    normalizeData(rawData, fileType) {
        const mapping = config.COLUMN_MAPPINGS[fileType];
        if (!mapping) {
            console.error(`No column mapping found for fileType: ${fileType}`);
            return { normalizedData: [], success: false, missingColumns: ['Unknown mapping'] };
        }

        if (!rawData || rawData.length === 0) {
            return { normalizedData: [], success: true, missingColumns: [] };
        }

        const header = Object.keys(rawData[0] || {});
        const foundMapping = {};
        let allRequiredFound = true;
        const missingColumns = [];

        const newDebugInfo = { required: [], found: header, firstFiveMsnv: [] };

        for (const key in mapping) {
            const { required, displayName, aliases } = mapping[key];
            const foundName = this.findColumnName(header, aliases);
            foundMapping[key] = foundName;

            if (required) {
                const status = !!foundName;
                newDebugInfo.required.push({ displayName, foundName: foundName || 'Không tìm thấy', status: status });
                if (!status) {
                    allRequiredFound = false;
                    missingColumns.push(displayName);
                }
            }
        }

        if (fileType === 'giocong' || fileType === 'thuongnong') {
            if (!foundMapping.maNV && !foundMapping.hoTen) {
                 allRequiredFound = false;
                const missingMsg = 'Mã NV hoặc Tên NV';
                missingColumns.push(missingMsg);
                if (!newDebugInfo.required.some(r => r.displayName.includes('NV'))) {
                     newDebugInfo.required.push({ displayName: missingMsg, foundName: 'Không tìm thấy', status: false });
                }
            }
        }

        if (!allRequiredFound) {
            return { normalizedData: [], success: false, missingColumns };
        }

        const normalizedData = rawData.map(row => {
            const newRow = {};
            for (const key in foundMapping) {
                if (foundMapping[key]) {
                    if (key === 'maNV' || key === 'hoTen') {
                        newRow[key] = String(row[foundMapping[key]] || '').trim();
                    } else if (key === 'maSanPham') {
                        newRow[key] = String(row[foundMapping[key]] || '').trim();
                    } else if ((key === 'ngayTao' || key === 'ngayHenGiao') && row[foundMapping[key]]) {
                        const dateValue = row[foundMapping[key]];
                        if (dateValue instanceof Date) {
                            newRow[key] = dateValue;
                        } else if (typeof dateValue === 'number') {
                            newRow[key] = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
                        } else if (typeof dateValue === 'string') {
                            const parsedDate = new Date(dateValue.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
                            if (!isNaN(parsedDate.getTime())) newRow[key] = parsedDate;
                        }
                    }
                    else {
                        newRow[key] = row[foundMapping[key]];
                    }
                }
            }
            return newRow;
        });

        if (fileType === 'giocong') {
            const giocongRawList = rawData.map(row => {
                const newRow = {};
                for (const key in foundMapping) {
                    if (foundMapping[key]) newRow[key] = row[foundMapping[key]];
                }
                return newRow;
            });
            rawGioCongData.set(giocongRawList);
        }

        newDebugInfo.firstFiveMsnv = normalizedData.slice(0, 5).map(r => r.maNV).filter(Boolean);

        debugInfo.update(currentInfo => {
            currentInfo[fileType] = newDebugInfo;
            return currentInfo;
        });

        return { normalizedData, success: true, missingColumns: [] };
    },

    processThuongERP: (pastedText) => {
        if (!pastedText || !pastedText.trim()) return [];
        const lines = pastedText.trim().split('\n');
        const results = [];
        const regex = /(ĐML_|TGD|ĐMM|ĐMS).*?(BP .*?)(?:Nhân Viên|Trưởng Ca)(.*?)([\d,]+)$/;
        lines.forEach(line => {
            const match = line.replace(/\s+/g, ' ').match(regex);
            if (match) results.push({ name: match[3].trim(), bonus: match[4].trim() });
        });
        return results;
    },

    parseLuyKePastedData: (text) => {
        const defaults = {
            mainKpis: {},
            comparisonData: { value: 0, percentage: 'N/A' },
            luotKhachData: { value: 0, percentage: 'N/A' },
            dtDuKien: 0,
            dtqdDuKien: 0,
        };
        if (!text) return defaults;
        const allLines = text.split('\n').map(line => line.trim());
        const textContent = allLines.join(' ');
        const patterns = {
            'Thực hiện DT thực': /DTLK\s+([\d,.]+)/,
            'Thực hiện DTQĐ': /DTQĐ\s+([\d,.]+)/,
            '% HT Target Dự Kiến (QĐ)': /% HT Target Dự Kiến \(QĐ\)\s+([\d.]+%?)/,
            'Tỷ Trọng Trả Góp': /Tỷ Trọng Trả Góp\s+([\d.]+%?)/,
        };
        for (const [key, regex] of Object.entries(patterns)) {
            const match = textContent.match(regex);
            if (match && match[1]) {
                defaults.mainKpis[key] = match[1];
            }
        }
        const findValueAfterKeyword = (lines, keyword, isQd = false) => {
            let keywordRegex;
            if (isQd) {
                 keywordRegex = new RegExp(keyword.replace('(', '\\(').replace(')', '\\)'));
            } else {
                keywordRegex = new RegExp(`^${keyword}$`);
            }
            const index = lines.findIndex(line => keywordRegex.test(line) && !/lượt khách/i.test(line));
            if (index !== -1 && index + 1 < lines.length) {
                return parseFloat(lines[index + 1].replace(/,/g, '')) || 0;
            }
            return 0;
        };
        defaults.dtDuKien = findValueAfterKeyword(allLines, "DT Dự Kiến");
        defaults.dtqdDuKien = findValueAfterKeyword(allLines, "DT Dự Kiến (QĐ)", true);
        const dtckIndex = allLines.findIndex(line => line.includes('DTCK Tháng'));
        if (dtckIndex !== -1 && dtckIndex + 1 < allLines.length) {
            const valueLine = allLines[dtckIndex + 1];
            const values = valueLine.split(/\s+/);
            if (values.length >= 2) {
                defaults.comparisonData = {
                    value: parseFloat(values[0].replace(/,/g, '')) || 0,
                    percentage: values[1] || 'N/A'
                };
            }
        }
        const luotKhachIndex = allLines.findIndex(line => line.includes('Lượt Khách CK Tháng'));
        if (luotKhachIndex !== -1 && luotKhachIndex + 1 < allLines.length) {
            const valueLine = allLines[luotKhachIndex + 1];
            const values = valueLine.split(/\s+/);
            if (values.length >= 2) {
                defaults.luotKhachData = {
                    value: parseFloat(values[0].replace(/,/g, '')) || 0,
                    percentage: values[1] || 'N/A'
                };
            }
        }
        return defaults;
    },

    parseCompetitionDataFromLuyKe: (text) => {
        if (!text || !text.trim()) return [];
        const lines = text.split('\n').map(l => l.trim());
        const results = [];
        let currentCompetition = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().startsWith('thi đua')) {
                if (currentCompetition) results.push(currentCompetition);
                currentCompetition = {
                    name: line.replace("Thi đua doanh thu", "DT").replace("Thi đua số lượng", "SL"),
                    type: line.toLowerCase().includes('doanh thu') ? 'doanhThu' : 'soLuong',
                    luyKe: 0, target: 0, hoanThanh: '0%'
                };
            } else if (currentCompetition) {
                if (line.startsWith('DTLK') || line.startsWith('SLLK') || line.startsWith('DTQĐ')) {
                     if (i + 1 < lines.length) {
                        currentCompetition.luyKe = parseFloat(lines[i + 1].replace(/,/g, '')) || 0;
                    }
                } else if (line.startsWith('Target')) {
                    if (i + 1 < lines.length) {
                        currentCompetition.target = parseFloat(lines[i + 1].replace(/,/g, '')) || 0;
                    }
                } else if (line.startsWith('% HT Dự Kiến')) {
                    if (i + 1 < lines.length) {
                        currentCompetition.hoanThanh = lines[i + 1] || '0%';
                    }
                }
            }
        }
        if (currentCompetition) results.push(currentCompetition);
        
        competitionData.set(results);
        return results;
    },

    updateCompetitionNameMappings(mainHeaders) {
        if (!mainHeaders || mainHeaders.length === 0) return;
        const oldMappings = get(competitionNameMappings) || {};
        const newMappings = { ...oldMappings };
        let hasChanges = false;
        mainHeaders.forEach(originalName => {
            if (!newMappings.hasOwnProperty(originalName)) {
                newMappings[originalName] = '';
                hasChanges = true;
            }
        });
        if (hasChanges) {
            competitionNameMappings.set(newMappings);
            console.log("Phát hiện tên thi đua mới, Bảng Ánh Xạ đã được cập nhật trong store.");
        }
    },

    _cleanCompetitionName(name) {
        return name.replace(/thi đua doanh thu bán hàng|thi đua doanh thu|thi đua số lượng/gi, "").trim();
    },
    
    // *** START: HÀM ĐƯỢC CẬP NHẬT (v1.6) - Logic từ v3.4 (Gốc) ***
    /**
     * Xử lý dữ liệu thi đua nhân viên đã được phân tích cú pháp.
     * @param {Object} parsedData - Đối tượng trả về từ `parsePastedThiDuaTableData` ({ mainHeaders, subHeaders, dataRows }).
     * @param {Array} luykeCompetitionData - Dữ liệu mục tiêu thi đua từ `parseCompetitionDataFromLuyKe`.
     * @returns {Array} - Mảng dữ liệu báo cáo thi đua đã được chuẩn hóa.
     */
    processThiDuaNhanVienData(parsedData, luykeCompetitionData) {
        const { mainHeaders, subHeaders, dataRows } = parsedData;
        
        const newDebugInfo = { required: [], found: [], status: 'Đang xử lý...' };
        
        const $danhSachNhanVien = get(danhSachNhanVien);
        if ($danhSachNhanVien.length === 0) {
            newDebugInfo.status = 'Lỗi: Danh sách nhân viên (DSNV) chưa được tải lên.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return [];
        }
        if (mainHeaders.length === 0 || dataRows.length === 0 || subHeaders.length === 0) {
            newDebugInfo.status = 'Lỗi: Dữ liệu dán vào không hợp lệ, không tìm thấy tiêu đề hoặc dòng dữ liệu.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return [];
        }

        // Tải bảng ánh xạ tên rút gọn (đã được tải từ Cloud/Store)
        const nameMappings = get(competitionNameMappings) || {};
        
        // Tạo map mục tiêu từ dữ liệu lũy kế
        const competitionTargets = (luykeCompetitionData || []).map(comp => ({
            ...comp,
            cleanedName: this._cleanCompetitionName(comp.name)
        }));
        
        const finalReport = [];
        const totalEmployeesInDSNV = $danhSachNhanVien.length; // Chỉ đếm 1 lần
        const $employeeMaNVMap = get(employeeMaNVMap);

        dataRows.forEach(row => {
            // Bước 3.1: Trích xuất MSNV từ "Nguyễn Vũ Linh - 3031"
            const nameParts = row.name.split(' - ');
            const msnv = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : null;

            let employee;
            if (msnv) {
                // Bước 3.2: Tra cứu DSNV
                employee = $employeeMaNVMap.get(msnv);
            }

            // Nếu không tìm thấy, tạo một đối tượng tạm
            if (!employee) {
                employee = { 
                    hoTen: row.name, 
                    maNV: msnv || 'N/A', 
                    boPhan: 'Nhân viên không tìm thấy' 
                };
            }

            const employeeResult = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                boPhan: employee.boPhan,
                completedCount: 0,
                totalCompetitions: mainHeaders.length, // Số lượng chương trình
                competitions: [] // Mảng chứa dữ liệu của từng chương trình
            };

            // Lặp qua TẤT CẢ các cột (vì mainHeaders và subHeaders có cùng độ dài)
            // Giả định mainHeaders.length === subHeaders.length
            for (let i = 0; i < mainHeaders.length; i++) {
                const originalName = mainHeaders[i];
                const loaiSoLieu = subHeaders[i]; // "DTLK", "SLLK", "DTQĐ"
                
                // Bước 5.1: Tra cứu tên rút gọn
                const shortName = nameMappings[originalName] || originalName;
                
                // Logic tính toán mục tiêu (target)
                const cleanedName = this._cleanCompetitionName(originalName);
                const matchedTarget = competitionTargets.find(t => t.cleanedName === cleanedName);
                const groupTarget = matchedTarget ? matchedTarget.target : 0;
                const individualTarget = totalEmployeesInDSNV > 0 ? groupTarget / totalEmployeesInDSNV : 0;

                // Bước 3.3: Lấy GIÁ TRỊ THỰC TẾ (chỉ 1 giá trị)
                const giaTri = parseFloat(String(row.values[i] || '0').replace(/,/g, '')) || 0;
                const actualSales = giaTri; // actualSales chính là giaTri

                const percentExpected = individualTarget > 0 ? actualSales / individualTarget : (actualSales > 0 ? Infinity : 0);

                if (percentExpected >= 1) {
                    employeeResult.completedCount++;
                }

                // Lưu đối tượng mới với cấu trúc 1 cột
                employeeResult.competitions.push({
                    tenNganhHang: shortName, // Tên rút gọn
                    tenGoc: originalName,    // Tên gốc
                    loaiSoLieu: loaiSoLieu,  // Loại dữ liệu (DTLK, SLLK, DTQĐ)
                    giaTri: giaTri,        // Giá trị
                    
                    // Các trường cũ để so sánh (nếu cần)
                    thucHien: actualSales,
                    mucTieu: individualTarget,
                    percentExpected: percentExpected,
                });
            }

            employeeResult.completionRate = employeeResult.totalCompetitions > 0 ? employeeResult.completedCount / employeeResult.totalCompetitions : 0;
            finalReport.push(employeeResult);
        });

        newDebugInfo.status = `Thành công: Đã xử lý báo cáo cho ${finalReport.length} nhân viên.`;
        debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
        return finalReport;
    },
    // *** END: HÀM ĐƯỢC CẬP NHẬT ***

    // *** START: HÀM ĐƯỢC CẬP NHẬT (v1.6) - Logic từ v3.6 (Gốc) ***
    /**
     * Phân tích cú pháp dữ liệu thô từ ô dán "Thi đua nhân viên".
     * @param {string} rawText - Văn bản thô từ textarea.
     * @returns {Object} - { success, mainHeaders, subHeaders, dataRows, error? }
     */
    parsePastedThiDuaTableData(rawText) {
        const newDebugInfo = { required: [], found: [], status: 'Bắt đầu phân tích...' };
        debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));

        if (!rawText || !rawText.trim()) {
            newDebugInfo.status = 'Lỗi: Dữ liệu dán vào rỗng.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: newDebugInfo.status, mainHeaders: [], subHeaders: [], dataRows: [] };
        }

        // Bước 0: Tiền xử lý (Làm sạch dữ liệu thô)
        const lines = rawText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // --- Các hằng số Regex ---
        const splitRegex = /\s{2,}|\t/; // Tách bằng 2+ dấu cách HOẶC 1 dấu tab
        const numberCheckRegex = /^-?[\d,.]+$/; // Kiểm tra là số

        // --- Tìm các "Mỏ neo" (Anchors) ---
        const mainHeaderStartIndex = lines.findIndex(line => line.includes('Phòng ban'));
        const subHeaderStartIndex = lines.findIndex(line => line.startsWith('DTLK') || line.startsWith('SLLK') || line.startsWith('DTQĐ'));
        
        let dataEndIndex = lines.findIndex(line => line.includes('Hỗ trợ BI'));
        if (dataEndIndex === -1) {
            dataEndIndex = lines.length; // Nếu không tìm thấy footer, lấy hết
        }

        // *** (LOGIC SỬA LỖI v3.2) ***
        // Tìm điểm bắt đầu của dữ liệu (dòng đầu tiên SAU tiêu đề phụ)
        // Phải tìm trước khi cắt mảng Tiêu đề phụ
        const dataRowsStartIndex = lines.findIndex((line, index) => {
            if (index <= subHeaderStartIndex) return false; // Phải ở SAU dòng sub-header đầu tiên
            
            const parts = line.split(splitRegex).map(p => p.trim());
            const firstPart = parts[0] || "";

            // Bỏ qua nếu là dòng tổng, dòng bộ phận, hoặc dòng sub-header bị ngắt
            if (firstPart.startsWith('Tổng') || firstPart.startsWith('BP ') || firstPart.startsWith('DTLK') || firstPart.startsWith('SLLK') || firstPart.startsWith('DTQĐ')) {
                return false;
            }
            
            // Đây là dòng dữ liệu NẾU nó có > 1 phần TỬ VÀ phần tử thứ 2 là số
            return parts.length > 1 && numberCheckRegex.test(parts[1]);
        });
        // *** (KẾT THÚC LOGIC SỬA LỖI v3.2) ***

        // --- Kiểm tra Mỏ neo ---
        if (mainHeaderStartIndex === -1 || subHeaderStartIndex === -1 || dataRowsStartIndex === -1) {
            let error = `Lỗi: Không thể tìm thấy mỏ neo. 'Phòng ban': ${mainHeaderStartIndex !== -1}. 'SLLK/DTLK': ${subHeaderStartIndex !== -1}. 'Dòng dữ liệu đầu tiên': ${dataRowsStartIndex !== -1}.`;
            newDebugInfo.status = error;
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: error, mainHeaders: [], subHeaders: [], dataRows: [] };
        }
        
        // Bước 1: Trích xuất Tiêu Đề Chính (Main Headers)
        // === START: SỬA LỖI (v3.6) - Gộp nhiều dòng cho tiêu đề chính ===
        const mainHeaderLines = lines.slice(mainHeaderStartIndex + 1, subHeaderStartIndex);
        const mainHeaderString = mainHeaderLines.join('\t'); // Nối bằng Tab (giống sub-header)
        const mainHeaders = mainHeaderString.split(splitRegex).filter(Boolean); // Tách bằng regex (giống sub-header)
        // === END: SỬA LỖI (v3.6) ===
        newDebugInfo.found.push({ name: 'Tiêu đề chính (Ngành hàng)', value: `${mainHeaders.length} mục`, status: mainHeaders.length > 0 });

        // Bước 2: Trích xuất Tiêu Đề Phụ (Sub Headers)
        // Lấy TẤT CẢ các dòng tiêu đề phụ (từ dòng sub-header đầu tiên đến trước dòng data đầu tiên)
        const subHeaderLines = lines.slice(subHeaderStartIndex, dataRowsStartIndex);
        const subHeaderString = subHeaderLines.join('\t'); // Nối bằng Tab
        const subHeaders = subHeaderString.split(/\s+/).filter(Boolean);
        newDebugInfo.found.push({ name: 'Tiêu đề phụ (SLLK/DTQĐ)', value: `${subHeaders.length} mục`, status: subHeaders.length > 0 });

        // Bước 3: Trích xuất Dữ Liệu Nhân Viên (Data Rows)
        const potentialDataLines = lines.slice(dataRowsStartIndex, dataEndIndex);
        const dataRows = [];
        
        for (const line of potentialDataLines) {
            const parts = line.split(splitRegex).map(p => p.trim());
            const firstPart = parts[0] || "";

            // *** QUY TẮC LỌC (v3.1) ***
            // Bỏ qua các dòng tổng và dòng tóm tắt bộ phận
            if (firstPart.startsWith('Tổng') || firstPart.startsWith('BP ')) {
                continue;
            }
            // *** KẾT THÚC QUY TẮC LỌC ***

            // Áp dụng "Quy tắc kiểm tra" (Kiểm tra lại để chắc chắn)
            if (parts.length > 1 && numberCheckRegex.test(parts[1])) {
                dataRows.push({
                    name: firstPart,
                    values: parts.slice(1)
                });
            }
        }
        newDebugInfo.found.push({ name: 'Dòng dữ liệu nhân viên', value: `${dataRows.length} dòng`, status: dataRows.length > 0 });

        if (mainHeaders.length === 0 || subHeaders.length === 0 || dataRows.length === 0) {
            newDebugInfo.status = 'Lỗi: Không thể phân tích dữ liệu. Thiếu Tiêu đề chính, Tiêu đề phụ, hoặc Dòng dữ liệu (sau khi lọc).';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: newDebugInfo.status, mainHeaders, subHeaders, dataRows };
        }
        
        // Kiểm tra tính toàn vẹn dữ liệu
        const expectedDataCols = subHeaders.length;
        if (dataRows.length > 0 && dataRows[0].values.length !== expectedDataCols) {
             console.warn(`[parsePastedThiDua] Cảnh báo: Số cột tiêu đề phụ (${expectedDataCols}) không khớp với số cột dữ liệu (${dataRows[0].values.length}). Dữ liệu có thể bị lệch.`);
             newDebugInfo.status = `Cảnh báo: Số cột không khớp! Tiêu đề phụ (${expectedDataCols}) vs Dữ liệu (${dataRows[0].values.length}).`;
        } else {
            newDebugInfo.status = `Phân tích thành công.`;
        }

        debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
        return { success: true, mainHeaders, subHeaders, dataRows };
    },
    // *** END: HÀM ĐƯỢC CẬP NHẬT ***

    classifyInsurance: (productName) => {
        if (!productName || typeof productName !== 'string') return null;
        const name = productName.trim().toLowerCase();
        if (name.includes('bảo hành mở rộng')) return 'BHMR';
        if (name.includes('1 đổi 1')) return 'BH1d1';
        if (name.includes('khoản vay')) return 'BHKV';
        if (name.includes('rơi vỡ')) return 'BHRV';
        if (name.includes('samsung care+')) return 'BHSC';
        if (name.includes('ô tô') || name.includes('vật chất ô tô')) return 'BHOTO';
        if (name.includes('xe máy') || name.includes('xe moto')) return 'BHXM';
        if (name.includes('xã hội') || name.includes('y tế')) return 'BHYT';
        return null;
    },

    processGioCongData: () => {
        const gioCongByMSNV = {};
        let currentMaNV = null;
        const $rawGioCongData = get(rawGioCongData);
        const $employeeNameToMaNVMap = get(employeeNameToMaNVMap);
        if (!$rawGioCongData || $rawGioCongData.length === 0) return gioCongByMSNV;
        for (const row of $rawGioCongData) {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) currentMaNV = foundMaNV;
            if (currentMaNV && gioCongByMSNV[currentMaNV] === undefined) {
                gioCongByMSNV[currentMaNV] = 0;
            }
            const gioCongValue = parseFloat(String(row.tongGioCong || '0').replace(/,/g, '')) || 0;
            if (currentMaNV && gioCongValue > 0) {
                gioCongByMSNV[currentMaNV] += gioCongValue;
            }
        }
        return gioCongByMSNV;
    },

    _findHeaderAndProcess(sheet, requiredKeywords) {
        if (!sheet) return [];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        if (rows.length === 0) return [];
        let headerRowIndex = -1;
        let foundHeaders = [];
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            const lowerCaseRow = row.map(cell => String(cell || '').trim().toLowerCase());
            const allKeywordsFound = requiredKeywords.every(keyword =>
                lowerCaseRow.some(cell => cell.includes(keyword))
            );
            if (allKeywordsFound) {
                headerRowIndex = i;
                foundHeaders = rows[i].map(cell => String(cell || '').trim());
                break;
            }
        }
        if (headerRowIndex === -1) {
            throw new Error(`Không tìm thấy dòng tiêu đề chứa đủ các từ khóa: ${requiredKeywords.join(', ')}.`);
        }
        const dataRows = rows.slice(headerRowIndex + 1);
        const jsonData = dataRows.map(row => {
            const obj = {};
            foundHeaders.forEach((header, index) => {
                if (header) {
                    const value = row[index];
                    const upperKey = header.toUpperCase();
                    if (upperKey.includes('KÊNH') || upperKey.includes('SIÊU THỊ') || upperKey.includes('NGÀNH HÀNG') || upperKey.includes('TỈNH') || upperKey.includes('BOSS')) {
                        obj[header] = value;
                    } else if (typeof value === 'string' && value.includes('%')) {
                        // === START: SỬA LỖI (v1.7) ===
                        obj[header] = parseFloat(value.replace(/%|,/g, '')) / 100 || 0;
                        // === END: SỬA LỖI (v1.7) ===
                    } else if (value !== null && value !== undefined) {
                        obj[header] = parseFloat(String(value).replace(/,/g, '')) || 0;
                    } else {
                        obj[header] = 0;
                    }
                }
            });
            return obj;
        }).filter(obj => {
            const supermarketKey = Object.keys(obj).find(k => k.toLowerCase().includes('siêu thị'));
            return supermarketKey && obj[supermarketKey];
        });
        return jsonData;
    },

    // *** START: HÀM ĐƯỢC CẬP NHẬT (v1.6) - Logic từ v3.5 (Gốc) ***
    processThiDuaVungFile(workbook) {
        const sheetNames = workbook.SheetNames;
        // *** START: YÊU CẦU MỚI (v3.5) ***
        // Tìm sheet chi tiết (CHITIET hoặc CHI TIẾT)
        const chiTietSheetName = sheetNames.find(name => {
            const upperName = name.toUpperCase();
            return upperName.includes('CHITIET') || upperName.includes('CHI TIẾT');
        });
        
        // Tìm sheet tổng (TONG hoặc SIEU THI)
        const tongSheetName = sheetNames.find(name => {
            const upperName = name.toUpperCase();
            return upperName.includes('TONG') || upperName.includes('SIEU THI');
        });

        const chiTietSheet = chiTietSheetName ? workbook.Sheets[chiTietSheetName] : null;
        const tongSheet = tongSheetName ? workbook.Sheets[tongSheetName] : null;

        if (!chiTietSheet || !tongSheet) {
            throw new Error('File Excel phải chứa sheet (CHITIET/CHI TIẾT) và (TONG/SIEU THI).');
        }
        // *** END: YÊU CẦU MỚI (v3.5) ***

        const chiTietData = this._findHeaderAndProcess(chiTietSheet, ['siêu thị', 'ngành hàng', 'kênh']);
        const tongData = this._findHeaderAndProcess(tongSheet, ['siêu thị', 'tổng thưởng']);

        return { chiTietData, tongData };
    },
    // *** END: HÀM ĐƯỢC CẬP NHẬT ***
};