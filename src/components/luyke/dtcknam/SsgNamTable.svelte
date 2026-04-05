<svelte:window on:click={() => showCategoryFilter = false} />

<script>
    import { onMount } from 'svelte';
    import { dataProcessing } from '../../../services/dataProcessing.js';
  
    export let data2025 = [];
    export let data2026 = [];
    export let ssgMonths = [];
  
    let sortKey = 'revenue'; 
    let sortDirection = 'desc';
    let expandedRows = new Set();
    let showCategoryFilter = false;
    let selectedCategories = [];
    let allCategories = [];

    let isProcessing = true; 
    let processedData = [];
    let kpiTotals = { dt25: 0, dtqd25: 0, sl25: 0, dt26: 0, dtqd26: 0, sl26: 0, growthQtyPct: 0, growthRevPct: 0 };

    onMount(() => {
        const cSet = new Set();
        [...data2025, ...data2026].forEach(r => {
            const nganh = String(r.nganhHang || r.NGANH_HANG || r['Ngành hàng'] || 'Khác').trim();
            if (nganh) cSet.add(nganh);
        });
        allCategories = Array.from(cSet).sort();

        try {
            const saved = localStorage.getItem('dtck_ssg_cats_v4');
            selectedCategories = saved ? JSON.parse(saved) : [...allCategories];
        } catch(e) { selectedCategories = [...allCategories]; }
    });

    $: { localStorage.setItem('dtck_ssg_cats_v4', JSON.stringify(selectedCategories)); }

    $: triggerDeps = [data2025, data2026, ssgMonths, selectedCategories];

    $: if (triggerDeps) {
        isProcessing = true;
        setTimeout(() => {
            runHeavyCalculation();
            isProcessing = false;
        }, 50);
    }

    const cleanStr = (s) => (s || '').toString().trim();

    const parseSafeDate = (dateVal) => {
        if (!dateVal) return null;
        if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d;
        const str = String(dateVal).trim();
        const parts = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (parts) return new Date(parts[3], parts[2] - 1, parts[1]);
        return null;
    };

    // [PHẪU THUẬT LOGIC 1]: Kỹ thuật Map-Caching
    // Hàm này chỉ chạy đúng 1 lần cho mỗi cục data (2025, 2026) để lấy TÊN CỘT THẬT SỰ
    const buildColumnCache = (sampleRow) => {
        const cache = { hasStatusCols: false, mapping: {} };
        if (!sampleRow) return cache;
        
        const rowKeys = Object.keys(sampleRow);
        const normalize = (k) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]/g, '');
        const normalizedKeys = rowKeys.map(original => ({ original, norm: normalize(original) }));

        // Kiểm tra xem có cột trạng thái không
        cache.hasStatusCols = normalizedKeys.some(k => 
            ['hinhthucxuat', 'trangthaithutien', 'tinhtrangtra', 'trangthaixuat'].includes(k.norm)
        );

        const findRealKey = (possibleKeys) => {
            for (let pk of possibleKeys) {
                const normPk = normalize(pk);
                const found = normalizedKeys.find(k => k.norm === normPk);
                if (found) return found.original;
            }
            return null;
        };

        cache.mapping = {
            htx: findRealKey(['hinhThucXuat', 'Hình thức xuất']),
            thuTien: findRealKey(['trangThaiThuTien', 'Trạng thái thu tiền']),
            huy: findRealKey(['trangThaiHuy', 'Trạng thái hủy']),
            tra: findRealKey(['tinhTrangTra', 'Tình trạng trả']),
            xuat: findRealKey(['trangThaiXuat', 'Trạng thái xuất']),
            ngayTao: findRealKey(['ngayTao', 'Ngày tạo']),
            nganhHang: findRealKey(['nganhHang', 'Ngành hàng']),
            nhomHang: findRealKey(['nhomHang', 'Nhóm hàng']),
            nhaSanXuat: findRealKey(['nhaSanXuat', 'Nhà sản xuất']),
            soLuong: findRealKey(['soLuong', 'Số lượng']),
            thanhTien: findRealKey(['revenue', 'doanhThu', 'thanhTien', 'Thành tiền']),
            revenueQuyDoi: findRealKey(['revenueQuyDoi', 'doanhThuQuyDoi', 'Doanh thu quy đổi'])
        };

        return cache;
    };

    function runHeavyCalculation() {
        const validHTX = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const map = new Map();
        kpiTotals = { dt25: 0, dtqd25: 0, sl25: 0, dt26: 0, dtqd26: 0, sl26: 0 };

        // [PHẪU THUẬT LOGIC 2]: Khởi tạo Cache 1 lần duy nhất thay vì quét cho từng dòng
        const cache25 = buildColumnCache(data2025 && data2025.length > 0 ? data2025[0] : null);
        const cache26 = buildColumnCache(data2026 && data2026.length > 0 ? data2026[0] : null);

        const parseMoney = (val) => {
            if (typeof val === 'number') return val;
            return parseFloat(String(val).replace(/,/g, '')) || 0;
        };

        const processRow = (row, is2025) => {
            const cache = is2025 ? cache25 : cache26;
            const mapping = cache.mapping;

            if (cache.hasStatusCols) {
                const htx = row[mapping.htx] ? String(row[mapping.htx]).trim() : '';
                const thuTien = row[mapping.thuTien] ? String(row[mapping.thuTien]).trim() : '';
                const huy = row[mapping.huy] ? String(row[mapping.huy]).trim() : '';
                const tra = row[mapping.tra] ? String(row[mapping.tra]).trim() : '';
                const xuat = row[mapping.xuat] ? String(row[mapping.xuat]).trim() : '';

                const isValidState = thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả' && xuat === 'Đã xuất';
                const isValidHtx = validHTX.size === 0 || validHTX.has(htx);

                if (!isValidHtx || !isValidState) return;
            }

            const dateRaw = row[mapping.ngayTao] !== undefined ? row[mapping.ngayTao] : '';
            const d = parseSafeDate(dateRaw);
            if (!d) return;
            const monthNum = d.getMonth() + 1;
            if (!ssgMonths.includes(monthNum)) return;

            const nganhHang = row[mapping.nganhHang] !== undefined ? String(row[mapping.nganhHang]).trim() : 'Khác';
            const nhomHang = row[mapping.nhomHang] !== undefined ? String(row[mapping.nhomHang]).trim() : 'Khác';
            const nhaSanXuat = row[mapping.nhaSanXuat] !== undefined ? String(row[mapping.nhaSanXuat]).trim() : 'Khác';

            if (selectedCategories.length > 0 && !selectedCategories.includes(nganhHang || 'Khác')) return;

            const soLuong = parseMoney(row[mapping.soLuong]);
            const thanhTien = parseMoney(row[mapping.thanhTien]);
            
            const rawQd = row[mapping.revenueQuyDoi];
            const revenueQuyDoi = (rawQd !== undefined && rawQd !== '') ? parseMoney(rawQd) : thanhTien;
            
            if (is2025) { 
                kpiTotals.sl25 += soLuong; 
                kpiTotals.dt25 += thanhTien;
                kpiTotals.dtqd25 += revenueQuyDoi; 
            } else { 
                kpiTotals.sl26 += soLuong;
                kpiTotals.dt26 += thanhTien; 
                kpiTotals.dtqd26 += revenueQuyDoi; 
            }
  
            if (!map.has(nganhHang)) map.set(nganhHang, { id: nganhHang, name: nganhHang, level: 0, children: new Map(), sl25: 0, dt25: 0, sl26: 0, dt26: 0 });
            const nganhGroup = map.get(nganhHang);
            nganhGroup[is2025 ? 'sl25' : 'sl26'] += soLuong; nganhGroup[is2025 ? 'dt25' : 'dt26'] += thanhTien;

            const nhomId = nganhHang + '-' + nhomHang;
            if (!nganhGroup.children.has(nhomHang)) nganhGroup.children.set(nhomHang, { id: nhomId, name: nhomHang, level: 1, children: new Map(), sl25: 0, dt25: 0, sl26: 0, dt26: 0 });
            const nhomGroup = nganhGroup.children.get(nhomHang);
            nhomGroup[is2025 ? 'sl25' : 'sl26'] += soLuong; nhomGroup[is2025 ? 'dt25' : 'dt26'] += thanhTien;

            const hangId = nhomId + '-' + nhaSanXuat;
            if (!nhomGroup.children.has(nhaSanXuat)) nhomGroup.children.set(nhaSanXuat, { id: hangId, name: nhaSanXuat, level: 2, isLeaf: true, sl25: 0, dt25: 0, sl26: 0, dt26: 0 });
            const hangGroup = nhomGroup.children.get(nhaSanXuat);
            hangGroup[is2025 ? 'sl25' : 'sl26'] += soLuong; hangGroup[is2025 ? 'dt25' : 'dt26'] += thanhTien;
        };

        (data2025 || []).forEach(r => processRow(r, true));
        (data2026 || []).forEach(r => processRow(r, false));
  
        kpiTotals.growthQtyPct = kpiTotals.sl25 > 0 ? (kpiTotals.sl26 - kpiTotals.sl25) / kpiTotals.sl25 : (kpiTotals.sl26 > 0 ? Infinity : 0);
        kpiTotals.growthRevPct = kpiTotals.dt25 > 0 ? (kpiTotals.dt26 - kpiTotals.dt25) / kpiTotals.dt25 : (kpiTotals.dt26 > 0 ? Infinity : 0);

        const calcGrowth = (item) => {
            item.growthQtyVal = item.sl26 - item.sl25;
            item.growthRevVal = item.dt26 - item.dt25;
            item.growthQty = item.sl25 > 0 ? (item.sl26 - item.sl25) / item.sl25 : (item.sl26 > 0 ? Infinity : 0);
            item.growthRev = item.dt25 > 0 ? (item.dt26 - item.dt25) / item.dt25 : (item.dt26 > 0 ? Infinity : 0);
            item.revenue = item.dt26;
            if (item.children) item.childrenArr = Array.from(item.children.values()).map(c => { calcGrowth(c); return c; });
        };

        processedData = Array.from(map.values()).map(g => { calcGrowth(g); return g; });
    }
  
    $: sortedData = [...processedData].sort((a, b) => {
        let valA = a[sortKey] || 0; let valB = b[sortKey] || 0;
        if (valA === valB) return 0;
        if (sortDirection === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    });

    const sortChildren = (arr) => [...arr].sort((a,b) => {
        let vA=a[sortKey]||0; let vB=b[sortKey]||0; 
        return sortDirection==='asc'? (vA>vB?1:-1) : (vA<vB?1:-1);
    });

    function toggleSort(key) {
        if (sortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        else { sortKey = key; sortDirection = 'desc'; }
    }
  
    function toggleRow(id) {
        if (expandedRows.has(id)) expandedRows.delete(id);
        else expandedRows.add(id);
        expandedRows = expandedRows;
    }

    const fmtQty = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
    const fmtRev = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format((n || 0) / 1000000);
    const fmtPct = (n) => { if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '-';
        return (n > 0 ? '+' : '') + (n * 100).toFixed(1) + '%'; };
    const calcQdRatio = (dtqd, dt) => (!dt || dt <= 0) ? 0 : (dtqd / dt) - 1;
    const fmtPctQD = (n) => (!n || isNaN(n) || !isFinite(n)) ? '0%' : (n * 100).toFixed(1) + '%';
    const fmtGrowthQty = (n) => (n > 0 ? '+' : '') + fmtQty(n);
    const fmtGrowthRev = (n) => (n > 0 ? '+' : '') + fmtRev(n);
    const getGrowthColor = (val) => val > 0 ? 'text-emerald-600 font-bold' : (val < 0 ? 'text-red-500 font-bold' : 'text-gray-500');

</script>
  
<div class="space-y-4">
    {#if isProcessing}
        <div class="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-gray-200">
            <svg class="animate-spin mb-2 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="text-gray-500 text-sm font-medium">Đang xử lý dữ liệu lớn, vui lòng đợi...</span>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-400">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">DT Thực 2025 / % QĐ</p>
                <div class="flex items-end gap-2">
                    <h3 class="text-xl font-black text-gray-800">{fmtRev(kpiTotals.dt25)}</h3>
                    <span class="text-sm font-bold text-blue-600 mb-0.5" title="Tỷ lệ quy đổi: (DTQĐ / DT) - 1">
                        {fmtPctQD(calcQdRatio(kpiTotals.dtqd25, kpiTotals.dt25))}
                    </span>
                </div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p class="text-xs font-bold text-blue-600 uppercase mb-1">DT Thực 2026 / % QĐ</p>
                <div class="flex items-end gap-2">
                    <h3 class="text-xl font-black text-blue-800">{fmtRev(kpiTotals.dt26)}</h3>
                    <span class="text-sm font-bold text-blue-600 mb-0.5" title="Tỷ lệ quy đổi: (DTQĐ / DT) - 1">
                        {fmtPctQD(calcQdRatio(kpiTotals.dtqd26, kpiTotals.dt26))}
                    </span>
                </div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 {kpiTotals.growthQtyPct > 0 ? 'border-emerald-500' : 'border-red-400'}">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">% Tăng trưởng SL</p>
                <h3 class="text-xl font-black {getGrowthColor(kpiTotals.growthQtyPct)}">
                    {fmtPct(kpiTotals.growthQtyPct)} <span class="text-sm font-medium text-gray-500 ml-1">({fmtGrowthQty(kpiTotals.sl26 - kpiTotals.sl25)})</span>
                </h3>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 {kpiTotals.growthRevPct > 0 ? 'border-emerald-500' : 'border-red-400'}">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">% Tăng trưởng Doanh thu</p>
                <h3 class="text-xl font-black {getGrowthColor(kpiTotals.growthRevPct)}">
                    {fmtPct(kpiTotals.growthRevPct)} <span class="text-sm font-medium text-gray-500 ml-1">({fmtGrowthRev(kpiTotals.dt26 - kpiTotals.dt25)})</span>
                </h3>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-sm text-left relative">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="px-3 py-3 border-b border-gray-200 bg-gray-50 min-w-[220px] relative group cursor-pointer" on:click|stopPropagation={() => showCategoryFilter = !showCategoryFilter}>
                                <div class="flex items-center justify-between">
                                    <span>Cơ cấu phân cấp</span>
                                    <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 {selectedCategories.length < allCategories.length ? 'text-blue-500' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                                </div>
                                {#if showCategoryFilter}
                                    <div class="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-md w-64 max-h-64 overflow-y-auto z-50 p-2 normal-case font-normal text-sm cursor-default" on:click|stopPropagation>
                                        <button class="text-blue-600 font-bold mb-2 w-full text-left text-sm hover:bg-blue-50 px-2 py-1.5 rounded transition-colors" on:click={() => selectedCategories = selectedCategories.length === allCategories.length ? [] : [...allCategories]}>
                                            {selectedCategories.length === allCategories.length ? '[ ] Bỏ chọn tất cả' : '[✓] Chọn tất cả'}
                                        </button>
                                        <div class="flex flex-col">
                                            {#each allCategories as opt}
                                                <label class="flex items-center gap-2 p-1.5 hover:bg-gray-50 cursor-pointer rounded">
                                                    <input type="checkbox" value={opt} bind:group={selectedCategories} class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"> <span class="truncate">{opt}</span>
                                                </label>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-gray-100 text-right border-l group cursor-pointer" on:click={() => toggleSort('sl25')}><div class="flex justify-end gap-1">SL 2025 {#if sortKey === 'sl25'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-gray-100 text-right group cursor-pointer" on:click={() => toggleSort('dt25')}><div class="flex justify-end gap-1">DT 2025 {#if sortKey === 'dt25'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-blue-50 text-right border-l text-blue-700 group cursor-pointer" on:click={() => toggleSort('sl26')}><div class="flex justify-end gap-1">SL 2026 {#if sortKey === 'sl26'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-blue-50 text-right text-blue-700 group cursor-pointer" on:click={() => toggleSort('dt26')}><div class="flex justify-end gap-1">DT 2026 {#if sortKey === 'dt26'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-emerald-50 text-right border-l text-emerald-700 group cursor-pointer" on:click={() => toggleSort('growthQtyVal')} title="Giá trị tăng trưởng SL"><div class="flex justify-end gap-1">Tăng SL {#if sortKey === 'growthQtyVal'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-emerald-50 text-right text-emerald-700 group cursor-pointer" on:click={() => toggleSort('growthQty')}><div class="flex justify-end gap-1">% SL {#if sortKey === 'growthQty'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-orange-50 text-right border-l text-orange-700 group cursor-pointer" on:click={() => toggleSort('growthRevVal')} title="Giá trị tăng trưởng DT"><div class="flex justify-end gap-1">Tăng DT {#if sortKey === 'growthRevVal'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                            <th class="px-3 py-3 border-b border-gray-200 bg-orange-50 text-right text-orange-700 group cursor-pointer" on:click={() => toggleSort('growthRev')}><div class="flex justify-end gap-1">% DT {#if sortKey === 'growthRev'}<span class="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>{:else}<span class="text-gray-300 group-hover:text-gray-500">↕</span>{/if}</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if sortedData.length === 0}
                            <tr><td colspan="9" class="text-center py-6 text-gray-500 italic">Không có dữ liệu phù hợp với bộ lọc hiện tại</td></tr>
                        {:else}
                            {#each sortedData as nganh (nganh.id)}
                                <tr class="hover:bg-gray-100 transition-colors border-b border-gray-200 bg-gray-50">
                                    <td class="px-3 py-2 font-black text-gray-800 border-r flex items-center">
                                        {#if nganh.childrenArr && nganh.childrenArr.length > 0}
                                            <button on:click={() => toggleRow(nganh.id)} class="mr-2 p-0.5 rounded text-gray-600 hover:bg-gray-300 transition-transform" style="transform: rotate({expandedRows.has(nganh.id) ? '90deg' : '0deg'})"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg></button>
                                        {:else}<span class="w-6 inline-block"></span>{/if}
                                        {nganh.name}
                                    </td>
                                    <td class="px-3 py-2 text-right text-gray-700 font-bold border-l border-gray-300 bg-gray-200/50">{fmtQty(nganh.sl25)}</td>
                                    <td class="px-3 py-2 text-right text-gray-700 font-bold bg-gray-200/50">{fmtRev(nganh.dt25)}</td>
                                    <td class="px-3 py-2 text-right font-black text-blue-800 border-l border-gray-300 bg-blue-100/40">{fmtQty(nganh.sl26)}</td>
                                    <td class="px-3 py-2 text-right font-black text-blue-800 bg-blue-100/40">{fmtRev(nganh.dt26)}</td>
                                    <td class="px-3 py-2 text-right border-l border-gray-300 font-medium bg-emerald-100/30 {getGrowthColor(nganh.growthQtyVal)}">{fmtGrowthQty(nganh.growthQtyVal)}</td>
                                    <td class="px-3 py-2 text-right font-black bg-emerald-100/30 {getGrowthColor(nganh.growthQty)}">{fmtPct(nganh.growthQty)}</td>
                                    <td class="px-3 py-2 text-right border-l border-gray-300 font-medium bg-orange-100/30 {getGrowthColor(nganh.growthRevVal)}">{fmtGrowthRev(nganh.growthRevVal)}</td>
                                    <td class="px-3 py-2 text-right font-black bg-orange-100/30 {getGrowthColor(nganh.growthRev)}">{fmtPct(nganh.growthRev)}</td>
                                </tr>
                                {#if expandedRows.has(nganh.id) && nganh.childrenArr}
                                    {#each sortChildren(nganh.childrenArr) as nhom (nhom.id)}
                                        <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100 bg-white">
                                            <td class="px-3 py-1.5 pl-8 font-bold text-gray-600 border-r flex items-center">
                                                {#if nhom.childrenArr && nhom.childrenArr.length > 0}
                                                    <button on:click={() => toggleRow(nhom.id)} class="mr-2 p-0.5 rounded text-gray-400 hover:bg-gray-200 transition-transform" style="transform: rotate({expandedRows.has(nhom.id) ? '90deg' : '0deg'})"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg></button>
                                                {:else}<span class="w-6 inline-block"></span>{/if}
                                                {nhom.name}
                                            </td>
                                            <td class="px-3 py-1.5 text-right text-gray-500 font-medium border-l border-gray-100">{fmtQty(nhom.sl25)}</td>
                                            <td class="px-3 py-1.5 text-right text-gray-500 font-medium">{fmtRev(nhom.dt25)}</td>
                                            <td class="px-3 py-1.5 text-right font-bold text-blue-600 border-l border-gray-100">{fmtQty(nhom.sl26)}</td>
                                            <td class="px-3 py-1.5 text-right font-bold text-blue-600">{fmtRev(nhom.dt26)}</td>
                                            <td class="px-3 py-1.5 text-right border-l border-gray-100 text-xs {getGrowthColor(nhom.growthQtyVal)}">{fmtGrowthQty(nhom.growthQtyVal)}</td>
                                            <td class="px-3 py-1.5 text-right font-bold {getGrowthColor(nhom.growthQty)}">{fmtPct(nhom.growthQty)}</td>
                                            <td class="px-3 py-1.5 text-right border-l border-gray-100 text-xs {getGrowthColor(nhom.growthRevVal)}">{fmtGrowthRev(nhom.growthRevVal)}</td>
                                            <td class="px-3 py-1.5 text-right font-bold {getGrowthColor(nhom.growthRev)}">{fmtPct(nhom.growthRev)}</td>
                                        </tr>
                                        {#if expandedRows.has(nhom.id) && nhom.childrenArr}
                                            {#each sortChildren(nhom.childrenArr) as hang (hang.id)}
                                                <tr class="hover:bg-gray-100 transition-colors border-b border-gray-50 bg-gray-50/50">
                                                    <td class="px-3 py-1 pl-16 text-gray-500 border-r text-sm italic"><div class="flex items-center gap-2"><div class="w-1 h-1 rounded-full bg-gray-400"></div>{hang.name}</div></td>
                                                    <td class="px-3 py-1 text-right text-gray-400 border-l border-gray-50 text-xs">{fmtQty(hang.sl25)}</td>
                                                    <td class="px-3 py-1 text-right text-gray-400 text-xs">{fmtRev(hang.dt25)}</td>
                                                    <td class="px-3 py-1 text-right font-medium text-blue-500 border-l border-gray-50 text-xs">{fmtQty(hang.sl26)}</td>
                                                    <td class="px-3 py-1 text-right font-medium text-blue-500 text-xs">{fmtRev(hang.dt26)}</td>
                                                    <td class="px-3 py-1 text-right border-l border-gray-50 text-xs {getGrowthColor(hang.growthQtyVal)}">{fmtGrowthQty(hang.growthQtyVal)}</td>
                                                    <td class="px-3 py-1 text-right text-xs {getGrowthColor(hang.growthQty)}">{fmtPct(hang.growthQty)}</td>
                                                    <td class="px-3 py-1 text-right border-l border-gray-50 text-xs {getGrowthColor(hang.growthRevVal)}">{fmtGrowthRev(hang.growthRevVal)}</td>
                                                    <td class="px-3 py-1 text-right text-xs {getGrowthColor(hang.growthRev)}">{fmtPct(hang.growthRev)}</td>
                                                </tr>
                                            {/each}
                                        {/if}
                                    {/each}
                                {/if}
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>