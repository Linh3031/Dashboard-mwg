<script>
    import { createEventDispatcher } from 'svelte';
    import { captureService } from '../../services/capture.service.js';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let title = "";
    export let data = [];
    export let selectedSupermarket = "";
    export let criteriaName = "";

    const currencyFormatter = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    });

    const numberFormatter = new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0 
    });

    function close() {
        dispatch('close');
    }

    // --- LOGIC SẮP XẾP BẢNG ---
    let sortColumn = 'primaryRank';
    let sortDirection = 'asc';
    let sortedData = [];

    $: {
        if (data && data.length > 0) {
            sortedData = [...data].sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];

                if (sortColumn === 'sieuThi') {
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }

                return sortDirection === 'asc' ? valA - valB : valB - valA;
            });
        } else {
            sortedData = [];
        }
    }

    function handleSort(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc'; 
        }
    }

    function portal(node) {
        document.body.appendChild(node);
        return {
            destroy() {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            }
        };
    }

    let captureNode;
    let isCapturing = false;

    async function captureModal() {
        if (!captureNode) return;
        isCapturing = true;
        
        try {
            // Đã bỏ truyền presetClasses qua service vì bị lỗi ngầm nuốt mất class
            const safeName = selectedSupermarket.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Top20_${title}_${safeName}`;
            
            await captureService.captureAndDownload(captureNode, fileName);
        } catch (error) {
            console.error('Lỗi chụp ảnh:', error);
            alert('Có lỗi xảy ra khi chụp ảnh bảng xếp hạng.');
        } finally {
            isCapturing = false;
        }
    }
</script>

{#if show}
<div use:portal class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity" on:click|self={close} on:keydown={(e) => e.key === 'Escape' && close()} tabindex="0" role="button">
    
    <div bind:this={captureNode} class="bg-white rounded-xl shadow-2xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative border border-gray-200 cursor-default top20-capture-node">
        
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white shrink-0">
            <div>
                <h2 class="text-2xl font-black text-blue-900 uppercase flex items-center gap-3 tracking-tight">
                    <span class="w-2 h-8 bg-yellow-400 rounded-full"></span>
                    TOP 20 - NGÀNH HÀNG {title}
                </h2>
                <p class="text-sm text-gray-500 font-medium mt-1 ml-5">
                    Đang xếp hạng dựa trên ưu thế của siêu thị: <span class="text-blue-700 font-bold">{criteriaName}</span>
                </p>
            </div>
            
            <div class="flex items-center gap-3" data-html2canvas-ignore="true">
                <button 
                    class="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors px-4 py-2 rounded-lg font-semibold border border-blue-200 shadow-sm disabled:opacity-50"
                    on:click={captureModal}
                    disabled={isCapturing}
                >
                    {#if isCapturing}
                        <span>⏳ Đang chụp...</span>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        <span>Chụp ảnh</span>
                    {/if}
                </button>

                <button class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" on:click={close} title="Đóng">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>

        <div class="p-0 overflow-y-auto flex-1 bg-white relative">
            <table class="w-full text-sm text-left border-collapse">
                <thead class="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th scope="col" class="px-4 py-4 border-b text-center font-bold text-blue-800 w-24 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('primaryRank')}>
                            <div class="flex items-center justify-center gap-1">Hạng (#) <span class="text-gray-400 text-xs w-3">{sortColumn === 'primaryRank' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                        <th scope="col" class="px-4 py-4 border-b font-bold text-blue-800 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('sieuThi')}>
                            <div class="flex items-center gap-1">Siêu thị <span class="text-gray-400 text-xs w-3">{sortColumn === 'sieuThi' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                        <th scope="col" class="px-4 py-4 border-b text-right font-bold text-blue-800 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('duKienHoanThanh')}>
                            <div class="flex items-center justify-end gap-1">Dự kiến hoàn thành <span class="text-gray-400 text-xs w-3">{sortColumn === 'duKienHoanThanh' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                        <th scope="col" class="px-4 py-4 border-b text-right font-bold text-blue-800 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('duKienVuot')}>
                            <div class="flex items-center justify-end gap-1">Dự kiến DT/SL vượt <span class="text-gray-400 text-xs w-3">{sortColumn === 'duKienVuot' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                        <th scope="col" class="px-4 py-4 border-b text-center font-bold text-blue-800 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('hangVuotTroi')}>
                            <div class="flex items-center justify-center gap-1">Hạng Vượt Trội <span class="text-gray-400 text-xs w-3">{sortColumn === 'hangVuotTroi' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                        <th scope="col" class="px-4 py-4 border-b text-center font-bold text-blue-800 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('hangTarget')}>
                            <div class="flex items-center justify-center gap-1">Hạng Target <span class="text-gray-400 text-xs w-3">{sortColumn === 'hangTarget' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                        <th scope="col" class="px-4 py-4 border-b text-right font-bold text-yellow-600 cursor-pointer hover:bg-gray-200 transition-colors select-none" on:click={() => handleSort('tongThuong')}>
                            <div class="flex items-center justify-end gap-1">Tổng thưởng <span class="text-gray-400 text-xs w-3">{sortColumn === 'tongThuong' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#if sortedData.length === 0}
                        <tr>
                            <td colspan="7" class="px-4 py-10 text-center text-gray-500 text-base">
                                Không tìm thấy dữ liệu thi đua của ngành hàng này.
                            </td>
                        </tr>
                    {:else}
                        {#each sortedData as row}
                            <tr class="border-b transition-colors {row.sieuThi.toLowerCase() === selectedSupermarket.toLowerCase() ? 'bg-yellow-200/60 hover:bg-yellow-300/60' : 'hover:bg-gray-50'}">
                                
                                <td class="px-4 py-3 text-center font-black text-lg {row.sieuThi.toLowerCase() === selectedSupermarket.toLowerCase() ? 'text-red-600' : 'text-gray-700'}">
                                    {row.primaryRank !== 9999 ? row.primaryRank : '-'}
                                </td>
                                
                                <td class="px-4 py-3 font-bold {row.sieuThi.toLowerCase() === selectedSupermarket.toLowerCase() ? 'text-blue-900 text-base' : 'text-gray-800'}">
                                    {row.sieuThi}
                                </td>
                                
                                <td class="px-4 py-3 text-right font-medium text-gray-700">
                                    {numberFormatter.format(row.duKienHoanThanh * 100)}%
                                </td>
                                
                                <td class="px-4 py-3 text-right font-bold text-green-600">
                                    {numberFormatter.format(row.duKienVuot)}
                                </td>
                                
                                <td class="px-4 py-3 text-center font-medium {criteriaName === 'Hạng Vượt Trội' ? 'bg-blue-50/50' : ''}">
                                    {row.hangVuotTroi !== 9999 ? row.hangVuotTroi : '-'}
                                </td>
                                
                                <td class="px-4 py-3 text-center font-medium {criteriaName === 'Hạng Target' ? 'bg-blue-50/50' : ''}">
                                    {row.hangTarget !== 9999 ? row.hangTarget : '-'}
                                </td>
                                
                                <td class="px-4 py-3 text-right font-black text-lg text-yellow-600">
                                    {row.tongThuong > 0 ? currencyFormatter.format(row.tongThuong) : '-'}
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
        
    </div>
</div>
{/if}

<style>
    /* --- GHI ĐÈ CSS ĐỂ CHỤP FULL NỘI DUNG --- */
    :global(.capture-container .max-h-\[90vh\]) {
        max-height: none !important;
        height: auto !important;
    }
    :global(.capture-container .overflow-y-auto),
    :global(.capture-container .overflow-hidden) {
        overflow: visible !important;
    }
    
    :global(.capture-container .w-11\/12) {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
    }

    /* --- SỬA LỖI MẤT THEAD VÀ VỠ BẢNG LỆCH DÒNG --- */
    :global(.capture-container table) {
        width: 100% !important;
        display: table !important;
        table-layout: auto !important;
    }
    :global(.capture-container thead) {
        display: table-header-group !important;
        position: static !important;
        transform: none !important;
    }
    :global(.capture-container tbody) {
        display: table-row-group !important;
    }
    :global(.capture-container tr) {
        display: table-row !important;
    }
    :global(.capture-container th),
    :global(.capture-container td) {
        display: table-cell !important;
        vertical-align: middle !important;
    }

    /* --- SỬA LỖI XÉN ĐÁY CHỮ --- */
    :global(.capture-container .leading-none), 
    :global(.capture-container .leading-tight),
    :global(.capture-container .tracking-tight) {
        line-height: 1.4 !important; 
        padding-bottom: 2px !important;
    }
    :global(.capture-container .truncate) {
        overflow: visible !important; 
        white-space: normal !important; 
        word-break: break-word !important;
    }

    /* ========================================================= */
    /* THỰC SỰ ÉP HẸP BẢNG 768px, RỚT DÒNG TIÊU ĐỀ CỘT NHƯ EXCEL */
    /* ========================================================= */
    
    /* Ép khung ảnh bằng class top20-capture-node đã gắn ở thẻ div */
    :global(.capture-container .top20-capture-node) {
        width: 768px !important;
        min-width: 768px !important;
        max-width: 768px !important;
        margin: 0 auto !important;
    }

    /* Phá thuộc tính flex của thẻ div bên trong tiêu đề để ép chữ được quyền rớt dòng */
    :global(.capture-container .top20-capture-node th > div) {
        display: block !important; 
        white-space: normal !important;
        word-wrap: break-word !important;
        text-align: inherit !important; /* Kế thừa text-center, text-right từ th */
        line-height: 1.3 !important;
    }

    /* Giảm padding 2 bên của các ô xuống mức tối thiểu (4px) để nén các cột lại sát nhau */
    :global(.capture-container .top20-capture-node th),
    :global(.capture-container .top20-capture-node td) {
        padding-left: 4px !important;
        padding-right: 4px !important;
    }
    
    /* Canh chỉnh lại mũi tên (▲/▼) sao cho không rớt dòng bậy bạ */
    :global(.capture-container .top20-capture-node th > div > span) {
        display: inline-block !important;
        margin-left: 2px;
    }
</style>