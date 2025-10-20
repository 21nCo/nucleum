<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { TimerDisplayState } from '../types';

  let timerState: TimerDisplayState = {
    active: false,
    issueId: null,
    startTime: null,
    elapsed: 0,
  };

  let currentIssueId: string | null = null;
  let intervalId: number | null = null;

  onMount(async () => {
    detectCurrentIssue();
    await loadTimerState();
    startElapsedTimer();

    window.addEventListener('popstate', detectCurrentIssue);
    window.addEventListener('pushstate', detectCurrentIssue);
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  async function loadTimerState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' });
      if (response.state && response.state.active) {
        timerState = {
          active: true,
          issueId: response.state.issueId,
          startTime: response.state.entry.startTime,
          elapsed: Date.now() - new Date(response.state.entry.startTime).getTime(),
        };
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  }

  function detectCurrentIssue() {
    const match = window.location.pathname.match(/\/issue\/([A-Z]+-\d+)/);
    currentIssueId = match ? match[1] : null;
  }

  function startElapsedTimer() {
    intervalId = window.setInterval(() => {
      if (timerState.active && timerState.startTime) {
        timerState = {
          ...timerState,
          elapsed: Date.now() - new Date(timerState.startTime).getTime()
        };
      }
    }, 1000);
  }

  async function handleStartTimer() {
    if (!currentIssueId) {
      alert('No issue detected on this page');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_TIMER',
        issueId: currentIssueId,
      });

      if (response.success) {
        timerState = {
          active: true,
          issueId: currentIssueId,
          startTime: response.entry.startTime,
          elapsed: 0,
        };
      } else {
        alert('Failed to start timer');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    }
  }

  async function handleStopTimer() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'STOP_TIMER' });

      if (response.success) {
        timerState = {
          active: false,
          issueId: null,
          startTime: null,
          elapsed: 0,
        };
      } else {
        alert('Failed to stop timer');
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer');
    }
  }

  function formatElapsed(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const m = minutes % 60;
    const s = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    return `${m}:${String(s).padStart(2, '0')}`;
  }
</script>

<div class="timear-widget">
  {#if currentIssueId}
    <div class="timear-container">
      {#if timerState.active}
        {#if timerState.issueId === currentIssueId}
          <div class="timear-active">
            <span class="timear-icon">⏱️</span>
            <span class="timear-time">{formatElapsed(timerState.elapsed)}</span>
            <button class="timear-button timear-stop" on:click={handleStopTimer}>
              Stop
            </button>
          </div>
        {:else}
          <div class="timear-different">
            <span class="timear-icon">⏱️</span>
            <span class="timear-text">Timer active on {timerState.issueId}</span>
            <button class="timear-button" on:click={handleStartTimer}>
              Switch
            </button>
          </div>
        {/if}
      {:else}
        <button class="timear-button timear-start" on:click={handleStartTimer}>
          <span class="timear-icon">▶️</span>
          Start Timer
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .timear-widget {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 10000;
  }

  .timear-container {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .timear-active,
  .timear-different {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .timear-icon {
    font-size: 16px;
  }

  .timear-time {
    font-family: monospace;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .timear-text {
    font-size: 12px;
    color: #6b7280;
  }

  .timear-button {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timear-start {
    background: #4f46e5;
    color: white;
  }

  .timear-start:hover {
    background: #4338ca;
  }

  .timear-stop {
    background: #ef4444;
    color: white;
  }

  .timear-stop:hover {
    background: #dc2626;
  }

  .timear-button:not(.timear-start):not(.timear-stop) {
    background: #f3f4f6;
    color: #374151;
  }

  .timear-button:not(.timear-start):not(.timear-stop):hover {
    background: #e5e7eb;
  }
</style>
