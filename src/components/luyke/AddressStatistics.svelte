<script>
    import { config } from '../../config.js';
    import { buildDictionary, parseAddress, extractAddressString } from './address/addressParser.js';
    
    export let ycxData = []; 

    let rawAggregated = [];
    let displayData = [];

    let fTinhThanh = '';
    let fXaPhuong = '';
    let fApDuong = '';

    let sortCol = 'doanhThu';
    let sortDir = 'desc';

    $: processData(ycxData);
    $: applyFilterAndSort(rawAggregated, fTinhThanh, fXaPhuong, fApDuong, sortCol, sortDir);

    function processData(data) {
        if (!data || data.length === 0) return;

        // --- 🚨 [DIAGNOSTIC LOG] MÁY QUÉT DỮ LIỆU ĐỘ SÂU MAX 🚨 ---
        console.group("%c🔍 BÁO CÁO QUÉT DỮ LIỆU EXCEL TỪ COMPONENT (6 DÒNG ĐẦU)", "color: white; background: red; font-size: 14px; padding: 4px; font-weight: bold;");
        data.slice(0, 6).forEach((row, i) => {
            console.log(`%c--- DÒNG THỨ ${i + 1} ---`, "color: #ffeb3b; font-weight: bold; background: #333; padding: 2px 8px; border-radius: 4px;");
            
            const keys = Object.keys(row);
            console.log("1. TẤT CẢ CÁC CỘT ĐỌC ĐƯỢC (Keys):", keys);
            
            // Lọc các cột có khả năng là địa chỉ (chấp nhận cả tiếng Việt có dấu, không dấu, viết hoa, viết thường)
            const suspectKeys = keys.filter(k => {
                const lowerK = String(k).toLowerCase();
                return lowerK.includes('địa') || lowerK.includes('dia') || 
                       lowerK.includes('khách') || lowerK.includes('khach') || 
                       lowerK.includes('add');
            });
            console.log("2. CÁC CỘT NGHI NGỜ LÀ ĐỊA CHỈ KHÁCH HÀNG:", suspectKeys);
            
            suspectKeys.forEach(sk => {
                console.log(`   -> Nội dung đang chứa trong cột [${sk}]:`, row[sk]);
            });

            console.log("3. HÌNH THỨC XUẤT ĐỌC ĐƯỢC:", row.hinhThucXuat || row['Hình thức xuất']);
            console.log("4. TRẠNG THÁI XUẤT ĐỌC ĐƯỢC:", row.trangThaiXuat || row['Trạng thái xuất']);
            
            try {
                const extracted = extractAddressString(row);
                console.log("5. KẾT QUẢ CỦA HÀM TRÍCH XUẤT (extractAddressString):", extracted || "THẤT BẠI - TRẢ VỀ RỖNG");
            } catch (e) {
                console.error("5. LỖI KHI CHẠY HÀM TRÍCH XUẤT:", e);
            }
            console.log("6. TOÀN BỘ OBJECT ROW (RAW):", row);
        });
        console.groupEnd();
        // -------------------------------------------------------------
        
        const validHtx = new Set(config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU || []);
        const groups = {};
        
        const dictionary = buildDictionary(data);

        let emptyGroup = {
            tinhThanh: 'Trống địa chỉ',
            xaPhuong: '-',
            apDuong: '-',
            soLuong: 0,
            doanhThu: 0,
            isEmptyGroup: true
        };

        data.forEach(row => {
            const htx = row.hinhThucXuat || row['Hình thức xuất'];
            const ttx = String(row.trangThaiXuat || row['Trạng thái xuất'] || '').trim();
            const isDaXuat = !ttx || ttx === 'Đã xuất' || ttx === 'Đã giao';

            if (validHtx.has(htx) && isDaXuat) {
                let apDuong = String(row.apDuong || '').trim();
                let xaPhuong = String(row.xaPhuong || '').trim();
                let tinhThanh = String(row.tinhThanh || '').trim();
                
                let diaChiRaw = '';
                try {
                    diaChiRaw = extractAddressString(row);
                } catch(e) {}

                if (!tinhThanh && diaChiRaw) {
                    const parsed = parseAddress(diaChiRaw, dictionary);
                    if (parsed) {
                        tinhThanh = parsed.tinhThanh !== '-' ? parsed.tinhThanh : '';
                        xaPhuong = parsed.xaPhuong !== '-' ? parsed.xaPhuong : '';
                        apDuong = parsed.apDuong !== '-' ? parsed.apDuong : '';
                    }
                }
                
                const sl = (parseInt(String(row.soLuong || row['Số lượng'] || "0"), 10) || 0);
                const dt = (row.revenue !== undefined ? row.revenue : (parseFloat(String(row.thanhTien || row['Giá bán'] || "0").replace(/,/g, '')) || 0));

                if (tinhThanh && xaPhuong && apDuong) {
                    const key = `${tinhThanh}|${xaPhuong}|${apDuong}`;
                    
                    if (!groups[key]) {
                        groups[key] = {
                            tinhThanh, xaPhuong, apDuong,
                            soLuong: 0, doanhThu: 0, isEmptyGroup: false
                        };
                    }

                    groups[key].soLuong += sl;
                    groups[key].doanhThu += dt;
                } else {
                    emptyGroup.soLuong += sl;
                    emptyGroup.doanhThu += dt;
                }
            }
        });

        rawAggregated = Object.values(groups);
        
        if (emptyGroup.soLuong > 0 || emptyGroup.doanhThu > 0) {
            rawAggregated.push(emptyGroup);
        }
    }

    function applyFilterAndSort(baseData, ft, fx, fa, scol, sdir) {
        let filtered = baseData.filter(d => {
            return d.tinhThanh.toLowerCase().includes(ft.toLowerCase()) &&
                   d.xaPhuong.toLowerCase().includes(fx.toLowerCase()) &&
                   d.apDuong.toLowerCase().includes(fa.toLowerCase());
        });

        filtered.sort((a, b) => {
            if (a.isEmptyGroup && ['tinhThanh', 'xaPhuong', 'apDuong'].includes(scol)) return 1;
            if (b.isEmptyGroup && ['tinhThanh', 'xaPhuong', 'apDuong'].includes(scol)) return -1;

            let valA = a[scol];
            let valB = b[scol];
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sdir === 'asc' ? -1 : 1;
            if (valA > valB) return sdir === 'asc' ? 1 : -1;
            return 0;
        });

        displayData = filtered;
    }

    function handleSort(col) {
        if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = 'desc'; }
    }

    function formatSL(num) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    }

    function formatDT(num) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(num / 1000000));
    }
