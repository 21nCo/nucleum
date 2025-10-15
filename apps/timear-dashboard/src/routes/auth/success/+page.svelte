<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    setTimeout(() => {
      goto('/dashboard');
    }, 1000);
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center">
    <h1 class="text-2xl font-bold text-gray-900">Authentication Successful!</h1>
    <p class="mt-2 text-gray-600">Redirecting to dashboard...</p>
  </div>
</div>
