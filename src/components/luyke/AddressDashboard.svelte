<script>
    import { config } from '../../config.js';
    import { buildAddressTree } from './address/addressLogic.js';
    import AddressTreeItem from './address/AddressTreeItem.svelte';
    import AddressProductDetail from './address/AddressProductDetail.svelte';

    export let ycxData = [];
    export let pendingMappings = {}; 

    let rootTree = null;
    let selectedNode = null;
    let cleanLocations = []; 

    // KHỐI 1: CHỈ CHẠY KHI DATA HOẶC MAPPING ĐỔI
    $: {
        if (ycxData && ycxData.length > 0) {
            rootTree = buildAddressTree(ycxData, config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU, pendingMappings);
            
            const locations = [];
            if (rootTree && rootTree.children) {
                Object.values(rootTree.children).forEach(tinhNode => {
                    if (tinhNode.id !== 'empty' && tinhNode.children) {
                        Object.values(tinhNode.children).forEach(xaNode => {
                            if (!xaNode.name.includes('[Chưa rõ')) {
                                locations.push({
                                    value: `${tinhNode.id}|${xaNode.name}`,
                                    label: `${tinhNode.name} - ${xaNode.name}`
                                });
                            }
                        });
                    }
                });
            }
            cleanLocations = locations.sort((a, b) => a.label.localeCompare(b.label));

            // [BẮT CẦU UX]: Xử lý hiện tượng Node bốc hơi
            if (selectedNode) {
                let found = findNodeById(rootTree, selectedNode.id);
                
                // Nếu Node cũ không tồn tại nữa và nó vừa được khai báo gộp -> Lái UI sang Node Đích
                if (!found && pendingMappings[selectedNode.name]) {
                    const targetId = pendingMappings[selectedNode.name];
                    found = findNodeById(rootTree, targetId);
                }
                selectedNode = found || rootTree;
            } else {
                selectedNode = rootTree;
            }
        }
    }

    function findNodeById(node, id) {
        if (!node) return null;
        if (node.id === id) return node;
        if (node.children) {
            for (let key in node.children) {
                let found = findNodeById(node.children[key], id);
                if (found) return found;
            }
        }
        return null;
    }

    // KHỐI 2: CHỈ SET BIẾN, KHÔNG RE-RENDER CÂY
    function handleSelectNode(node) {
        selectedNode = node;
    }

    function handleMappingChange(rawName, mappedValue) {
        if (!mappedValue) {
            delete pendingMappings[rawName];
        } else {
            pendingMappings[rawName] = mappedValue;
        }
        pendingMappings = { ...pendingMappings };
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
        <!-- Chú ý: Component AddressProductDetail dùng bản local của bạn (có chứa nút Dropdown) -->
        <AddressProductDetail 
            {selectedNode} 
            {cleanLocations}
            {pendingMappings}
            onMappingChange={handleMappingChange}
        />
    </div>
    
</div>