</script>

<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mt-4">
    <div class="overflow-x-auto" style="max-height: 600px;">
        <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th class="p-3 border-b cursor-pointer hover:bg-gray-100 transition align-top min-w-[160px]" on:click={() => handleSort('tinhThanh')}>
                        <div class="flex justify-between items-center mb-2">
                            <span>Tỉnh / Thành phố</span>
                            {#if sortCol === 'tinhThanh'} <span class="text-blue-600 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span> {/if}
                        </div>
                        <input type="text" class="w-full text-xs font-normal p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Lọc cấp 1..." bind:value={fTinhThanh} on:click|stopPropagation>
                    </th>
                    <th class="p-3 border-b border-l cursor-pointer hover:bg-gray-100 transition align-top min-w-[180px]" on:click={() => handleSort('xaPhuong')}>
                        <div class="flex justify-between items-center mb-2">
                            <span>Phường / Xã</span>
                            {#if sortCol === 'xaPhuong'} <span class="text-blue-600 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span> {/if}
                        </div>
                        <input type="text" class="w-full text-xs font-normal p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Lọc cấp 2..." bind:value={fXaPhuong} on:click|stopPropagation>
                    </th>
                    <th class="p-3 border-b border-l cursor-pointer hover:bg-gray-100 transition align-top min-w-[200px]" on:click={() => handleSort('apDuong')}>
                        <div class="flex justify-between items-center mb-2">
                            <span>Ấp / Khóm / Đường</span>
                            {#if sortCol === 'apDuong'} <span class="text-blue-600 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span> {/if}
                        </div>
                        <input type="text" class="w-full text-xs font-normal p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Lọc cấp 3..." bind:value={fApDuong} on:click|stopPropagation>
                    </th>
                    <th class="p-3 border-b border-l cursor-pointer hover:bg-gray-100 transition align-top w-28 text-right" on:click={() => handleSort('soLuong')}>
                        <div class="flex justify-end items-center mb-2">
                            {#if sortCol === 'soLuong'} <span class="text-blue-600 font-bold mr-1">{sortDir === 'asc' ? '↑' : '↓'}</span> {/if}
                            <span>Số Lượng</span>
                        </div>
                    </th>
                    <th class="p-3 border-b border-l cursor-pointer hover:bg-gray-100 transition align-top w-36 text-right" on:click={() => handleSort('doanhThu')}>
                        <div class="flex justify-end items-center mb-2">
                            {#if sortCol === 'doanhThu'} <span class="text-blue-600 font-bold mr-1">{sortDir === 'asc' ? '↑' : '↓'}</span> {/if}
                            <span title="Doanh thu hiển thị theo đơn vị Triệu VNĐ">Doanh Thu (Tr)</span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#if displayData.length === 0}
                    <tr><td colspan="5" class="p-4 text-center text-gray-500 italic">Không có dữ liệu thỏa điều kiện.</td></tr>
                {/if}
                {#each displayData as row}
                    <tr class="bg-white border-b hover:bg-blue-50 transition {row.isEmptyGroup ? 'bg-red-50/40 text-red-800' : 'text-gray-700'}">
                        <td class="p-3 font-semibold {row.isEmptyGroup ? 'text-red-600 italic' : ''}">{row.tinhThanh}</td>
                        <td class="p-3 border-l">{row.xaPhuong}</td>
                        <td class="p-3 border-l">{row.apDuong}</td>
                        <td class="p-3 text-right font-bold border-l bg-gray-50/50">{formatSL(row.soLuong)}</td>
                        <td class="p-3 text-right font-bold border-l {row.isEmptyGroup ? 'bg-red-50 text-red-700' : 'bg-green-50/40 text-green-700'}">{formatDT(row.doanhThu)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>