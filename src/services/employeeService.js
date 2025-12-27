import { get } from 'svelte/store';
import { currentCluster } from '../stores.js';

// ==========================================
// CONFIGURATION
// ==========================================
const API_BASE_URL = 'http://localhost:3000/api'; 
const NETWORK_DELAY = 500; // Giả lập độ trễ mạng (ms)

// ==========================================
// HELPER FUNCTIONS (Hàm hỗ trợ)
// ==========================================

// Hàm check an toàn: Luôn đảm bảo đã chọn Cluster trước khi gọi API
const getClusterIdOrThrow = () => {
    const cluster = get(currentCluster);
    if (!cluster || !cluster.id) {
        throw new Error("MISSING_CLUSTER_ID: Vui lòng chọn Cluster trước.");
    }
    return cluster.id;
};

// Hàm xử lý lỗi chung cho toàn bộ service
const handleApiError = (error, context) => {
    console.error(`[EmployeeService] Error in ${context}:`, error);
    // Có thể thêm logic gửi log lên server hoặc hiển thị Toast thông báo lỗi ở đây
    throw error;
};

// ==========================================
// MAIN SERVICE FUNCTIONS (CRUD)
// ==========================================

/**
 * 1. GET ALL: Lấy danh sách nhân viên theo Cluster hiện tại
 */
export const fetchEmployees = async () => {
    try {
        const clusterId = getClusterIdOrThrow();
        console.log(`[GET] Fetching employees for Cluster ${clusterId}...`);

        // --- REAL API CODE (Uncomment khi có Server) ---
        // const res = await fetch(`${API_BASE_URL}/clusters/${clusterId}/employees`);
        // if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        // return await res.json();

        // --- MOCK DATA (Dữ liệu giả) ---
        await new Promise(r => setTimeout(r, NETWORK_DELAY));
        return [
            { id: 1, code: 'NV001', name: 'Nguyễn Văn A', position: 'Frontend Dev', clusterId },
            { id: 2, code: 'NV002', name: 'Trần Thị B', position: 'Backend Dev', clusterId },
            { id: 3, code: 'NV003', name: 'Lê Văn C', position: 'Tester', clusterId },
            { id: 4, code: 'NV004', name: 'Phạm Thị D', position: 'Product Owner', clusterId },
            { id: 5, code: 'NV005', name: 'Hoàng Văn E', position: 'Designer', clusterId },
        ];
    } catch (error) {
        handleApiError(error, 'fetchEmployees');
        return []; // Trả về mảng rỗng để UI không bị crash
    }
};

/**
 * 2. GET DETAILS: Lấy chi tiết 1 nhân viên
 */
export const getEmployeeById = async (employeeId) => {
    try {
        const clusterId = getClusterIdOrThrow();
        console.log(`[GET] Fetching details for employee ${employeeId}...`);

        // Call API...
        await new Promise(r => setTimeout(r, NETWORK_DELAY));
        return { 
            id: employeeId, 
            name: 'Nguyễn Văn A', 
            email: 'a.nguyen@example.com', 
            phone: '0909123456',
            clusterId 
        };
    } catch (error) {
        handleApiError(error, 'getEmployeeById');
    }
};

/**
 * 3. CREATE: Thêm nhân viên mới vào Cluster hiện tại
 */
export const createEmployee = async (payload) => {
    try {
        const clusterId = getClusterIdOrThrow();
        const dataToSend = { ...payload, clusterId }; // Gắn ID cluster vào data

        console.log(`[POST] Creating employee in Cluster ${clusterId}:`, dataToSend);

        // Call API...
        // const res = await fetch(`${API_BASE_URL}/employees`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(dataToSend)
        // });
        
        await new Promise(r => setTimeout(r, NETWORK_DELAY));
        return { success: true, newId: Math.floor(Math.random() * 1000) };
    } catch (error) {
        handleApiError(error, 'createEmployee');
    }
};

/**
 * 4. UPDATE: Cập nhật thông tin nhân viên
 */
export const updateEmployee = async (id, payload) => {
    try {
        getClusterIdOrThrow(); // Vẫn check cluster cho chắc chắn
        console.log(`[PUT] Updating employee ${id}:`, payload);

        // Call API...
        await new Promise(r => setTimeout(r, NETWORK_DELAY));
        return { success: true };
    } catch (error) {
        handleApiError(error, 'updateEmployee');
    }
};

/**
 * 5. DELETE: Xóa nhân viên
 */
export const deleteEmployee = async (id) => {
    try {
        getClusterIdOrThrow();
        console.log(`[DELETE] Removing employee ${id}...`);

        // Call API...
        await new Promise(r => setTimeout(r, NETWORK_DELAY));
        return { success: true };
    } catch (error) {
        handleApiError(error, 'deleteEmployee');
    }
};