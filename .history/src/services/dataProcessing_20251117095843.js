/* global XLSX */
import { get } from 'svelte/store'; // Import 'get' để đọc giá trị từ store
import { config } from '../config.js';
// SỬA LỖI (V1.5): Import trực tiếp các hàm, không qua object 'utils'
import { cleanCategoryName } from '../utils.js';
// Import các store Svelte
import {
    declarations,
    debugInfo,
    rawGioCongData,
    employeeNameToMaNVMap,
    danhSachNhanVien,
    employeeMaNVMap,
    competitionData, // Cần cho hàm xử lý Thi Đua
    competitionNameMappings, // Cần cho hàm xử lý Thi Đua
    masterReportData,
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    specialProductList,
    ycxData // Cần cho hàm DSNV
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

    // --- Cập nhật logic đọc khai báo từ Svelte store ---
    getHinhThucXuatTinhDoanhThu: () => {
        const declarationData = get(declarations).hinhThucXuat; // Dùng get()
        if (declarationData) return new Set(declarationData.split('\n').map(l => l.trim()).filter(Boolean));
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU);
    },

    getHinhThucXuatTraGop: () => {
        const declarationData = get(declarations).hinhThucXuatGop; // Dùng get()
        if (declarationData) return new Set(declarationData.split('\n').map(l => l.trim()).filter(Boolean));
        return new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP);
    },

    getHeSoQuyDoi: () => {
        const declarationData = get(declarations).heSoQuyDoi; // Dùng get()
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
            return Object.keys(heSoMap).length > 0 ? heSoMap : config.DEFAULT_DATA.HE_SO_QUY_DOI;
        }
        return config.DEFAULT_DATA.HE_SO_QUY_DOI;
    },
    // --- Kết thúc cập nhật ---

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
            debugInfo.update(currentInfo => ({ ...currentInfo, [fileType]: newDebugInfo }));
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
        debugInfo.update(currentInfo => ({ ...currentInfo, [fileType]: newDebugInfo }));
        
        return { normalizedData, success: true, missingColumns: [] };
    },

    // === BẮT ĐẦU THÊM MỚI (Lấy từ services.js gốc) ===

    /**
     * Xử lý text thô của Thưởng ERP.
     *
     */
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

    /**
     * Phân tích text thô của Data Lũy Kế (BI).
     [cite_start]* [cite: 2158-2165]
     */
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

    /**
     * Phân tích text Data Lũy Kế để lấy dữ liệu thi đua.
     *
     */
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

        // Cập nhật Svelte store
        competitionData.set(results);
        return results;
    },

    /**
     * Cập nhật mapping tên thi đua.
     [cite_start]* [cite: 2173-2175] (Logic đã được điều chỉnh cho Svelte)
     */
    updateCompetitionNameMappings(mainHeaders) {
        if (!mainHeaders || mainHeaders.length === 0) return;

        const oldMappings = get(competitionNameMappings) || {};
        const newMappings = { ...oldMappings };
        let hasChanges = false;

        mainHeaders.forEach(originalName => {
            if (!newMappings.hasOwnProperty(originalName)) {
                newMappings[originalName] = ''; // Thêm tên mới với giá trị rỗng
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

    // === BẮT ĐẦU HÀM BỊ THIẾU (VÁ LỖI) ===
    /**
     * Phân tích cú pháp dữ liệu thô từ ô dán "Thi đua nhân viên".
     * [cite_start]Logic được lấy từ file services/data-processing.js gốc [cite: 2153-2164]
     * và điều chỉnh để dùng Svelte store 'debugInfo'.
     */
    parsePastedThiDuaTableData(rawText) {
        const newDebugInfo = { required: [], found: [], status: 'Bắt đầu phân tích...' };

        if (!rawText || !rawText.trim()) {
            newDebugInfo.status = 'Lỗi: Dữ liệu dán vào rỗng.';
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: newDebugInfo.status, mainHeaders: [], subHeaders: [], dataRows: [] };
        }

        // Bước 0: Tiền xử lý (Làm sạch dữ liệu thô)
        const lines = rawText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const splitRegex = /\s{2,}|\t/; // Tách bằng 2+ dấu cách HOẶC 1 dấu tab
        const numberCheckRegex = /^-?[\d,.]+$/; // Kiểm tra là số

        // --- Tìm các "Mỏ neo" (Anchors) ---
        const mainHeaderStartIndex = lines.findIndex(line => line.includes('Phòng ban'));
        const subHeaderStartIndex = lines.findIndex(line => line.startsWith('DTLK') || line.startsWith('SLLK') || line.startsWith('DTQĐ'));
        
        let dataEndIndex = lines.findIndex(line => line.includes('Hỗ trợ BI'));
        if (dataEndIndex === -1) {
            dataEndIndex = lines.length; // Nếu không tìm thấy footer, lấy hết
        }

        // Tìm điểm bắt đầu của dữ liệu
        const dataRowsStartIndex = lines.findIndex((line, index) => {
            if (index <= subHeaderStartIndex) return false;
            
            const parts = line.split(splitRegex).map(p => p.trim());
            const firstPart = parts[0] || "";

            // Bỏ qua nếu là dòng tổng, dòng bộ phận, hoặc dòng sub-header bị ngắt
            if (firstPart.startsWith('Tổng') || firstPart.startsWith('BP ') || firstPart.startsWith('DTLK') || firstPart.startsWith('SLLK') || firstPart.startsWith('DTQĐ')) {
                return false;
            }
            
            // Đây là dòng dữ liệu NẾU nó có > 1 phần tử VÀ phần tử thứ 2 là số
            return parts.length > 1 && numberCheckRegex.test(parts[1]);
        });

        // --- Kiểm tra Mỏ neo ---
        if (mainHeaderStartIndex === -1 || subHeaderStartIndex === -1 || dataRowsStartIndex === -1) {
            let error = "Dữ liệu đầu vào không đúng định dạng thi đua ngành hàng theo nhân viên, vui lòng kiểm tra lại";
            newDebugInfo.status = error;
            debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
            return { success: false, error: error, mainHeaders: [], subHeaders: [], dataRows: [] };
        }
        
        // Bước 1: Trích xuất Tiêu Đề Chính (Main Headers)
        const mainHeaderLines = lines.slice(mainHeaderStartIndex + 1, subHeaderStartIndex);
        const mainHeaderString = mainHeaderLines.join('\t');
        const mainHeaders = mainHeaderString.split(splitRegex).filter(Boolean);
        newDebugInfo.found.push({ name: 'Tiêu đề chính (Ngành hàng)', value: `${mainHeaders.length} mục`, status: mainHeaders.length > 0 });

        // Bước 2: Trích xuất Tiêu Đề Phụ (Sub Headers)
        const subHeaderLines = lines.slice(subHeaderStartIndex, dataRowsStartIndex);
        const subHeaderString = subHeaderLines.join('\t');
        const subHeaders = subHeaderString.split(/\s+/).filter(Boolean);
        newDebugInfo.found.push({ name: 'Tiêu đề phụ (SLLK/DTQĐ)', value: `${subHeaders.length} mục`, status: subHeaders.length > 0 });

        // Bước 3: Trích xuất Dữ Liệu Nhân Viên (Data Rows)
        const potentialDataLines = lines.slice(dataRowsStartIndex, dataEndIndex);
        const dataRows = [];
        
        for (const line of potentialDataLines) {
            const parts = line.split(splitRegex).map(p => p.trim());
            const firstPart = parts[0] || "";

            // Bỏ qua các dòng tổng và dòng tóm tắt bộ phận
            if (firstPart.startsWith('Tổng') || firstPart.startsWith('BP ')) {
                continue;
            }

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
        
        const expectedDataCols = subHeaders.length;
        if (dataRows.length > 0 && dataRows[0].values.length !== expectedDataCols) {
             console.warn(`[parsePastedThiDua] Cảnh báo: Số cột tiêu đề phụ (${expectedDataCols}) không khớp với số cột dữ liệu (${dataRows[0].values.length}). Dữ liệu có thể bị lệch.`);
             newDebugInfo.status = `Cảnh báo: Số cột không khớp! Tiêu đề phụ (${expectedDataCols}) vs Dữ liệu (${dataRows[0].values.length}).`;
        } else {
            newDebugInfo.status = `Phân tích thành công.`;
        }
        
        // Cập nhật store debugInfo
        debugInfo.update(current => ({ ...current, 'thiduanv-pasted': newDebugInfo }));
        
        return { success: true, mainHeaders, subHeaders, dataRows };
    },
    // === KẾT THÚC: HÀM BỊ THIẾU ===

    /**
     * Xử lý dữ liệu thi đua nhân viên từ ô dán.
     [cite_start]* [cite: 2153-2164] (Logic đã được điều chỉnh cho Svelte)
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

        const nameMappings = get(competitionNameMappings) || {};
        
        const competitionTargets = (luykeCompetitionData || []).map(comp => ({
            ...comp,
            cleanedName: this._cleanCompetitionName(comp.name)
        }));
        
        const finalReport = [];
        const totalEmployeesInDSNV = $danhSachNhanVien.length;
        const $employeeMaNVMap = get(employeeMaNVMap);

        dataRows.forEach(row => {
            const nameParts = row.name.split(' - ');
            const msnv = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : null;

            let employee;
            if (msnv) {
                employee = $employeeMaNVMap.get(msnv);
            }

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
                totalCompetitions: mainHeaders.length,
                competitions: []
            };

            for (let i = 0; i < mainHeaders.length; i++) {
                const originalName = mainHeaders[i];
                const loaiSoLieu = subHeaders[i];
                
                const shortName = nameMappings[originalName] || originalName;
                
                const cleanedName = this._cleanCompetitionName(originalName);
                const matchedTarget = competitionTargets.find(t => t.cleanedName === cleanedName);
                const groupTarget = matchedTarget ? matchedTarget.target : 0;
                const individualTarget = totalEmployeesInDSNV > 0 ? groupTarget / totalEmployeesInDSNV : 0;

                const giaTri = parseFloat(String(row.values[i] || '0').replace(/,/g, '')) || 0;
                const actualSales = giaTri;

                const percentExpected = individualTarget > 0 ? actualSales / individualTarget : (actualSales > 0 ? Infinity : 0);
                if (percentExpected >= 1) {
                    employeeResult.completedCount++;
                }

                employeeResult.competitions.push({
                    tenNganhHang: shortName,
                    tenGoc: originalName,
                    loaiSoLieu: loaiSoLieu,
                    giaTri: giaTri,
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

    /**
     * Phân loại bảo hiểm.
     [cite_start]* [cite: 2179-2185]
     */
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

    /**
     * Xử lý dữ liệu Giờ công đã chuẩn hóa.
     [cite_start]* [cite: 2186-2188]
     */
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
};