<script>
    /* global XLSX */
    import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
    import { helpers } from '../../services/processing/helpers.js';

    const dispatch = createEventDispatcher();

    export let isImporting = false;

    const EMAIL_ALIASES = ['email', 'username', 'tai khoan', 'tài khoản', 'mail'];
    const WAREHOUSE_ALIASES = ['ma kho', 'mã kho', 'danh sach ma kho', 'danh sách mã kho', 'kho'];
    const DURATION_ALIASES = ['thoi gian su dung', 'thời gian sử dụng', 'han su dung', 'hạn sử dụng', 'thoi han', 'thời hạn'];

    const TIER_MAP = {
        '3 ngay': '3_days',
        '1 thang': '1_month',
        '3 thang': '3_months',
        '6 thang': '6_months',
        '12 thang': '12_months',
        'vinh vien': 'lifetime'
    };

    let fileInputEl;
    let fileName = '';
    let parseError = '';
    let parsedRows = []; // { email, allowedWarehouses, tier, tierRaw, status: 'ok'|'error', reason }

    $: validRows = parsedRows.filter(r => r.status === 'ok');

    const DIACRITICS_REGEX = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

    function normalizeVi(str) {
        if (!str) return '';
        return str.toString()
            .toLowerCase()
            .normalize('NFD').replace(DIACRITICS_REGEX, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function handleFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        fileName = file.name;
        parseError = '';
        parsedRows = [];

        try {
            const workbook = await readWorkbook(file);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });

            if (rawData.length === 0) {
                parseError = 'File không có dữ liệu.';
                return;
            }

            const headerKeys = Object.keys(rawData[0]);
            const emailCol = helpers.findColumnName(headerKeys, EMAIL_ALIASES);
            const warehouseCol = helpers.findColumnName(headerKeys, WAREHOUSE_ALIASES);
            const durationCol = helpers.findColumnName(headerKeys, DURATION_ALIASES);

            const missing = [];
            if (!emailCol) missing.push('Email');
            if (!warehouseCol) missing.push('Mã kho');
            if (!durationCol) missing.push('Thời gian sử dụng');
            if (missing.length > 0) {
                parseError = `Không tìm thấy cột: ${missing.join(', ')}. Kiểm tra lại tiêu đề cột trong file.`;
                return;
            }

            parsedRows = rawData.map(row => processRow(row, emailCol, warehouseCol, durationCol));
        } catch (error) {
            parseError = 'Không đọc được file: ' + error.message;
        } finally {
            if (fileInputEl) fileInputEl.value = '';
        }
    }

    function readWorkbook(file) {
        // File .csv: đọc bằng readAsText để trình duyệt tự giải mã đúng UTF-8 (tránh XLSX đoán
        // sai bảng mã, vốn hay biến "Mã kho" thành "MÃ£ kho" với file CSV không có BOM).
        const isCsv = /\.csv$/i.test(file.name);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    if (isCsv) {
                        resolve(XLSX.read(event.target.result, { type: 'string' }));
                    } else {
                        const data = new Uint8Array(event.target.result);
                        resolve(XLSX.read(data, { type: 'array', cellDates: true, cellText: true }));
                    }
                } catch (err) { reject(err); }
            };
            reader.onerror = () => reject(new Error('Không thể đọc file.'));
            if (isCsv) reader.readAsText(file, 'utf-8');
            else reader.readAsArrayBuffer(file);
        });
    }

    function processRow(row, emailCol, warehouseCol, durationCol) {
        const email = String(row[emailCol] || '').trim().toLowerCase();
        const warehouseRaw = String(row[warehouseCol] || '');
        // Cho tách theo cả dấu "," lẫn dấu "." vì Excel/Sheets hay tự đổi "155,7708" (2 mã kho)
        // thành số thập phân "155.7708" khi người nhập gõ dấu phẩy vào 1 ô số.
        const allowedWarehouses = warehouseRaw.split(/[,.]/).map(w => w.trim()).filter(w => w);
        const durationRaw = String(row[durationCol] || '');
        const tier = TIER_MAP[normalizeVi(durationRaw)];

        if (!email) return { email, allowedWarehouses, tier: null, tierRaw: durationRaw, status: 'error', reason: 'Thiếu email' };
        if (!isValidEmail(email)) return { email, allowedWarehouses, tier: null, tierRaw: durationRaw, status: 'error', reason: 'Email không hợp lệ' };
        if (allowedWarehouses.length === 0) return { email, allowedWarehouses, tier: null, tierRaw: durationRaw, status: 'error', reason: 'Thiếu mã kho' };
        if (!tier) return { email, allowedWarehouses, tier: null, tierRaw: durationRaw, status: 'error', reason: `Không nhận dạng được thời gian sử dụng: "${durationRaw}"` };

        return { email, allowedWarehouses, tier, tierRaw: durationRaw, status: 'ok', reason: '' };
    }

    function handleConfirm() {
        if (validRows.length === 0) return;
        dispatch('import', validRows.map(r => ({ email: r.email, allowedWarehouses: r.allowedWarehouses, tier: r.tier, role: 'user' })));
    }

    function handleCancel() {
        dispatch('cancel');
    }

    onMount(() => { if (typeof feather !== 'undefined') feather.replace(); });
    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="p-6 bg-slate-50 border-b border-slate-200 animate-slide-down">
    <div class="max-w-4xl mx-auto">
        <h4 class="text-sm font-bold text-slate-700 mb-1 border-b border-slate-200 pb-2 flex items-center gap-2">
            <i data-feather="upload" class="w-4 h-4 text-emerald-500"></i> NHẬP TÀI KHOẢN TỪ EXCEL
        </h4>
        <p class="text-xs text-slate-500 mb-4">
            File cần có 3 cột: <strong>Email</strong>, <strong>Mã kho</strong> (nhiều kho cách nhau dấu phẩy), <strong>Thời gian sử dụng</strong>
            (3 ngày / 1 tháng / 3 tháng / 6 tháng / 12 tháng / vĩnh viễn). Email mới sẽ được tạo tài khoản với mật khẩu mặc định
            <strong>123456</strong>; email đã tồn tại sẽ được cập nhật lại mã kho và hạn dùng, không đổi mật khẩu cũ.
        </p>

        <div class="flex items-center gap-3 mb-4">
            <label for="admin-user-excel-input" class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-2">
                <i data-feather="file-plus" class="w-4 h-4"></i>
                Chọn file Excel
            </label>
            <input
                bind:this={fileInputEl}
                id="admin-user-excel-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                class="hidden"
                on:change={handleFileChange}
                disabled={isImporting}
            >
            {#if fileName}<span class="text-xs text-slate-500">{fileName}</span>{/if}
        </div>

        {#if parseError}
            <div class="mb-4 p-3 rounded-lg text-sm font-semibold border bg-red-50 text-red-700 border-red-200">
                {parseError}
            </div>
        {/if}

        {#if parsedRows.length > 0}
            <div class="mb-4 max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                <table class="w-full text-xs">
                    <thead class="bg-slate-100 sticky top-0">
                        <tr>
                            <th class="p-2 text-left font-bold text-slate-600">Email</th>
                            <th class="p-2 text-left font-bold text-slate-600">Mã kho</th>
                            <th class="p-2 text-left font-bold text-slate-600">Thời gian</th>
                            <th class="p-2 text-left font-bold text-slate-600">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each parsedRows as row}
                            <tr class="border-t border-slate-100">
                                <td class="p-2 truncate max-w-[180px]">{row.email || '(trống)'}</td>
                                <td class="p-2 truncate max-w-[160px]">{row.allowedWarehouses.join(', ') || '-'}</td>
                                <td class="p-2">{row.tierRaw}</td>
                                <td class="p-2">
                                    {#if row.status === 'ok'}
                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">OK</span>
                                    {:else}
                                        <span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Lỗi: {row.reason}</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <p class="text-xs text-slate-500 mb-4">
                {validRows.length}/{parsedRows.length} dòng hợp lệ sẽ được xử lý. Dòng lỗi sẽ bị bỏ qua.
            </p>
        {/if}

        <div class="flex justify-end gap-3">
            <button on:click={handleCancel} disabled={isImporting} class="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-300 transition-colors disabled:opacity-50">
                Đóng
            </button>
            <button
                on:click={handleConfirm}
                disabled={isImporting || validRows.length === 0}
                class="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
                {#if isImporting}
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Đang xử lý...</span>
                {:else}
                    <i data-feather="check-circle" class="w-4 h-4"></i>
                    <span>Xác nhận {validRows.length > 0 ? `${validRows.length} tài khoản` : ''}</span>
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: top; }
    @keyframes slideDown { from { opacity: 0; transform: scaleY(0.9); } to { opacity: 1; transform: scaleY(1); } }
</style>
