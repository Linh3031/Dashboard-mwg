<script>
    import ThiDuaVungTNB from './ThiDuaVungTNB.svelte';
    import ThiDuaVungHCM from './ThiDuaVungHCM.svelte';

    // State chuyển vùng, dùng bind để con có thể gọi thay đổi
    let selectedRegion = 'TNB'; 
</script>

{#if selectedRegion === 'TNB'}
    <ThiDuaVungTNB bind:selectedRegion />
{:else if selectedRegion === 'HCM'}
    <ThiDuaVungHCM bind:selectedRegion />
{/if}