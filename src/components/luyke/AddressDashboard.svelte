<script>
    import { config } from '../../config.js';
    import { buildAddressTree } from './address/addressLogic.js';
    import AddressTreeItem from './address/AddressTreeItem.svelte';
    import AddressProductDetail from './address/AddressProductDetail.svelte';

    export let ycxData = [];

    let rootTree = null;
    let selectedNode = null;

    // Khi ycxData thay đổi, build lại cây địa chỉ
    $: {
        if (ycxData && ycxData.length > 0) {
            rootTree = buildAddressTree(ycxData, config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU);
            // Mặc định chọn Root
            if (!selectedNode || selectedNode.id === 'root') {
                selectedNode = rootTree;
            }
        }
    }

    function handleSelectNode(node) {
        selectedNode = node;
    }
</script>

<div class="mt-4 flex flex-col md:flex-row gap-4" style="height: 650px;">
    
    <div class="w-full md:w-1/3 h-full flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div class="p-3 bg-gray-50 border-b border-gray-200 shadow-sm z-10">
            <h3 class="font-bold text-gray-700">Cấu trúc Khu vực</h3>
        </div>
        <div class="flex-1 overflow-y-auto pb-4">
            {#if rootTree}
                <AddressTreeItem 
                    node={rootTree} 
                    selectedId={selectedNode?.id} 
                    onSelect={handleSelectNode} 
                />
            {:else}
                <div class="p-4 text-gray-500 italic">Đang xử lý dữ liệu...</div>
            {/if}
        </div>
    </div>

    <div class="w-full md:w-2/3 h-full">
        <AddressProductDetail {selectedNode} />
    </div>
    
</div>