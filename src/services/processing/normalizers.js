import { config } from '../../config.js';
import { debugInfo, rawGioCongData } from '../../stores.js';
import { helpers } from './helpers.js';

export const normalizers = {
    normalizeCategoryStructureData(rawData) {
        if (!rawData || rawData.length === 0) {
            return { success: false, error: 'File rỗng.', normalizedData: [] };
        }
        const header = Object.keys(rawData[0] || {});
        
        const nganhHangCol = helpers.findColumnName(header, ['ngành hàng', 'nganh hang']);
        const nhomHangCol = helpers.findColumnName(header, ['nhóm hàng', 'nhom hang']);
        const nhaSanXuatCol = helpers.findColumnName(header, ['nhà sản xuất', 'nha san xuat', 'hãng', 'brand']);

        const missingCols = [];
        if (!nganhHangCol) missingCols.push('"Ngành hàng"');
        if (!nhomHangCol) missingCols.push('"Nhóm hàng"');
        if (!nhaSanXuatCol) missingCols.push('"Nhà sản xuất"');

        if (missingCols.length > 0) {
            return { success: false, error: `File thiếu các cột: ${missingCols.join(', ')}`, normalizedData: [] };
        }

        const normalizedData = rawData
            .map(row => ({
                nganhHang: String(row[nganhHangCol] || '').trim(),
                nhomHang: String(row[nhomHangCol] || '').trim(),
                nhaSanXuat: String(row[nhaSanXuatCol] || '').trim(),
            }))
            .filter(item => item.nganhHang && item.nhomHang);
            
        return { success: true, normalizedData };
    },
    
    normalizeSpecialProductData(rawData) {
        if (!rawData || rawData.length === 0) {
            return { success: false, error: 'File rỗng.', normalizedData: [] };
        }
        const header = Object.keys(rawData[0] || {});
        const maSpCol = helpers.findColumnName(header, ['mã sản phẩm', 'masanpham', 'mã sp', 'product code']);
        const nhomHangCol = helpers.findColumnName(header, ['nhóm hàng', 'nhom hang']);
        const tenSpCol = helpers.findColumnName(header, ['tên sản phẩm', 'tensanpham', 'tên sp']);

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

    normalizeBrandData(rawData) {
        if (!rawData || rawData.length === 0) {
             return { success: false, error: 'Sheet "Hãng" rỗng.', normalizedData: [] };
        }
        const header = Object.keys(rawData[0] || {});
        const brandCol = helpers.findColumnName(header, ['hãng', 'tên hãng', 'nhà sản xuất']);
        if (!brandCol) {
            return { success: false, error: 'Sheet "Hãng" phải có cột "Hãng" hoặc "Tên Hãng".', normalizedData: [] };
        }

        const normalizedData = rawData
            .map(row => String(row[brandCol] || '').trim())
            .filter(brand => brand);
        return { success: true, normalizedData: [...new Set(normalizedData)].sort() };
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
            const foundName = helpers.findColumnName(header, aliases);
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
                    if (key === 'maNV' || key === 'hoTen' || key === 'maSanPham') {
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
                    } else {
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
    }
};