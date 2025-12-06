<script>
  // Component hiển thị Header của trang chi tiết
  export let employee;
  export let totalAbove = 0;
  export let totalCriteria = 0;
</script>

<div class="flex items-center gap-6 p-4 bg-purple-50 border border-purple-200 border-t-4 border-t-purple-500 rounded-lg shadow-sm mb-6">
    <div class="w-16 h-16 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 text-purple-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
    </div>
    
    <div class="flex-grow">
        <p class="text-2xl font-extrabold text-purple-800 leading-tight">
            {employee.hoTen} <span class="text-lg font-semibold text-purple-600">- {employee.maNV}</span>
        </p>
        <p class="text-gray-700 font-medium text-base">{employee.boPhan}</p>
        <p class="mt-1 text-sm font-semibold text-gray-800">
            Chỉ số trên TB: <span class="text-green-600 font-bold text-lg">{totalAbove}</span> 
            <span class="text-gray-400 mx-1">/</span> 
            Tổng: <span class="font-bold text-gray-600">{totalCriteria}</span>
        </p>
    </div>
</div>