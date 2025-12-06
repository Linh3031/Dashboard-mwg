import { get } from 'svelte/store';
import { charts } from '../stores.js'; // Store chứa instance biểu đồ

/**
 * Chèn CSS styles động để định dạng ảnh chụp
 */
export const injectCaptureStyles = () => {
    const styleId = 'dynamic-capture-styles';
    document.getElementById(styleId)?.remove();

    const styles = `
        .capture-container { 
            padding: 24px; 
            background-color: #f3f4f6; 
            box-sizing: border-box; 
            width: fit-content; 
            position: absolute;
            left: -9999px;
            top: 0;
            z-index: -1;
        }
        .capture-layout-container { 
            display: flex; 
            flex-direction: column; 
            gap: 24px; 
        }
        .capture-title { 
            font-size: 28px; 
            font-weight: 700; 
            text-align: center; 
            color: #1f2937; 
            margin-bottom: 24px; 
            padding: 12px; 
            background-color: #ffffff; 
            border-radius: 0.75rem; 
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); 
        }
        /* --- VIRTUAL STAGES / PRESETS --- */
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 24px !important;
            width: 900px !important;
        }
        .preset-mobile-portrait {
            width: 550px !important; 
        }
        .preset-landscape-table {
            width: fit-content !important;
        }
        .preset-landscape-table table {
            table-layout: fixed !important;
        }
        .preset-landscape-table th, 
        .preset-landscape-table td {
            width: 95px !important;
            word-wrap: break-word;
        }
        .preset-landscape-table th:first-child,
        .preset-landscape-table td:first-child {
            width: 180px !important;
        }
        .preset-large-font-report {
            width: 800px !important;
        }
        .preset-large-font-report table th {
            white-space: normal !important;
            vertical-align: middle;
        }
        .preset-large-font-report table td {
            font-size: 22px !important;
            vertical-align: middle;
        }
        .preset-infographic-wide {
            width: 1100px !important;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    return styleElement;
};

/**
 * Tìm và thay thế tất cả <canvas> của Chart.js bằng <img> tĩnh.
 * @param {HTMLElement} element - Vùng DOM (clone) sắp được chụp.
 */
export const swapCanvasToImage = (element) => {
    console.log("[CaptureUtils] Swapping canvas to image...");
    const canvasElements = element.querySelectorAll('canvas');
    let replacedCount = 0;
    
    // Lấy danh sách chart từ store Svelte
    const $charts = get(charts);

    canvasElements.forEach(canvas => {
        const chartId = canvas.id;
        if (chartId && $charts[chartId]) {
            try {
                const chart = $charts[chartId];
                const base64Image = chart.toBase64Image(); // Lấy ảnh tĩnh
                
                if (base64Image) {
                    const img = document.createElement('img');
                    img.src = base64Image;
                    // Giữ nguyên kích thước để tránh vỡ layout
                    img.style.width = canvas.style.width || `${canvas.width}px`;
                    img.style.height = canvas.style.height || `${canvas.height}px`;
                    img.style.display = 'block';
                    
                    // Thay thế canvas bằng img
                    canvas.parentNode.replaceChild(img, canvas);
                    replacedCount++;
                }
            } catch (e) {
                console.error(`[CaptureUtils] Lỗi khi hoán đổi canvas '${chartId}':`, e);
            }
        }
    });
    console.log(`[CaptureUtils] Đã hoán đổi ${replacedCount} biểu đồ.`);
};