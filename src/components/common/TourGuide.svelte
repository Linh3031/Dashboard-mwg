<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    const dispatch = createEventDispatcher();

    export let isActive = false;
    export let steps = [];

    let currentStep = 0;
    let targetRect = null;
    let tooltipPosition = {};

    function endTour() {
        isActive = false;
        targetRect = null;
        dispatch('close');
    }

    async function nextStep() {
        if (currentStep < steps.length - 1) {
            currentStep++;
            await executeStep();
        } else {
            endTour();
        }
    }

    async function prevStep() {
        if (currentStep > 0) {
            currentStep--;
            await executeStep();
        }
    }

    export async function startTour() {
        if (!steps || steps.length === 0) return;
        currentStep = 0;
        isActive = true;
        await executeStep();
    }

    async function executeStep() {
        const step = steps[currentStep];

        // Mở các <details> nếu bị đóng
        if (step.openDetails) {
            const detailsEl = document.querySelector(`details[data-tour="${step.openDetails}"]`);
            if (detailsEl && !detailsEl.open) {
                detailsEl.open = true;
                await new Promise(r => setTimeout(r, 350));
            }
        }

        const target = document.querySelector(`[data-tour="${step.id}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 400));
            updatePosition();
        } else {
            targetRect = null;
            tooltipPosition = getDefaultPosition();
        }
    }

    function updatePosition() {
        if (!isActive) return;
        const step = steps[currentStep];

        if (step.id === 'general-overview') {
            targetRect = null;
            tooltipPosition = getDefaultPosition();
            return;
        }

        const target = document.querySelector(`[data-tour="${step.id}"]`);
        if (target) {
            const rect = target.getBoundingClientRect();
            targetRect = {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
            };
            calculateTooltipPosition(rect);
        }
    }

    function getDefaultPosition() {
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    // AI Tính toán vị trí chống tràn (Không dùng max-height bóp nghẹt nữa)
    function calculateTooltipPosition(rect) {
        const tooltipWidth = 340;
        const estimatedTooltipHeight = 200; // Ước lượng chiều cao chuẩn
        const padding = 16;
        
        let pos = {};
        
        // 1. Tính toán tọa độ Ngang (X)
        let leftPos = rect.left;
        if (leftPos + tooltipWidth > window.innerWidth - padding) {
            leftPos = window.innerWidth - tooltipWidth - padding;
        }
        if (leftPos < padding) leftPos = padding;
        pos.left = `${leftPos}px`;

        // 2. Tính toán tọa độ Dọc (Y)
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Ưu tiên đặt dưới. Nếu dưới không đủ chỗ VÀ trên rộng hơn, thì đặt trên.
        if (spaceBelow >= estimatedTooltipHeight + padding || spaceBelow >= spaceAbove) {
            // Đặt phía DƯỚI
            let topPos = rect.bottom + padding;
            // Nếu vẫn bị tràn mép dưới màn hình, đẩy nó lùi lên xíu (tránh mất nút bấm)
            if (topPos + estimatedTooltipHeight > window.innerHeight) {
                 topPos = window.innerHeight - estimatedTooltipHeight - padding;
            }
            pos.top = `${topPos}px`;
        } else {
            // Đặt phía TRÊN
            let topPos = rect.top - estimatedTooltipHeight - padding;
            if (topPos < padding) topPos = padding; // Cấn viền trên thì ép xuống
            pos.top = `${topPos}px`;
        }
        
        tooltipPosition = pos;
    }

    onMount(() => {
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
    });

    onDestroy(() => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    });

    // Theo dõi thay đổi trạng thái mở tour từ bên ngoài
    $: if (isActive && currentStep === 0 && !targetRect) {
         startTour();
    }
</script>

{#if isActive}
    {#if targetRect}
        <div class="fixed z-[9998] pointer-events-none transition-all duration-300 ease-in-out border-2 border-blue-400 rounded-lg" 
             style="top: {targetRect.top - 6}px; left: {targetRect.left - 6}px; width: {targetRect.width + 12}px; height: {targetRect.height + 12}px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.65);">
        </div>
    {:else}
        <div class="fixed inset-0 z-[9998] bg-black/65 pointer-events-none transition-opacity"></div>
    {/if}

    <div class="fixed z-[9999] bg-white rounded-xl shadow-2xl p-5 w-[340px] transition-all duration-300 ring-1 ring-black/5 flex flex-col"
         style="top: {tooltipPosition.top}; left: {tooltipPosition.left}; transform: {tooltipPosition.transform || 'none'};">
        <h4 class="font-bold text-blue-800 text-base mb-2 flex items-center gap-2">
            <i data-feather="info" class="w-5 h-5 text-blue-600"></i>
            {steps[currentStep].title}
        </h4>
        
        <p class="text-sm text-gray-600 mb-5 leading-relaxed">{steps[currentStep].content}</p>
        
        <div class="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
            <span class="text-[11px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded-full">{currentStep + 1} / {steps.length}</span>
            <div class="flex gap-2">
                <button on:click={endTour} class="px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors">Bỏ qua</button>
                {#if currentStep > 0}
                    <button on:click={prevStep} class="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">Quay lại</button>
                {/if}
                <button on:click={nextStep} class="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors">
                    {currentStep === steps.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}
                </button>
            </div>
        </div>
    </div>
{/if}