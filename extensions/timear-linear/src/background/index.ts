import type { TimeEntry, TimerState } from '../types';

const BACKEND_URL = 'http://localhost:3000';

let timerState: TimerState = {
  active: false,
  entry: null,
  issueId: null,
};

/**
 * Initialize timer state on startup
 */
async function initializeTimerState() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/timer/active`, {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.timer) {
        timerState = {
          active: true,
          entry: data.timer,
          issueId: data.timer.issueId,
        };
      }
    }
  } catch (error) {
    console.error('Error initializing timer state:', error);
  }
}

/**
 * Start timer for an issue
 */
async function startTimer(issueId: string, description?: string): Promise<TimeEntry | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/timer/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ issueId, description }),
    });

    if (response.ok) {
      const data = await response.json();
      timerState = {
        active: true,
        entry: data.entry,
        issueId,
      };
      return data.entry;
    }
  } catch (error) {
    console.error('Error starting timer:', error);
  }

  return null;
}

/**
 * Stop active timer
 */
async function stopTimer(): Promise<TimeEntry | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/timer/stop`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      timerState = {
        active: false,
        entry: null,
        issueId: null,
      };
      return data.entry;
    }
  } catch (error) {
    console.error('Error stopping timer:', error);
  }

  return null;
}

/**
 * Get current timer state
 */
function getTimerState(): TimerState {
  return timerState;
}

/**
 * Message handler from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_TIMER_STATE':
      sendResponse({ state: getTimerState() });
      break;

    case 'START_TIMER':
      startTimer(message.issueId, message.description).then((entry) => {
        sendResponse({ success: !!entry, entry });
      });
      return true; // Keep channel open for async response

    case 'STOP_TIMER':
      stopTimer().then((entry) => {
        sendResponse({ success: !!entry, entry });
      });
      return true;

    default:
      console.warn('Unknown message type:', message.type);
  }
});

/**
 * Periodic timer state refresh
 */
setInterval(() => {
  if (timerState.active) {
    initializeTimerState();
  }
}, 60000); // Refresh every minute

initializeTimerState();
