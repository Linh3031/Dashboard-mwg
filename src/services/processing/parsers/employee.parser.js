// src/services/processing/parsers/employee.parser.js
import { excelService } from '../../excel.service.js';

export const employeeParser = {
    /**
     * Parse file Excel nhân viên và trả về cấu trúc dữ liệu chuẩn hóa
     * @param {File} file - File Excel upload
     * @returns {Promise<{
     * employees: Array, 
     * warehouses: Array, 
     * clusters: Object, 
     * isClusterMode: boolean 
     * }>}
     */
    async parse(file) {
        try {
            // 1. Đọc dữ liệu thô từ Excel
            const rawData = await excelService.read(file);
            if (!rawData || rawData.length === 0) {
                throw new Error("File không có dữ liệu!");
            }

            // 2. Tìm dòng header (chứa 'MSNV' hoặc 'Mã nhân viên')
            const headerRowIndex = this._findHeaderRow(rawData);
            if (headerRowIndex === -1) {
                throw new Error("Không tìm thấy dòng tiêu đề (cần cột MSNV, Họ tên, Mã kho...)");
            }

            // 3. Map cột
            const headers = rawData[headerRowIndex].map(h => String(h).trim().toLowerCase());
            const colMap = this._mapColumns(headers);

            // 4. Duyệt qua dữ liệu và chuẩn hóa
            const employees = [];
            const warehouseSet = new Set();
            const clusterMap = {}; // { "908": ["Kho1", "Kho2"] }
            let hasClusterColumn = colMap.cluster !== -1;

            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                const row = rawData[i];
                // Bỏ qua dòng trống
                if (!row || row.length === 0) continue;

                const msnv = this._getCell(row, colMap.msnv);
                const ten = this._getCell(row, colMap.name);
                const maKho = this._getCell(row, colMap.warehouse);
                const rawCluster = hasClusterColumn ? this._getCell(row, colMap.cluster) : '';

                // Chỉ lấy dòng có MSNV và Mã Kho
                if (msnv && maKho) {
                    const emp = {
                        msnv: String(msnv).trim(),
                        hoTen: String(ten).trim(),
                        boPhan: this._getCell(row, colMap.dept) || 'Cửa hàng',
                        maKho: String(maKho).trim(),
                        maCum: this._parseClusterCode(rawCluster) // Xử lý "Cụm 908" -> "908"
                    };

                    employees.push(emp);
                    warehouseSet.add(emp.maKho);

                    // Logic gom nhóm Cụm
                    if (emp.maCum) {
                        if (!clusterMap[emp.maCum]) {
                            clusterMap[emp.maCum] = new Set();
                        }
                        clusterMap[emp.maCum].add(emp.maKho);
                    }
                }
            }

            // 5. Chuyển Set thành Array để trả về
            const finalWarehouses = Array.from(warehouseSet).sort();
            
            // Chuyển Cluster Map: Set -> Array
            const finalClusters = {};
            Object.keys(clusterMap).forEach(key => {
                finalClusters[key] = Array.from(clusterMap[key]).sort();
            });

            // Xác định chế độ: Nếu có > 1 mã kho và có cột cụm -> Cluster Mode
            const isClusterMode = finalWarehouses.length > 1 && Object.keys(finalClusters).length > 0;

            return {
                employees,
                warehouses: finalWarehouses,
                clusters: finalClusters,
                isClusterMode
            };

        } catch (error) {
            console.error("[EmployeeParser] Parsing error:", error);
            throw error;
        }
    },

    // --- Helpers ---

    _findHeaderRow(data) {
        // Quét 10 dòng đầu để tìm header
        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const rowStr = JSON.stringify(data[i]).toLowerCase();
            if (rowStr.includes('msnv') || rowStr.includes('mã nhân viên')) {
                return i;
            }
        }
        return -1;
    },

    _mapColumns(headers) {
        return {
            msnv: headers.findIndex(h => h.includes('msnv') || h.includes('mã nhân viên') || h.includes('mã nv')),
            name: headers.findIndex(h => h.includes('họ tên') || h.includes('tên nhân viên') || h.includes('tên nv')),
            dept: headers.findIndex(h => h.includes('bộ phận') || h.includes('phòng ban')),
            warehouse: headers.findIndex(h => h.includes('mã kho') || h.includes('kho') || h.includes('cửa hàng')),
            cluster: headers.findIndex(h => h.includes('mã cụm') || h.includes('cụm'))
        };
    },

    _getCell(row, index) {
        if (index === -1 || !row[index]) return '';
        return row[index];
    },

    /**
     * Tách mã cụm từ chuỗi
     * VD: "Cụm 908" -> "908"
     * VD: "Khu vực 908" -> "908"
     * VD: "908" -> "908"
     */
    _parseClusterCode(rawStr) {
        if (!rawStr) return '';
        const str = String(rawStr).trim();
        // Regex tìm chuỗi số liên tiếp cuối cùng hoặc đầu tiên
        const match = str.match(/\d+/); 
        return match ? match[0] : str;
    }
};