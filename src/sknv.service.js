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
    },

    /**
     * [QUAN TRỌNG] Chuẩn bị dữ liệu chi tiết để hiển thị lên Grid.
     * Đây là hàm bị thiếu gây ra lỗi TypeError.
     */
    getDetailStats(employeeData, departmentAverages) {
        if (!employeeData || !departmentAverages) return {};

        const { mucTieu } = employeeData;

        // 1. Nhóm Doanh Thu
        const doanhThu = [
            { label: 'Doanh thu thực', value: formatters.formatRevenue(employeeData.doanhThu), average: formatters.formatRevenue(departmentAverages.doanhThu || 0), rawValue: employeeData.doanhThu, rawAverage: departmentAverages.doanhThu },
            { label: 'Doanh thu QĐ', value: formatters.formatRevenue(employeeData.doanhThuQuyDoi), average: formatters.formatRevenue(departmentAverages.doanhThuQuyDoi || 0), rawValue: employeeData.doanhThuQuyDoi, rawAverage: departmentAverages.doanhThuQuyDoi },
            { label: '% Quy đổi', value: formatters.formatPercentage(employeeData.hieuQuaQuyDoi), valueClass: (mucTieu && employeeData.hieuQuaQuyDoi < (mucTieu.phanTramQD / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.hieuQuaQuyDoi), rawValue: employeeData.hieuQuaQuyDoi, rawAverage: departmentAverages.hieuQuaQuyDoi },
            { label: 'DT CE', value: formatters.formatRevenue(employeeData.dtCE), average: formatters.formatRevenue(departmentAverages.dtCE || 0), rawValue: employeeData.dtCE, rawAverage: departmentAverages.dtCE },
            { label: 'DT ICT', value: formatters.formatRevenue(employeeData.dtICT), average: formatters.formatRevenue(departmentAverages.dtICT || 0), rawValue: employeeData.dtICT, rawAverage: departmentAverages.dtICT },
            { label: 'DT Trả chậm', value: formatters.formatRevenue(employeeData.doanhThuTraGop), average: formatters.formatRevenue(departmentAverages.doanhThuTraGop || 0), rawValue: employeeData.doanhThuTraGop, rawAverage: departmentAverages.doanhThuTraGop },
            { label: '% Trả chậm', value: formatters.formatPercentage(employeeData.tyLeTraCham), valueClass: (mucTieu && employeeData.tyLeTraCham < (mucTieu.phanTramTC / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.tyLeTraCham), rawValue: employeeData.tyLeTraCham, rawAverage: departmentAverages.tyLeTraCham }
        ];

        // 2. Nhóm Năng Suất
        const nangSuat = [
            { label: 'Thưởng nóng', value: formatters.formatRevenue(employeeData.thuongNong), average: formatters.formatRevenue(departmentAverages.thuongNong || 0), rawValue: employeeData.thuongNong, rawAverage: departmentAverages.thuongNong },
            { label: 'Thưởng ERP', value: formatters.formatRevenue(employeeData.thuongERP), average: formatters.formatRevenue(departmentAverages.thuongERP || 0), rawValue: employeeData.thuongERP, rawAverage: departmentAverages.thuongERP },
            { label: 'Thu nhập LK', value: formatters.formatRevenue(employeeData.tongThuNhap), average: formatters.formatRevenue(departmentAverages.tongThuNhap || 0), rawValue: employeeData.tongThuNhap, rawAverage: departmentAverages.tongThuNhap },
            { label: 'Thu nhập DK', value: formatters.formatRevenue(employeeData.thuNhapDuKien), average: formatters.formatRevenue(departmentAverages.thuNhapDuKien || 0), rawValue: employeeData.thuNhapDuKien, rawAverage: departmentAverages.thuNhapDuKien },
            { label: 'Giờ công', value: formatters.formatNumberOrDash(employeeData.gioCong), average: formatters.formatNumberOrDash(departmentAverages.gioCong), rawValue: employeeData.gioCong, rawAverage: departmentAverages.gioCong },
            { label: 'TN/Giờ công', value: formatters.formatNumberOrDash(employeeData.gioCong > 0 ? employeeData.tongThuNhap / employeeData.gioCong : 0), average: formatters.formatNumberOrDash((departmentAverages.gioCong || 0) > 0 ? (departmentAverages.tongThuNhap || 0) / departmentAverages.gioCong : 0), rawValue: employeeData.gioCong > 0 ? employeeData.tongThuNhap / employeeData.gioCong : 0, rawAverage: (departmentAverages.gioCong || 0) > 0 ? (departmentAverages.tongThuNhap || 0) / departmentAverages.gioCong : 0 },
            { label: 'Doanh thu QĐ/GC', value: formatters.formatRevenue(employeeData.gioCong > 0 ? employeeData.doanhThuQuyDoi / employeeData.gioCong : 0), average: formatters.formatRevenue((departmentAverages.gioCong || 0) > 0 ? (departmentAverages.doanhThuQuyDoi || 0) / departmentAverages.gioCong : 0), rawValue: employeeData.gioCong > 0 ? employeeData.doanhThuQuyDoi / employeeData.gioCong : 0, rawAverage: (departmentAverages.gioCong || 0) > 0 ? (departmentAverages.doanhThuQuyDoi || 0) / departmentAverages.gioCong : 0 }
        ];

        // 3. Nhóm Hiệu Quả
        const hieuQua = [
            { label: '% PK', value: formatters.formatPercentage(employeeData.pctPhuKien), valueClass: (mucTieu && employeeData.pctPhuKien < (mucTieu.phanTramPhuKien / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.pctPhuKien), rawValue: employeeData.pctPhuKien, rawAverage: departmentAverages.pctPhuKien },
            { label: '% Gia dụng', value: formatters.formatPercentage(employeeData.pctGiaDung), valueClass: (mucTieu && employeeData.pctGiaDung < (mucTieu.phanTramGiaDung / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.pctGiaDung), rawValue: employeeData.pctGiaDung, rawAverage: departmentAverages.pctGiaDung },
            { label: '% MLN', value: formatters.formatPercentage(employeeData.pctMLN), valueClass: (mucTieu && employeeData.pctMLN < (mucTieu.phanTramMLN / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.pctMLN), rawValue: employeeData.pctMLN, rawAverage: departmentAverages.pctMLN },
            { label: '% Sim', value: formatters.formatPercentage(employeeData.pctSim), valueClass: (mucTieu && employeeData.pctSim < (mucTieu.phanTramSim / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.pctSim), rawValue: employeeData.pctSim, rawAverage: departmentAverages.pctSim },
            { label: '% VAS', value: formatters.formatPercentage(employeeData.pctVAS), valueClass: (mucTieu && employeeData.pctVAS < (mucTieu.phanTramVAS / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.pctVAS), rawValue: employeeData.pctVAS, rawAverage: departmentAverages.pctVAS },
            { label: '% Bảo hiểm', value: formatters.formatPercentage(employeeData.pctBaoHiem), valueClass: (mucTieu && employeeData.pctBaoHiem < (mucTieu.phanTramBaoHiem / 100)) ? 'text-red-600 bg-red-50' : '', average: formatters.formatPercentage(departmentAverages.pctBaoHiem), rawValue: employeeData.pctBaoHiem, rawAverage: departmentAverages.pctBaoHiem },
        ];

        // 4. Nhóm Đơn Giá
        const donGia = [
            { label: 'Đơn giá TB', value: formatters.formatRevenue(employeeData.donGiaTrungBinh), average: formatters.formatRevenue(departmentAverages.donGiaTrungBinh), rawValue: employeeData.donGiaTrungBinh, rawAverage: departmentAverages.donGiaTrungBinh },
            { label: 'Đơn giá Tivi', value: formatters.formatRevenue(employeeData.donGiaTivi), average: formatters.formatRevenue(departmentAverages.donGiaTivi), rawValue: employeeData.donGiaTivi, rawAverage: departmentAverages.donGiaTivi },
            { label: 'Đơn giá Tủ lạnh', value: formatters.formatRevenue(employeeData.donGiaTuLanh), average: formatters.formatRevenue(departmentAverages.donGiaTuLanh), rawValue: employeeData.donGiaTuLanh, rawAverage: departmentAverages.donGiaTuLanh },
             { label: 'Đơn giá Máy giặt', value: formatters.formatRevenue(employeeData.donGiaMayGiat), average: formatters.formatRevenue(departmentAverages.donGiaMayGiat), rawValue: employeeData.donGiaMayGiat, rawAverage: departmentAverages.donGiaMayGiat },
            { label: 'Đơn giá Máy lạnh', value: formatters.formatRevenue(employeeData.donGiaMayLanh), average: formatters.formatRevenue(departmentAverages.donGiaMayLanh), rawValue: employeeData.donGiaMayLanh, rawAverage: departmentAverages.donGiaMayLanh },
            { label: 'Đơn giá Điện thoại', value: formatters.formatRevenue(employeeData.donGiaDienThoai), average: formatters.formatRevenue(departmentAverages.donGiaDienThoai), rawValue: employeeData.donGiaDienThoai, rawAverage: departmentAverages.donGiaDienThoai },
            { label: 'Đơn giá Laptop', value: formatters.formatRevenue(employeeData.donGiaLaptop), average: formatters.formatRevenue(departmentAverages.donGiaLaptop), rawValue: employeeData.donGiaLaptop, rawAverage: departmentAverages.donGiaLaptop },
        ];

        return { doanhThu, nangSuat, hieuQua, donGia };
    }
};