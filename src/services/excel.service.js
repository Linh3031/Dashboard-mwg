/* global XLSX */
import { notificationStore } from '../stores.js'; 

export const excelService = {
    /**
     * Xuất bảng HTML ra file Excel
     * @param {HTMLElement} tableElement - Element bảng hoặc container chứa bảng
     * @param {string} fileName - Tên file muốn lưu
     */
    exportTableToExcel(tableElement, fileName) {
        if (!tableElement) {
            notificationStore.set({ message: 'Không tìm thấy nội dung để xuất.', type: 'error', visible: true }); 
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
            notificationStore.set({ message: 'Không tìm thấy bảng dữ liệu trong khu vực này để xuất.', type: 'error', visible: true }); 
            return;
        }

        try {
            const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            notificationStore.set({ message: `Đã xuất file ${fileName}.xlsx thành công!`, type: 'success', visible: true }); 
        } catch (e) {
            console.error('[ExcelService] Lỗi xuất Excel:', e);
            notificationStore.set({ message: 'Có lỗi xảy ra khi xuất file Excel.', type: 'error', visible: true }); 
        }
    }
};