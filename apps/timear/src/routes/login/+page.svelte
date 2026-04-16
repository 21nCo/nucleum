<script lang="ts">
  import { API_BASE_URL } from '$lib/api';
  
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/oauth/linear`;
  };
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
    <div>
      <h1 class="text-3xl font-bold text-center text-gray-900">Timear</h1>
      <p class="mt-2 text-center text-sm text-gray-600">
        Time tracking for Linear
      </p>
    </div>
    
    <div class="mt-8">
      <button
        onclick={handleLogin}
        class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Sign in with Linear
      </button>
    </div>

    <div class="mt-6">
      <p class="text-xs text-center text-gray-500">
        Timear integrates with your Linear workspace to track time spent on issues.
      </p>
    </div>
  </div>
</div>
