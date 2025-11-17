// Version 1.1 - Add XLSX declaration
// File này dùng để khai báo các thư viện toàn cục (từ CDN)
// cho trình biên dịch TypeScript/JavaScript của VSCode.

// Định nghĩa sự tồn tại của 'feather' trên 'window'
interface Window {
  feather: {
    replace: (options?: object) => void;
  };
}

// Định nghĩa sự tồn tại của 'feather' như một biến toàn cục
// (Dùng 'any' để đơn giản hóa, vì chúng ta chỉ dùng .replace())
declare var feather: any;

// <-- THÊM MỚI (V1.1) -->
// Định nghĩa sự tồn tại của 'XLSX' (thư viện SheetJS)
declare var XLSX: any;