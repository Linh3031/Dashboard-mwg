import { get } from 'svelte/store';
import { 
    macroCategoryConfig, 
    macroProductGroupConfig 
} from '../../../stores.js';
import { normalize } from './utils.js';
import { parseIdentity } from '../../../utils.js';

export const configLoader = {
    loadUiKeywords() {
        // Lấy config từ Store Svelte
        const $macroProductGroupConfig = get(macroProductGroupConfig) || [];
        const $macroCategoryConfig = get(macroCategoryConfig) || [];

        // Khởi tạo bộ chứa keywords cho các nhóm UI cố định
        const uiKeywords = {
            dtICT: [], dtCE: [], dtPhuKien: [], dtGiaDung: [],
            dtMLN: [], dtSim: [], dtVAS: [], dtBaoHiem: []
        };

        // Mapping định danh: Nhóm UI nào ứng với từ khóa cấu hình nào
        // Ví dụ: Nếu admin đặt tên nhóm là "Nhóm Phụ Kiện Đặc Biệt", nó sẽ match vào 'dtPhuKien'
        const uiIdentity = {
            dtICT: ['ict', 'điện thoại', 'laptop', 'tablet', 'mobile'],
            dtCE: ['ce', 'điện tử', 'tivi', 'loa', 'âm thanh', 'tv'],
            dtPhuKien: ['phụ kiện', 'pk', 'accessories'],
            dtGiaDung: ['gia dụng', 'gd', 'household'],
            dtMLN: ['máy lọc nước', 'mln', 'lọc nước'],
            dtSim: ['sim', 'thẻ cào', 'card'],
            dtVAS: ['vas', 'dịch vụ'],
            dtBaoHiem: ['bảo hiểm', 'rơi vỡ', 'insurance']
        };

        const loadKeywords = (configs) => {
            if (!Array.isArray(configs)) return;
            
            configs.forEach(group => {
                const groupName = normalize(group.name);
                
                // Duyệt qua các nhóm UI định sẵn
                for (const [uiKey, identityTags] of Object.entries(uiIdentity)) {
                    // Nếu tên nhóm trong config (VD: "Phụ kiện 2024") chứa identity (VD: "phụ kiện")
                    if (identityTags.some(tag => groupName.includes(tag))) {
                         
                         // Thì lấy tất cả items bên trong nhóm đó đưa vào keywords của UI Key tương ứng
                         if (group.items && Array.isArray(group.items)) {
                             group.items.forEach(i => {
                                 // 1. Push tên gốc đã chuẩn hóa
                                 uiKeywords[uiKey].push(normalize(i)); 
                                 
                                 // 2. Push ID nếu có (Quan trọng: Xử lý chuỗi "1394 - Cáp sạc")
                                 const parsed = parseIdentity(i);
                                 if (parsed.id && parsed.id !== 'unknown') {
                                     uiKeywords[uiKey].push(normalize(parsed.id));
                                 }
                             });
                         }
                    }
                }
            });
        };

        // Load từ cả 2 nguồn config
        loadKeywords($macroProductGroupConfig);
        loadKeywords($macroCategoryConfig);

        return uiKeywords;
    }
};