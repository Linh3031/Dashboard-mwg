// File: src/services/composerService.js
// MỤC ĐÍCH: Logic Trình tạo Nhận xét (Update: Lọc nhân viên có số bán cho BOT_TARGET)

import { get } from 'svelte/store';
import { masterReportData, selectedWarehouse } from '../stores.js';
import { dataProcessing } from './dataProcessing.js';
import * as utils from '../utils.js'; 
import { formatters } from '../utils/formatters.js';

const composerServices = {
    // --- Helpers cho Xếp hạng ---
    getEmployeeRanking(reportData, key, direction = 'desc', count = 3, department = 'ALL') {
        if (!reportData || reportData.length === 0) return [];
        let filteredData = reportData;
        if (department !== 'ALL') {
            filteredData = reportData.filter(e => e.boPhan === department);
        }

        return [...filteredData]
            .filter(e => e[key] > 0 || (key === 'tyLeTraCham' && e[key] >= 0)) 
            .sort((a, b) => direction === 'desc' ? (b[key] || 0) - (a[key] || 0) : (a[key] || 0) - (b[key] || 0))
            .slice(0, count);
    },

    // [PHẪU THUẬT LOGIC]: Sửa lỗi gom nhân viên chưa vào ca (Doanh thu = 0) vào danh sách dưới target
    getEmployeesBelowTarget(reportData, dataKey, goalKey, department = 'ALL') {
        if (!reportData || reportData.length === 0) return [];
        let filteredData = reportData;
        if (department !== 'ALL') {
            filteredData = reportData.filter(e => e.boPhan === department);
        }

        return filteredData.filter(employee => {
            // Kiểm tra điều kiện tiên quyết: Nhân viên phải có đi làm và phát sinh số bán tổng trước đã
            const hasSales = (employee.doanhThu > 0) || (employee.doanhThuQuyDoi > 0);
            if (!hasSales) return false; // Không có số bán tổng -> Loại ngay lập tức (Chưa vào ca / Nghỉ làm)

            const value = employee[dataKey] || 0;
            const target = (employee.mucTieu?.[goalKey] || 0) / 100;
            
            // Nếu có số bán tổng và tỷ lệ thấp hơn chỉ tiêu thì giữ lại (Kể cả tỷ lệ ngành hàng đó = 0)
            return target > 0 && value < target;
        }).sort((a, b) => (b[dataKey] || 0) - (a[dataKey] || 0));
    },

    formatEmployeeList(employeeArray, valueKey, valueType = 'number') {
        if (!Array.isArray(employeeArray) || employeeArray.length === 0) {
            return " (không có)";
        }
        return "\n" + employeeArray.map((e, index) => {
            const value = e[valueKey];
            let formattedValue = '';
            if (valueType === 'percent') {
                formattedValue = formatters.formatPercentage(value);
            } else if (valueType === 'currency') {
                formattedValue = formatters.formatRevenue(value) + " tr";
            } else {
                formattedValue = formatters.formatNumberOrDash(value);
            }
            return `${index + 1}. ${formatters.getShortEmployeeName(e.hoTen, e.maNV)}: ${formattedValue} @${e.maNV}`;
        }).join("\n");
    },
    
    // --- LOGIC XỬ LÝ CHÍNH ---
    processComposerTemplate(template, supermarketReport, goals, rankingReportData, competitionData, sectionId) {
        if (!template || !supermarketReport || !goals) {
            return "Lỗi: Dữ liệu không đủ để tạo nhận xét.";
        }

        const tagMapping = {
            'DTQD': { key: 'doanhThuQuyDoi', format: 'currency' },
            'THUNHAP': { key: 'tongThuNhap', format: 'currency' },
            'TLQD': { key: 'hieuQuaQuyDoi', format: 'percent' },
            'TLTC': { key: 'tyLeTraCham', format: 'percent' } 
        };

        const botTargetMapping = {
            'TLQD': { dataKey: 'hieuQuaQuyDoi', goalKey: 'phanTramQD', format: 'percent' },
            'TLTC': { dataKey: 'tyLeTraCham', goalKey: 'phanTramTC', format: 'percent' },
            'PK': { dataKey: 'pctPhuKien', goalKey: 'phanTramPhuKien', format: 'percent' },
            'GD': { dataKey: 'pctGiaDung', goalKey: 'phanTramGiaDung', format: 'percent' },
            'MLN': { dataKey: 'pctMLN', goalKey: 'phanTramMLN', format: 'percent' },
            'SIM': { dataKey: 'pctSim', goalKey: 'phanTramSim', format: 'percent' },
            'VAS': { dataKey: 'pctVAS', goalKey: 'phanTramVAS', format: 'percent' },
            'BH': { dataKey: 'pctBaoHiem', goalKey: 'phanTramBaoHiem', format: 'percent' },
        };

        // --- BƯỚC 1: KHỞI TẠO BIẾN CHỨA SỐ LIỆU MẶC ĐỊNH TỪ KHỐI TỰ TÍNH (YCX / REALTIME) ---
        let dtThuc = supermarketReport.doanhThu || 0;
        let dtQd = supermarketReport.doanhThuQuyDoi || 0;
        let tlQd = supermarketReport.hieuQuaQuyDoi || 0; 
        let tlTraCham = supermarketReport.tyLeTraCham || 0;
        let comparisonPercentage = supermarketReport.comparisonData?.percentage || 'N/A';
        
        let dtThucDuKienFromPaste = 0; 
        let phanTramTargetQdFromPaste = null;
        let phanTramTargetThucFromPaste = null;
        
        let hasValidPasteData = false;
        const warehouseContext = get(selectedWarehouse);

        // --- BƯỚC 2: CHỈ ĐÈ DỮ LIỆU DÁN ĐỐI VỚI NGỮ CẢNH LUY KẾ ---
        if (sectionId === 'luyke' && typeof localStorage !== 'undefined') {
            let pastedText = null;
            const isClusterMode = !warehouseContext || warehouseContext === 'ALL' || Array.isArray(warehouseContext);
            
            if (isClusterMode) {
                pastedText = localStorage.getItem('daily_paste_luyke_tonghop') || 
                             localStorage.getItem('daily_paste_luyke_all') || 
                             localStorage.getItem('daily_paste_luyke');
            } else {
                pastedText = localStorage.getItem(`daily_paste_luyke_${warehouseContext}`) || 
                             localStorage.getItem('daily_paste_luyke');
            }

            if (pastedText) {
                const pastedData = dataProcessing.parseLuyKePastedData(pastedText);
                if (pastedData && pastedData.mainKpis) {
                    const { mainKpis, comparisonData, dtDuKien, tyLeTraCham: pastedTyLeTraCham } = pastedData;
                    const clean = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
                    
                    if (mainKpis['Thực hiện DT thực']) {
                        const dtThucPaste = clean(mainKpis['Thực hiện DT thực']) * 1000000;
                        const dtQdPaste = clean(mainKpis['Thực hiện DTQĐ']) * 1000000;

                        if (dtThucPaste > 0) {
                            dtThuc = dtThucPaste;
                            dtQd = dtQdPaste;
                            tlQd = (dtQd / dtThuc) - 1;
                            hasValidPasteData = true;
                        }
                    }

                    if (mainKpis['% HT Target Dự Kiến (QĐ)']) {
                         const rawPct = String(mainKpis['% HT Target Dự Kiến (QĐ)']).replace(/%|,/g, '');
                         phanTramTargetQdFromPaste = parseFloat(rawPct) / 100;
                         hasValidPasteData = true;
                    }

                    if (mainKpis['% HT Target Thực'] || mainKpis['% HT Target DT thực']) {
                        const rawPctThuc = String(mainKpis['% HT Target Thực'] || mainKpis['% HT Target DT thực']).replace(/%|,/g, '');
                        phanTramTargetThucFromPaste = parseFloat(rawPctThuc) / 100;
                        hasValidPasteData = true;
                    }

                    if (pastedTyLeTraCham !== undefined) {
                        tlTraCham = parseFloat(pastedTyLeTraCham) / 100;
                        hasValidPasteData = true;
                    }

                    if (dtDuKien) {
                        dtThucDuKienFromPaste = parseFloat(String(dtDuKien).replace(/,/g, '')) * 1000000;
                        hasValidPasteData = true;
                    }

                    if (comparisonData && comparisonData.percentage) {
                        comparisonPercentage = comparisonData.percentage;
                        hasValidPasteData = true;
                    }
                }
            }
        }

        const now = new Date();
        const currentDay = now.getDate() || 1;

        // --- BƯỚC 3: DỊCH CÁC THÈ TAGS ---
        return template.replace(/\[(.*?)\]/g, (match, tag) => {
            
            if (tag === 'NGAY') return now.toLocaleDateString('vi-VN');
            if (tag === 'GIO') return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            // Chỉ kích hoạt cơ chế Fail-Fast chặn lỗi khi và chỉ khi đang ở tab luyke
            const kpiTags = ['DT_THUC', 'DTQD', 'TLQD', 'TLTC', '%HT_DTQD', '%HT_DTT', 'SS_CUNGKY'];
            if (sectionId === 'luyke' && kpiTags.includes(tag)) {
                if (!hasValidPasteData) {
                    return "⚠️ CHƯA DÁN DỮ LIỆU CHẾ ĐỘ NÀY";
                }
            }

            if (tag === 'DT_THUC') return formatters.formatNumber(dtThuc / 1000000, 0) + " tr";
            if (tag === 'DTQD') return formatters.formatNumber(dtQd / 1000000, 0) + " tr";
            if (tag === 'TLQD') return formatters.formatPercentage(tlQd);
            if (tag === 'TLTC') return formatters.formatPercentage(tlTraCham);
            
            if (tag === '%HT_DTQD') {
                if (phanTramTargetQdFromPaste !== null) {
                    return formatters.formatPercentage(phanTramTargetQdFromPaste);
                }
                const targetMillions = parseFloat(goals.doanhThuQD) || 0;
                if (targetMillions > 0) {
                    const currentRevMillions = dtQd / 1000000;
                    return formatters.formatPercentage(currentRevMillions / targetMillions);
                }
                return '0%';
            }

            if (tag === '%HT_DTT') {
                if (phanTramTargetThucFromPaste !== null) {
                    return formatters.formatPercentage(phanTramTargetThucFromPaste);
                }
                const targetMillions = parseFloat(goals.doanhThuThuc) || 0;
                if (targetMillions > 0) {
                    const currentRevMillions = dtThuc / 1000000;
                    return formatters.formatPercentage(currentRevMillions / targetMillions);
                }
                return '0%';
            }

            if (tag === 'DT_CHUAXUAT') return formatters.formatRevenue(supermarketReport.doanhThuQuyDoiChuaXuat || 0) + " tr";
            if (tag === 'SS_CUNGKY') return comparisonPercentage;

            if (tag.startsWith('TD_')) {
                const total = competitionData?.length || 0;
                const dat = (competitionData || []).filter(d => parseFloat(String(d.hoanThanh).replace('%','')) >= 100).length;
                if (tag === 'TD_TONG_CT') return total;
                if (tag === 'TD_CT_DAT') return dat;
                if (tag === 'TD_CT_CHUADAT') return total - dat;
                if (tag === 'TD_TYLE_DAT') return total > 0 ? formatters.formatPercentage(dat / total) : '0%';
            }

            if (tag === 'TOP_QDC_INFO') {
                if (!supermarketReport.qdc) return " (không có)";
                const qdcArray = Object.values(supermarketReport.qdc).filter(item => item.sl > 0);
                const sortedQDC = qdcArray.sort((a,b) => b.dtqd - a.dtqd);
                return "\n" + sortedQDC.map(item => `  • ${item.name}: SL ${formatters.formatNumber(item.sl)}, TB ${formatters.formatNumber(item.sl / currentDay, 1)}/ngày`).join("\n");
            }
            if (tag === 'TOP_NGANHHANG_SL') {
                if (!supermarketReport.nganhHangChiTiet) return " (không có)";
                const nganhHangArray = Object.values(supermarketReport.nganhHangChiTiet).filter(item => item.quantity > 0);
                const topNganhHang = nganhHangArray.sort((a,b) => b.quantity - a.quantity).slice(0, 10);
                return "\n" + topNganhHang.map(item => `  • ${utils.cleanCategoryName(item.name)}: ${formatters.formatNumber(item.quantity)}`).join("\n");
            }

            const rankingRegex = /^(TOP|BOT)(\d)_(\w+)_([\s\S]+)$/;
            const rankingMatch = tag.match(rankingRegex);
            if (rankingMatch && rankingReportData) {
                const [_, type, count, metric, department] = rankingMatch;
                const cleanDepartment = department.replace(/@msnv$/, '').trim();
                const direction = type === 'TOP' ? 'desc' : 'asc';
                const metricInfo = tagMapping[metric];
                if (metricInfo) {
                    let dataForRanking = rankingReportData;
                    if (metric === 'THUNHAP') {
                         const masterData = get(masterReportData);
                         if (masterData && masterData.sknv.length > 0) {
                            dataForRanking = masterData.sknv;
                         }
                    }
                    const ranking = composerServices.getEmployeeRanking(dataForRanking, metricInfo.key, direction, parseInt(count), cleanDepartment);
                    return composerServices.formatEmployeeList(ranking, metricInfo.key, metricInfo.format);
                }
            }

            const botTargetRegex = /^BOT_TARGET_(\w+)_([\s\S]+)$/;
            const botTargetMatch = tag.match(botTargetRegex);
            if(botTargetMatch && rankingReportData) {
                let [_, metric, department] = botTargetMatch;
                department = department.replace(/@msnv$/, '').trim();
                const metricInfo = botTargetMapping[metric];
                if (metricInfo) {
                    const employeeList = composerServices.getEmployeesBelowTarget(rankingReportData, metricInfo.dataKey, metricInfo.goalKey, department);
                    return composerServices.formatEmployeeList(employeeList, metricInfo.dataKey, metricInfo.format);
                }
            }

            const qdcInfoRegex = /^QDC_INFO_(.+)$/;
            const qdcMatch = tag.match(qdcInfoRegex);
            if(qdcMatch && supermarketReport.qdc){
                const itemName = qdcMatch[1];
                const itemData = Object.values(supermarketReport.qdc).find(i => i.name === itemName);
                return itemData ? `SL ${formatters.formatNumber(itemData.sl)}, TB ${formatters.formatNumber(itemData.sl / currentDay, 1)}/ngày` : '(N/A)';
            }

            const nhInfoRegex = /^NH_INFO_(.+)$/;
            const nhMatch = tag.match(nhInfoRegex);
            if(nhMatch && supermarketReport.nganhHangChiTiet){
                const itemName = nhMatch[1];
                 const itemData = Object.values(supermarketReport.nganhHangChiTiet).find(i => utils.cleanCategoryName(i.name) === itemName);
                return itemData ? `SL ${formatters.formatNumber(itemData.quantity)}, TB ${formatters.formatNumber(itemData.quantity / currentDay, 1)}/ngày` : '(N/A)';
            }

            return match;
        });
    },
};

export const composerService = composerServices;