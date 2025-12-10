import { formatters } from '../utils/formatters.js';
import { cleanCategoryName } from '../utils.js';

export const sknvService = {
    calculateDepartmentAverages(departmentName, reportData) {
        const departmentEmployees = reportData.filter(e => e.boPhan === departmentName);
        if (departmentEmployees.length === 0) return {};

        const totals = departmentEmployees.reduce((acc, curr) => {
            Object.keys(curr).forEach(key => {
                if (typeof curr[key] === 'number') acc[key] = (acc[key] || 0) + curr[key];
            });
            if (curr.qdc) {
                if (!acc.qdc) acc.qdc = {};
                for (const k in curr.qdc) {
                    if (!acc.qdc[k]) acc.qdc[k] = { sl: 0, dt: 0, dtqd: 0 };
                    acc.qdc[k].sl += curr.qdc[k].sl;
                    acc.qdc[k].dt += curr.qdc[k].dt;
                    acc.qdc[k].dtqd += curr.qdc[k].dtqd;
                }
            }
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

        check('doanhthu', employee.doanhThu, departmentAverages.doanhThu);
        check('doanhthu', employee.doanhThuQuyDoi, departmentAverages.doanhThuQuyDoi);
        check('doanhthu', employee.hieuQuaQuyDoi, departmentAverages.hieuQuaQuyDoi);
        check('doanhthu', employee.dtCE, departmentAverages.dtCE);
        check('doanhthu', employee.dtICT, departmentAverages.dtICT);
        check('doanhthu', employee.doanhThuTraGop, departmentAverages.doanhThuTraGop);
        check('doanhthu', employee.tyLeTraCham, departmentAverages.tyLeTraCham);
        
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

        check('hieuqua', employee.pctPhuKien, departmentAverages.pctPhuKien);
        check('hieuqua', employee.pctGiaDung, departmentAverages.pctGiaDung);
        check('hieuqua', employee.pctMLN, departmentAverages.pctMLN);
        check('hieuqua', employee.pctSim, departmentAverages.pctSim);
        check('hieuqua', employee.pctVAS, departmentAverages.pctVAS);
        check('hieuqua', employee.pctBaoHiem, departmentAverages.pctBaoHiem);

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

    processReportData(rawReportData) {
        if (!rawReportData || rawReportData.length === 0) return [];
        return rawReportData.map(emp => {
            const deptAvg = this.calculateDepartmentAverages(emp.boPhan, rawReportData);
            return this.evaluateEmployee(emp, deptAvg);
        });
    },

    getDetailStats(employeeData, departmentAverages, customMetrics = []) {
        if (!employeeData || !departmentAverages) return {};

        const { mucTieu } = employeeData;
        const fmtRev = (val) => formatters.formatRevenue(val);
        const fmtNum = (val) => formatters.formatNumberOrDash(val);
        const fmtPct = (val) => formatters.formatPercentage(val);

        const doanhThu = [
            { id: 'dtThuc', label: 'Doanh thu thực', value: fmtRev(employeeData.doanhThu), average: fmtRev(departmentAverages.doanhThu), rawValue: employeeData.doanhThu, rawAverage: departmentAverages.doanhThu },
            { id: 'dtQD', label: 'Doanh thu QĐ', value: fmtRev(employeeData.doanhThuQuyDoi), average: fmtRev(departmentAverages.doanhThuQuyDoi), rawValue: employeeData.doanhThuQuyDoi, rawAverage: departmentAverages.doanhThuQuyDoi },
            { id: 'pctQD', label: '% Quy đổi', value: fmtPct(employeeData.hieuQuaQuyDoi), valueClass: (mucTieu && employeeData.hieuQuaQuyDoi < (mucTieu.phanTramQD / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.hieuQuaQuyDoi), rawValue: employeeData.hieuQuaQuyDoi, rawAverage: departmentAverages.hieuQuaQuyDoi },
            { id: 'dtCE', label: 'DT CE', value: fmtRev(employeeData.dtCE), average: fmtRev(departmentAverages.dtCE), rawValue: employeeData.dtCE, rawAverage: departmentAverages.dtCE },
            { id: 'dtICT', label: 'DT ICT', value: fmtRev(employeeData.dtICT), average: fmtRev(departmentAverages.dtICT), rawValue: employeeData.dtICT, rawAverage: departmentAverages.dtICT },
            { id: 'dtTraCham', label: 'DT Trả chậm', value: fmtRev(employeeData.doanhThuTraGop), average: fmtRev(departmentAverages.doanhThuTraGop), rawValue: employeeData.doanhThuTraGop, rawAverage: departmentAverages.doanhThuTraGop },
            { id: 'pctTraCham', label: '% Trả chậm', value: fmtPct(employeeData.tyLeTraCham), valueClass: (mucTieu && employeeData.tyLeTraCham < (mucTieu.phanTramTC / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.tyLeTraCham), rawValue: employeeData.tyLeTraCham, rawAverage: departmentAverages.tyLeTraCham }
        ];

        const nangSuat = [
            { id: 'thuongNong', label: 'Thưởng nóng', value: fmtRev(employeeData.thuongNong), average: fmtRev(departmentAverages.thuongNong), rawValue: employeeData.thuongNong, rawAverage: departmentAverages.thuongNong },
            { id: 'thuongERP', label: 'Thưởng ERP', value: fmtRev(employeeData.thuongERP), average: fmtRev(departmentAverages.thuongERP), rawValue: employeeData.thuongERP, rawAverage: departmentAverages.thuongERP },
            { id: 'thuNhapLK', label: 'Thu nhập LK', value: fmtRev(employeeData.tongThuNhap), average: fmtRev(departmentAverages.tongThuNhap), rawValue: employeeData.tongThuNhap, rawAverage: departmentAverages.tongThuNhap },
            { id: 'thuNhapDK', label: 'Thu nhập DK', value: fmtRev(employeeData.thuNhapDuKien), average: fmtRev(departmentAverages.thuNhapDuKien), rawValue: employeeData.thuNhapDuKien, rawAverage: departmentAverages.thuNhapDuKien },
            { id: 'gioCong', label: 'Giờ công', value: fmtNum(employeeData.gioCong), average: fmtNum(departmentAverages.gioCong), rawValue: employeeData.gioCong, rawAverage: departmentAverages.gioCong },
            { id: 'tnTrenGc', label: 'TN/Giờ công', value: fmtNum(employeeData.gioCong > 0 ? employeeData.tongThuNhap / employeeData.gioCong : 0), average: fmtNum((departmentAverages.gioCong || 0) > 0 ? (departmentAverages.tongThuNhap || 0) / departmentAverages.gioCong : 0), rawValue: employeeData.gioCong > 0 ? employeeData.tongThuNhap / employeeData.gioCong : 0, rawAverage: (departmentAverages.gioCong || 0) > 0 ? (departmentAverages.tongThuNhap || 0) / departmentAverages.gioCong : 0 },
            { id: 'dtqdTrenGc', label: 'DTQĐ/Giờ công', value: fmtRev(employeeData.gioCong > 0 ? employeeData.doanhThuQuyDoi / employeeData.gioCong : 0), average: fmtRev((departmentAverages.gioCong || 0) > 0 ? (departmentAverages.doanhThuQuyDoi || 0) / departmentAverages.gioCong : 0), rawValue: employeeData.gioCong > 0 ? employeeData.doanhThuQuyDoi / employeeData.gioCong : 0, rawAverage: (departmentAverages.gioCong || 0) > 0 ? (departmentAverages.doanhThuQuyDoi || 0) / departmentAverages.gioCong : 0 }
        ];

        const hieuQua = [
            { id: 'pctPhuKien', label: '% PK', value: fmtPct(employeeData.pctPhuKien), valueClass: (mucTieu && employeeData.pctPhuKien < (mucTieu.phanTramPhuKien / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.pctPhuKien), rawValue: employeeData.pctPhuKien, rawAverage: departmentAverages.pctPhuKien },
            { id: 'pctGiaDung', label: '% Gia dụng', value: fmtPct(employeeData.pctGiaDung), valueClass: (mucTieu && employeeData.pctGiaDung < (mucTieu.phanTramGiaDung / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.pctGiaDung), rawValue: employeeData.pctGiaDung, rawAverage: departmentAverages.pctGiaDung },
            { id: 'pctMLN', label: '% MLN', value: fmtPct(employeeData.pctMLN), valueClass: (mucTieu && employeeData.pctMLN < (mucTieu.phanTramMLN / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.pctMLN), rawValue: employeeData.pctMLN, rawAverage: departmentAverages.pctMLN },
            { id: 'pctSim', label: '% Sim', value: fmtPct(employeeData.pctSim), valueClass: (mucTieu && employeeData.pctSim < (mucTieu.phanTramSim / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.pctSim), rawValue: employeeData.pctSim, rawAverage: departmentAverages.pctSim },
            { id: 'pctVAS', label: '% VAS', value: fmtPct(employeeData.pctVAS), valueClass: (mucTieu && employeeData.pctVAS < (mucTieu.phanTramVAS / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.pctVAS), rawValue: employeeData.pctVAS, rawAverage: departmentAverages.pctVAS },
            { id: 'pctBaoHiem', label: '% Bảo hiểm', value: fmtPct(employeeData.pctBaoHiem), valueClass: (mucTieu && employeeData.pctBaoHiem < (mucTieu.phanTramBaoHiem / 100)) ? 'text-red-600 bg-red-50' : '', average: fmtPct(departmentAverages.pctBaoHiem), rawValue: employeeData.pctBaoHiem, rawAverage: departmentAverages.pctBaoHiem },
        ];

        const donGia = [
            { id: 'dgTB', label: 'Đơn giá TB', value: fmtRev(employeeData.donGiaTrungBinh), average: fmtRev(departmentAverages.donGiaTrungBinh), rawValue: employeeData.donGiaTrungBinh, rawAverage: departmentAverages.donGiaTrungBinh },
            { id: 'dgTivi', label: 'Đơn giá Tivi', value: fmtRev(employeeData.donGiaTivi), average: fmtRev(departmentAverages.donGiaTivi), rawValue: employeeData.donGiaTivi, rawAverage: departmentAverages.donGiaTivi },
            { id: 'dgTuLanh', label: 'Đơn giá Tủ lạnh', value: fmtRev(employeeData.donGiaTuLanh), average: fmtRev(departmentAverages.donGiaTuLanh), rawValue: employeeData.donGiaTuLanh, rawAverage: departmentAverages.donGiaTuLanh },
            { id: 'dgMayGiat', label: 'Đơn giá Máy giặt', value: fmtRev(employeeData.donGiaMayGiat), average: fmtRev(departmentAverages.donGiaMayGiat), rawValue: employeeData.donGiaMayGiat, rawAverage: departmentAverages.donGiaMayGiat },
            { id: 'dgMayLanh', label: 'Đơn giá Máy lạnh', value: fmtRev(employeeData.donGiaMayLanh), average: fmtRev(departmentAverages.donGiaMayLanh), rawValue: employeeData.donGiaMayLanh, rawAverage: departmentAverages.donGiaMayLanh },
            { id: 'dgDienThoai', label: 'Đơn giá Điện thoại', value: fmtRev(employeeData.donGiaDienThoai), average: fmtRev(departmentAverages.donGiaDienThoai), rawValue: employeeData.donGiaDienThoai, rawAverage: departmentAverages.donGiaDienThoai },
            { id: 'dgLaptop', label: 'Đơn giá Laptop', value: fmtRev(employeeData.donGiaLaptop), average: fmtRev(departmentAverages.donGiaLaptop), rawValue: employeeData.donGiaLaptop, rawAverage: departmentAverages.donGiaLaptop },
        ];

        if (customMetrics && customMetrics.length > 0) {
            customMetrics.forEach(metric => {
                const empVal = this.calculateDynamicMetricValue(employeeData, metric);
                const avgVal = departmentAverages[`custom_${metric.id}`] || 0; 

                const newItem = {
                    id: metric.id,
                    label: metric.label,
                    rawValue: empVal,
                    rawAverage: avgVal,
                    isCustom: true,
                    rawConfig: metric // [MỚI] Lưu config gốc để có thể sửa/xóa
                };

                if (metric.type === 'UNIT_PRICE') {
                    newItem.value = fmtRev(empVal);
                    newItem.average = fmtRev(avgVal);
                    donGia.push(newItem);
                } else {
                    newItem.value = fmtPct(empVal);
                    newItem.average = fmtPct(avgVal);
                    newItem.valueClass = (metric.target && empVal < (metric.target / 100)) ? 'text-red-600 bg-red-50' : '';
                    hieuQua.push(newItem);
                }
            });
        }

        return { doanhThu, nangSuat, hieuQua, donGia };
    },

    calculateDynamicMetricValue(data, metricConfig) {
        const sumValues = (listNames, metricType) => {
            let total = 0;
            if(!listNames || listNames.length === 0) return 0;

            listNames.forEach(name => {
                const cleanName = cleanCategoryName(name);
                let item = data.doanhThuTheoNganhHang?.[cleanName];
                if (!item && data.doanhThuTheoNhomHang) {
                    item = data.doanhThuTheoNhomHang[cleanName];
                }

                if (item) {
                    if (metricType === 'SL') total += item.quantity;
                    else if (metricType === 'DTQD') total += item.revenueQuyDoi;
                    else total += item.revenue; 
                }
            });
            return total;
        };

        const numVal = sumValues(metricConfig.groupA, metricConfig.typeA);
        const denVal = sumValues(metricConfig.groupB, metricConfig.typeB);

        return denVal > 0 ? numVal / denVal : 0;
    }
};