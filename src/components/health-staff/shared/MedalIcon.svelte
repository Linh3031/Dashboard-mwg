<script>
  export let rank = 0; // 0: Base (Index + 1)

  // Logic màu sắc cho Top 3
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;
  const isStandard = rank > 3;
</script>

<div class="relative w-12 h-12 flex-shrink-0 -ml-2 -mt-2">
  {#if isGold}
    <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm absolute top-0 left-0 z-10">
        <defs><linearGradient id="gold-grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFDF00"/><stop offset="100%" stop-color="#FFB800"/></linearGradient></defs>
        <path d="M 20 75 L 35 95 L 35 75 L 50 90 L 65 75 L 65 95 L 80 75 L 50 85 Z" fill="#E53935"/>
        <circle cx="50" cy="45" r="38" fill="#BDBDBD"/><circle cx="50" cy="45" r="35" fill="url(#gold-grad)"/>
        <circle cx="50" cy="45" r="28" fill="#FFC107" stroke="#FFFFFF" stroke-width="2"/>
    </svg>
  {:else if isSilver}
    <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm absolute top-0 left-0 z-10">
        <defs><linearGradient id="silver-grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#F5F5F5"/><stop offset="100%" stop-color="#B0BEC5"/></linearGradient></defs>
        <path d="M 20 75 L 35 95 L 35 75 L 50 90 L 65 75 L 65 95 L 80 75 L 50 85 Z" fill="#E53935"/>
        <circle cx="50" cy="45" r="38" fill="#78909C"/><circle cx="50" cy="45" r="35" fill="url(#silver-grad)"/>
        <circle cx="50" cy="45" r="28" fill="#B0BEC5" stroke="#FFFFFF" stroke-width="2"/>
    </svg>
  {:else if isBronze}
    <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm absolute top-0 left-0 z-10">
        <defs><linearGradient id="bronze-grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFCC80"/><stop offset="100%" stop-color="#D84315"/></linearGradient></defs>
        <path d="M 20 75 L 35 95 L 35 75 L 50 90 L 65 75 L 65 95 L 80 75 L 50 85 Z" fill="#E53935"/>
        <circle cx="50" cy="45" r="38" fill="#A1887F"/><circle cx="50" cy="45" r="35" fill="url(#bronze-grad)"/>
        <circle cx="50" cy="45" r="28" fill="#D84315" stroke="#FFFFFF" stroke-width="2"/>
    </svg>
  {:else}
    <div class="sknv-card__avatar--standard">
        <span class="sknv-card__avatar-rank">{rank}</span>
    </div>
  {/if}
  
  {#if !isStandard}
      <div class="absolute top-0 left-0 w-full h-[90%] flex items-center justify-center z-20">
        <span class="sknv-card__avatar-rank text-white text-lg font-bold">{rank}</span>
      </div>
  {/if}
</div>