import { formatters } from '../utils/formatters.js';

export const sknvService = {
    /**
     * Tính toán trung bình các chỉ số của một bộ phận.
     */
    calculateDepartmentAverages(departmentName, reportData) {
        const departmentEmployees = reportData.filter(e => e.boPhan === departmentName);
        if (departmentEmployees.length === 0) return {};

        const totals = departmentEmployees.reduce((acc, curr) => {
            Object.keys(curr).forEach(key => {
                if (typeof curr[key] === 'number') acc[key] = (acc[key] || 0) + curr[key];
            });
            return acc;
        }, {});

        const averages = {};
        for (const key in totals) {
            averages[key] = totals[key] / departmentEmployees.length;
        }
        return averages;
    },

    /**
     * Đánh giá nhân viên (so sánh với TB bộ phận).
     * Trả về object summary đếm số lượng chỉ số đạt.
     */
    evaluateEmployee(employee, departmentAverages) {
        const counts = {
            doanhthu: { above: 0, total: 7 },
            nangsuat: { above: 0, total: 7 },
            hieuqua: { above: 0, total: 6 },
            dongia: { above: 0, total: 7 }
        };

        const check = (group, value, avg, higherIsBetter = true) => {
            if (!isFinite(value) || avg === undefined || !isFinite(avg)) return;
            if (higherIsBetter ? (value >= avg) : (value <= avg)) 
                counts[group].above++;
        };

        // 1. Doanh thu
        check('doanhthu', employee.doanhThu, departmentAverages.doanhThu);
        check('doanhthu', employee.doanhThuQuyDoi, departmentAverages.doanhThuQuyDoi);
        check('doanhthu', employee.hieuQuaQuyDoi, departmentAverages.hieuQuaQuyDoi);
        check('doanhthu', employee.dtCE, departmentAverages.dtCE);
        check('doanhthu', employee.dtICT, departmentAverages.dtICT);
        check('doanhthu', employee.doanhThuTraGop, departmentAverages.doanhThuTraGop);
        check('doanhthu', employee.tyLeTraCham, departmentAverages.tyLeTraCham);

        // 2. Năng suất
        check('nangsuat', employee.tongThuNhap, departmentAverages.tongThuNhap);
        check('nangsuat', employee.thuNhapDuKien, departmentAverages.thuNhapDuKien);
        check('nangsuat', employee.gioCong, departmentAverages.gioCong);
        
        const tnTrenGc = employee.gioCong > 0 ? employee.tongThuNhap / employee.gioCong : 0;
        const avgTnTrenGc = departmentAverages.gioCong > 0 ? departmentAverages.tongThuNhap / departmentAverages.gioCong : 0;
        check('nangsuat', tnTrenGc, avgTnTrenGc);

        const dtqdTrenGc = employee.gioCong > 0 ? employee.doanhThuQuyDoi / employee.gioCong : 0;
        const avgDtqdTrenGc = departmentAverages.gioCong > 0 ? departmentAverages.doanhThuQuyDoi / departmentAverages.gioCong : 0;
        check('nangsuat', dtqdTrenGc, avgDtqdTrenGc);
        
        check('nangsuat', employee.thuongNong, departmentAverages.thuongNong);
        check('nangsuat', employee.thuongERP, departmentAverages.thuongERP);

        // 3. Hiệu quả
        check('hieuqua', employee.pctPhuKien, departmentAverages.pctPhuKien);
        check('hieuqua', employee.pctGiaDung, departmentAverages.pctGiaDung);
        check('hieuqua', employee.pctMLN, departmentAverages.pctMLN);
        check('hieuqua', employee.pctSim, departmentAverages.pctSim);
        check('hieuqua', employee.pctVAS, departmentAverages.pctVAS);
        check('hieuqua', employee.pctBaoHiem, departmentAverages.pctBaoHiem);

        // 4. Đơn giá
        check('dongia', employee.donGiaTrungBinh, departmentAverages.donGiaTrungBinh);
        check('dongia', employee.donGiaTivi, departmentAverages.donGiaTivi);
        check('dongia', employee.donGiaTuLanh, departmentAverages.donGiaTuLanh);
        check('dongia', employee.donGiaMayGiat, departmentAverages.donGiaMayGiat);
        check('dongia', employee.donGiaMayLanh, departmentAverages.donGiaMayLanh);
        check('dongia', employee.donGiaDienThoai, departmentAverages.donGiaDienThoai);
        check('dongia', employee.donGiaLaptop, departmentAverages.donGiaLaptop);

        const totalAbove = Object.values(counts).reduce((sum, grp) => sum + grp.above, 0);
        const totalCriteria = Object.values(counts).reduce((sum, grp) => sum + grp.total, 0);

        return { ...employee, summary: counts, totalAbove, totalCriteria };
    },

    /**
     * Xử lý toàn bộ danh sách nhân viên để thêm thông tin đánh giá.
     */
    processReportData(rawReportData) {
        if (!rawReportData || rawReportData.length === 0) return [];
        return rawReportData.map(emp => {
            const deptAvg = this.calculateDepartmentAverages(emp.boPhan, rawReportData);
            return this.evaluateEmployee(emp, deptAvg);
        });
    }
};