// src/components/luyke/address/addressParser.js

// --- [BƯỚC 1]: CHUẨN HÓA TEXT ---
export function normalizeName(name, isProvince = false) {
    if (!name || name === '-') return '-';
    let cleanName = name.trim();

    if (isProvince) {
        cleanName = cleanName.replace(/^(Tỉnh|Thành phố|Thành Phố|TP\.?)\s+/i, '').trim();
    } else {
        // [PHẪU THUẬT]: Ép kiểu các biến thể cấp Phường/Xã/Thị trấn để chống phân mảnh
        cleanName = cleanName.replace(/^[\s\.\-,_]*(P\.|P |Phường\s+)/i, 'Phường ');
        cleanName = cleanName.replace(/^[\s\.\-,_]*(X\.|X |Xã\s+)/i, 'Xã ');
        cleanName = cleanName.replace(/^[\s\.\-,_]*(TT\.|TT |Thị trấn\s+)/i, 'Thị trấn ');
    }

    cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    return cleanName;
}

// --- [BƯỚC 1.5]: HÀM TRÍCH XUẤT ĐỊA CHỈ SIÊU HẠNG ---
export function extractAddressString(row) {
    if (!row) return '';
    let candidates = [];
    Object.keys(row).forEach(k => {
        if (!k) return;
        const clean = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/\s/g, "");
        if (clean.includes('diachi') || clean.includes('address') || clean.includes('diachikhachhang')) {
            candidates.push(String(row[k] || '').trim());
        }
    });

    Object.values(row).forEach(v => {
        const val = String(v || '').trim();
        if (val.length > 15 && val.includes(',') && (val.includes('Tỉnh') || val.includes('Xã') || val.includes('Phường') || val.includes('Thành phố') || val.includes('TP'))) {
            candidates.push(val);
        }
    });

    candidates = candidates.filter(c => c.length > 5);
    if (candidates.length === 0) return '';
    candidates.sort((a, b) => b.length - a.length);
    return candidates[0];
}

// --- [BƯỚC 2]: MINI AI - MÁY HỌC TỪ ĐIỂN ---
export function buildDictionary(dataRows) {
    const provinces = new Set();
    ['Hồ Chí Minh', 'Hà Nội', 'An Giang', 'Cần Thơ', 'Kiên Giang', 'Đồng Tháp'].forEach(p => provinces.add(p));

    dataRows.forEach(row => {
        let diaChiRaw = extractAddressString(row);
        if (!diaChiRaw || typeof diaChiRaw !== 'string') return;
        let addr = diaChiRaw.trim();
        if (addr.includes('Hạn thanh toán') || addr.startsWith('***')) return;
        
        addr = addr.replace(/(,\s*)?(Việt Nam|Viet Nam|VN)\.?\s*$/i, '');
        if (addr.includes(',')) {
            let parts = addr.split(',').map(s => s.trim()).filter(s => s);
            if (parts.length >= 3) {
                let p = normalizeName(parts[parts.length - 1], true);
                if (p.length > 3) provinces.add(p);
            }
        }
    });

    return { provinces: Array.from(provinces).sort((a,b) => b.length - a.length) };
}

// --- [BƯỚC 3]: THUẬT TOÁN TÁCH ĐỊA CHỈ THÔNG MINH ---
export function parseAddress(rawDiaChi, dict) {
    if (!rawDiaChi || typeof rawDiaChi !== 'string') return null;
    if (rawDiaChi.includes('Hạn thanh toán') || rawDiaChi.startsWith('***') || /^\d+$/.test(rawDiaChi.replace(/\s/g, ''))) return null;

    let addr = rawDiaChi.trim();
    addr = addr.replace(/(,\s*)?(Việt Nam|Viet Nam|VN)\.?\s*$/i, '');
    addr = addr.replace(/\b(TP\.?\s*HCM|TPHCM)\b/ig, 'Thành phố Hồ Chí Minh');
    addr = addr.replace(/\b(TP\.?\s*HN|TPHN)\b/ig, 'Thành phố Hà Nội');

    let apDuong = '-', xaPhuong = '-', tinhThanh = '-';

    if (!addr.includes(',')) {
        for (let p of dict.provinces) {
            if (addr.toLowerCase().endsWith(p.toLowerCase())) {
                tinhThanh = p;
                addr = addr.substring(0, addr.length - p.length).trim();
                break;
            }
        }
        addr = addr.replace(/\s+(Tỉnh|Thành phố|TP\.?|Huyện|Quận|Thị xã|Xã|Phường|Thị trấn)\s+/gi, ', $1 ');
    }

    let parts = [];
    const pivotMatch = addr.match(/(Phường|Xã|Thị trấn)\s+/i);
    
    if (pivotMatch) {
        const pivotIndex = pivotMatch.index;
        const leftPart = addr.substring(0, pivotIndex).replace(/,\s*$/, '').trim();
        if (leftPart) apDuong = leftPart;
        const rightPart = addr.substring(pivotIndex);
        parts = rightPart.split(',').map(s => s.trim()).filter(s => s);
    } else {
        parts = addr.split(',').map(s => s.trim()).filter(s => s);
    }

    let uniqueParts = [];
    for (let i = 0; i < parts.length; i++) {
        let currentRaw = parts[i];
        let currentClean = currentRaw.replace(/^(Tỉnh|Thành phố|TP\.?|Quận|Huyện|Phường|Xã)\s+/i, '').toLowerCase();
        let prevClean = uniqueParts.length > 0 ? uniqueParts[uniqueParts.length - 1].clean : null;
        if (currentClean !== prevClean) uniqueParts.push({ raw: currentRaw, clean: currentClean });
    }
    parts = uniqueParts.map(p => p.raw);

    if (parts.length > 0 && tinhThanh === '-') tinhThanh = parts.pop();
    
    let leftoverParts = [];
    while (parts.length > 0) {
        let p = parts.pop();
        let lowerP = p.toLowerCase();
        const isPhuong = /^[\s\.\-,_]*(phường|xã|thị trấn|p\.|x\.)\s+/i.test(lowerP);

        if (isPhuong && xaPhuong === '-') xaPhuong = p;
        else leftoverParts.unshift(p);
    }

    if (pivotMatch) {
        let extraApDuong = leftoverParts.join(', ');
        if (extraApDuong) apDuong = extraApDuong + (apDuong !== '-' ? ', ' + apDuong : '');
    } else {
        if (leftoverParts.length > 0) apDuong = leftoverParts.join(', ');
    }

    tinhThanh = normalizeName(tinhThanh, true);
    xaPhuong = normalizeName(xaPhuong, false);

    if (apDuong && apDuong !== '-') apDuong = apDuong.replace(/^[\s,]+|[\s,]+$/g, '').trim();
    if (!apDuong) apDuong = '-';

    if (tinhThanh !== '-' || xaPhuong !== '-') return { tinhThanh, xaPhuong, apDuong };
    return null;
}