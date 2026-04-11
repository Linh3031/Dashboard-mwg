// src/components/luyke/address/addressParser.js

// --- [BƯỚC 1]: CHUẨN HÓA TEXT ---
export function normalizeName(name, isProvince = false) {
    if (!name || name === '-') return '-';
    let cleanName = name.trim();

    if (isProvince) {
        // Cạo sạch chữ Tỉnh, Thành phố, TP. ở đầu
        cleanName = cleanName.replace(/^(Tỉnh|Thành phố|Thành Phố|TP\.?)\s+/i, '').trim();
    }

    // Viết hoa chữ cái đầu cho đẹp (an giang -> An Giang)
    cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    return cleanName;
}

// --- [BƯỚC 2]: MÁY HỌC TỪ ĐIỂN (SELF-LEARNING) ---
export function buildDictionary(dataRows) {
    const provinces = new Set();
    
    ['Hồ Chí Minh', 'Hà Nội', 'An Giang', 'Cần Thơ', 'Kiên Giang', 'Đồng Tháp'].forEach(p => provinces.add(p));

    dataRows.forEach(row => {
        if (!row.diaChi || typeof row.diaChi !== 'string') return;
        let addr = row.diaChi.trim();
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

    return {
        provinces: Array.from(provinces).sort((a,b) => b.length - a.length)
    };
}

// --- [BƯỚC 3]: THUẬT TOÁN TÁCH ĐỊA CHỈ THÔNG MINH ---
export function parseAddress(rawDiaChi, dict) {
    if (!rawDiaChi || typeof rawDiaChi !== 'string') return null;
    
    if (rawDiaChi.includes('Hạn thanh toán') || rawDiaChi.startsWith('***') || /^\d+$/.test(rawDiaChi.replace(/\s/g, ''))) return null;

    let addr = rawDiaChi.trim();
    
    addr = addr.replace(/(,\s*)?(Việt Nam|Viet Nam|VN)\.?\s*$/i, '');
    addr = addr.replace(/\b(TP\.?\s*HCM|TPHCM)\b/ig, 'Thành phố Hồ Chí Minh');
    addr = addr.replace(/\b(TP\.?\s*HN|TPHN)\b/ig, 'Thành phố Hà Nội');

    let apDuong = '-', xaPhuong = '-', quanHuyen = '-', tinhThanh = '-';

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

        if (currentClean !== prevClean) {
            uniqueParts.push({ raw: currentRaw, clean: currentClean });
        }
    }
    parts = uniqueParts.map(p => p.raw);

    if (parts.length > 0 && tinhThanh === '-') tinhThanh = parts.pop();
    if (parts.length > 0) quanHuyen = parts.pop();
    if (parts.length > 0) xaPhuong = parts.pop();
    
    if (pivotMatch) {
        if (parts.length > 0) apDuong = parts.join(', ') + (apDuong !== '-' ? ', ' + apDuong : '');
    } else {
        if (parts.length > 0) apDuong = parts.join(', ');
    }

    tinhThanh = normalizeName(tinhThanh, true);
    quanHuyen = normalizeName(quanHuyen, false);
    xaPhuong = normalizeName(xaPhuong, false);

    if (tinhThanh !== '-' || xaPhuong !== '-') {
        return { tinhThanh, quanHuyen, xaPhuong, apDuong };
    }
    return null;
}