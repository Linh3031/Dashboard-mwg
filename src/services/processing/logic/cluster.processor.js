// src/services/processing/logic/cluster.processor.js

export const clusterProcessor = {
    /**
     * Chuyển đổi dữ liệu thi đua thô thành định dạng hiển thị cho Table
     */
    processCompetitionData: (parsedData) => {
        if (!parsedData) return [];
        
        // Flatten dữ liệu để hiển thị bảng: Mỗi dòng là 1 ngành hàng của 1 siêu thị?
        // Hoặc trả về cấu trúc Group để UI render (Siêu thị -> List Ngành hàng)
        
        // Ở đây tôi trả về cấu trúc nguyên bản đã sạch để UI dễ loop
        return parsedData.stores.map(store => {
            return {
                storeName: store.name,
                metrics: store.data, // [{ category, percent, revenue }]
                totalRevenue: store.data.reduce((acc, curr) => acc + curr.revenue, 0)
            };
        });
    },

    /**
     * Tạo dữ liệu báo cáo tổng hợp cho Cụm
     */
    createClusterReport: (cumulativeData) => {
        if (!cumulativeData) return null;

        const { generalStats, storeDetails } = cumulativeData;

        // Tính tổng thực tế từ các store chi tiết (để đối chiếu với generalStats nếu cần)
        const calculatedTotalDT = storeDetails.reduce((acc, s) => acc + s.dtLuyKe, 0);

        return {
            kpiCards: generalStats, // Dữ liệu cho 4 ô thẻ bài trên cùng
            detailTable: storeDetails, // Dữ liệu cho bảng chi tiết bên dưới
            debug: {
                scannedTotal: generalStats.dtThuc,
                calcTotal: calculatedTotalDT
            }
        };
    }
};