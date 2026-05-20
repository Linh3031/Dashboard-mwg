import { tick, mount, unmount } from 'svelte';
import { notificationStore } from '../stores.js';
import { captureService } from './capture.service.js';

export const batchCaptureService = {
    /**
     * Hàm chạy băng chuyền chụp ảnh ngầm (Hỗ trợ Svelte 5)
     */
    async captureBatch(SvelteComponent, itemIds, baseTitle, propsExtractor = (id) => ({})) {
        if (!itemIds || itemIds.length === 0) {
            notificationStore.update(s => ({ ...s, visible: true, type: 'error', message: 'Không có dữ liệu nhân viên để chụp.' }));
            return;
        }

        // Tắt hoạt ảnh ChartJS toàn cầu để biểu đồ không bị trống khi chụp ngầm
        if (typeof window.Chart !== 'undefined') window.Chart.defaults.animation = false;

        // Tạo Vùng tối (Ghost Container)
        const ghostContainer = document.createElement('div');
        ghostContainer.className = 'capture-container';
        ghostContainer.style.position = 'absolute';
        ghostContainer.style.left = '-9999px';
        ghostContainer.style.top = '0';
        ghostContainer.style.zIndex = '-1';
        document.body.appendChild(ghostContainer);

        try {
            for (let i = 0; i < itemIds.length; i++) {
                const id = itemIds[i];
                notificationStore.update(s => ({ ...s, visible: true, type: 'info', message: `Đang xử lý ảnh ${i + 1}/${itemIds.length}...` }));

                // 1. Lắp ráp Component vào Vùng tối bằng Svelte 5 API
                const props = propsExtractor(id);
                const componentInstance = mount(SvelteComponent, {
                    target: ghostContainer,
                    props: { ...props, isGhostMode: true }
                });

                // 2. Chờ DOM chín (Svelte render + Chart vẽ)
                await tick();
                await new Promise(resolve => setTimeout(resolve, 800));

                // 3. Tiến hành chụp
                const elementToCapture = ghostContainer.firstElementChild;
                if (elementToCapture) {
                    const dynamicName = elementToCapture.getAttribute('data-capture-filename') || `${baseTitle}_${id}`;
                    await captureService.captureAndDownload(elementToCapture, dynamicName, 'preset-mobile-view');
                    await new Promise(resolve => setTimeout(resolve, 400)); // Tránh nghẽn trình duyệt
                }

                // 4. Phá hủy Component, dọn dẹp RAM bằng Svelte 5 API
                unmount(componentInstance);
                ghostContainer.innerHTML = ''; 
            }
            
            notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: `Hoàn tất tải xuống ${itemIds.length} ảnh!` }));
        } catch (error) {
            console.error("Batch Capture Error:", error);
            notificationStore.update(s => ({ ...s, visible: true, type: 'error', message: 'Lỗi trong quá trình chụp hàng loạt.' }));
        } finally {
            if (document.body.contains(ghostContainer)) document.body.removeChild(ghostContainer);
            if (typeof window.Chart !== 'undefined') window.Chart.defaults.animation = {};
            setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
        }
    }
};