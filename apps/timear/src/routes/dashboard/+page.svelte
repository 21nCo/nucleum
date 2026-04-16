<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiRequest } from '$lib/api';

  interface User {
    id: string;
    name: string;
    email: string;
  }

  interface TimeEntry {
    id: string;
    issueId: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
    description?: string;
  }

  let user: User | null = null;
  let workspaceId: string = '';
  let timeEntries: TimeEntry[] = [];
  let activeTimer: TimeEntry | null = null;
  let isLoading = true;

  onMount(async () => {
    await checkAuth();
    await loadData();
  });

  async function checkAuth() {
    try {
      const response = await apiRequest('/oauth/session');

      const data = await response.json();

      if (!data.authenticated) {
        goto('/login');
        return;
      }

      user = data.user;
      workspaceId = data.workspaceId;
    } catch (error) {
      console.error('Error checking auth:', error);
      goto('/login');
    }
  }

  async function loadData() {
    try {
      await Promise.all([
        loadTimeEntries(),
        loadActiveTimer(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadTimeEntries() {
    const response = await apiRequest('/api/time-entries');

    const data = await response.json();
    timeEntries = data.entries || [];
  }

  async function loadActiveTimer() {
    const response = await apiRequest('/api/timer/active');

    const data = await response.json();
    activeTimer = data.timer;
  }

  async function logout() {
    await apiRequest('/oauth/logout', {
      method: 'POST',
    });

    goto('/login');
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '0m';

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }
</script>

<div class="min-h-screen bg-gray-50">
  <nav class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold">Timear</h1>
        </div>
        <div class="flex items-center space-x-4">
          {#if user}
            <span class="text-sm text-gray-700">{user.name}</span>
            <button
              onclick={logout}
              class="text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    {#if isLoading}
      <div class="text-center py-12">
        <p class="text-gray-500">Loading...</p>
      </div>
    {:else}
      <div class="px-4 py-6 sm:px-0">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p class="mt-1 text-sm text-gray-500">Track your time on Linear issues</p>
        </div>

        {#if activeTimer}
          <div class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-green-900">Active Timer</h3>
            <p class="text-sm text-green-700">Issue: {activeTimer.issueId}</p>
            <p class="text-xs text-green-600 mt-1">
              Started: {new Date(activeTimer.startTime).toLocaleString()}
            </p>
          </div>
        {/if}

        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Recent Time Entries
            </h3>
          </div>
          <div class="border-t border-gray-200">
            {#if timeEntries.length === 0}
              <div class="px-4 py-5 sm:p-6 text-center text-gray-500">
                No time entries yet. Use the browser extension to start tracking time.
              </div>
            {:else}
              <ul class="divide-y divide-gray-200">
                {#each timeEntries as entry}
                  <li class="px-4 py-4 sm:px-6">
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">
                          Issue: {entry.issueId}
                        </p>
                        {#if entry.description}
                          <p class="text-sm text-gray-500">{entry.description}</p>
                        {/if}
                        <p class="text-xs text-gray-400 mt-1">
                          {new Date(entry.startTime).toLocaleString()}
                          {#if entry.endTime}
                            - {new Date(entry.endTime).toLocaleString()}
                          {/if}
                        </p>
                      </div>
                      <div class="ml-4">
                        <span class="text-sm font-semibold text-gray-900">
                          {formatDuration(entry.duration)}
                        </span>
                      </div>
                    </div>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>

        <div class="mt-6 text-center text-sm text-gray-500">
          <p>Install the browser extension to track time directly from Linear</p>
        </div>
      </div>
    {/if}
  </main>
</div>
