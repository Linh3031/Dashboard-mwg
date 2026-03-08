/* global XLSX */
import { notificationStore } from '../stores.js';

// --- HÀM TRỢ LÝ TỰ ĐỘNG TẮT THÔNG BÁO ---
function notifyAndAutoHide(message, type = 'info') {
    // Bật thông báo
    notificationStore.set({ message, type, visible: true });
    
    // Hẹn giờ 3 giây (3000ms) sau tự động tắt
    setTimeout(() => {
        notificationStore.update(state => ({ ...state, visible: false }));
    }, 3000);
}

export const excelService = {
    /**
     * Xuất bảng HTML ra file Excel
     * @param {HTMLElement} tableElement - Element bảng hoặc container chứa bảng
     * @param {string} fileName - Tên file muốn lưu
     */
    exportTableToExcel(tableElement, fileName) {
        if (!tableElement) {
            notifyAndAutoHide('Không tìm thấy nội dung để xuất.', 'error'); 
            return;
        }

        // Tìm thẻ table bên trong nếu element truyền vào là container
        let table = tableElement.tagName === 'TABLE' 
            ? tableElement 
            : tableElement.querySelector('table');

        if (!table) {
            table = tableElement.querySelector('.department-block table, #sknv-summary-container table, #luyke-competition-content table');
        }

        if (!table) {
            notifyAndAutoHide('Không tìm thấy bảng dữ liệu trong khu vực này để xuất.', 'error'); 
            return;
        }

        try {
            const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            notifyAndAutoHide(`Đã xuất file ${fileName}.xlsx thành công!`, 'success'); 
        } catch (e) {
            console.error('[ExcelService] Lỗi xuất Excel:', e);
            notifyAndAutoHide('Có lỗi xảy ra khi xuất file Excel.', 'error'); 
        }
    }
};