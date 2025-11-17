<script>
  let count = 0
</script>

<main class="flex flex-col items-center justify-center min-h-screen bg-gray-100">

  <h1 class="text-4xl font-bold text-red-600 p-4 bg-blue-100 rounded-lg shadow-md">
    Hello Svelte + Tailwind!
  </h1>

  <div class="mt-8 p-4 border rounded-lg">
    <button 
      class="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700"
      on:click={() => count++}
    >
      Đã bấm {count} lần
    </button>
  </div>

</main>