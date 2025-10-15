<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let isLoading = true;
  let isAuthenticated = false;

  onMount(async () => {
    try {
      const response = await fetch('http://localhost:3000/oauth/session', {
        credentials: 'include',
      });

      const data = await response.json();
      isAuthenticated = data.authenticated;

      if (!isAuthenticated) {
        goto('/login');
      } else {
        goto('/dashboard');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      goto('/login');
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <h2 class="text-xl font-semibold">Loading...</h2>
    </div>
  </div>
{/if}
