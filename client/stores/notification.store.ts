import { get, writable } from "svelte/store";
import {
  AlertType,
  type ConfirmationNotification,
  type ScheduledNotification,
  type Toast
} from "../types/notification.type";
import { postMessageToParent } from "$lib/client/utils/embed.utils";
import { EmbedMessage } from "../types/embedMessage.enum";
import { GlobalEvent } from "../types/event.enum";
import type { IEvent } from "../types/event.type";
import type { Event } from "../types/event.enum";
import { ObservableStore } from "./client.store";
import { logger } from "../components/debug/logger.client";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import { ErrorMessage } from "../components/error/error.type";

export const toastDefaultDuration = 3500;
class AppEventStore extends ObservableStore<IEvent> {
  constructor() {
    super("appEvents");
    this.reset();
  }
  reset() {
    this.set({ event: GlobalEvent.NONE, value: false });
  }
  publish(m: Event, value: any = undefined) {
    this.update((n: IEvent) => {
      return { event: m, value };
    });
    this.reset();
  }
}

export const appEvents = new AppEventStore();

export const scheduledNotifications = initScheduledNotificationStore();

function initScheduledNotificationStore() {
  const { subscribe, set, update } = writable<ScheduledNotification[]>([]);
  return {
    subscribe,
    set: (m: ScheduledNotification[]) => {
      set(m);
    },
    reset: () => {
      update(() => {
        return [];
      });
      postMessageToParent(EmbedMessage.CLEAR_NOTIFICATIONS);
    },
    notify: (event: ScheduledNotification[]) => {
      update((n: ScheduledNotification[]) => {
        return event;
      });
    },
    push: (event: ScheduledNotification) => {
      update((n: ScheduledNotification[]) => {
        n.push(event);
        return n;
      });
    }
  };
}

export const toasts = initToastStore();

function initToastStore() {
  let timer: any;
  const { subscribe, set, update } = writable<Toast[]>([]);

  /**
   * Triggers a toast notification
   * @param event Toast event with message and type
   */
  const trigger = (event: Toast) => {
    logger.log({ at: "toast", event });
    let isAlreadyPresent = false;
    update((n: Toast[]) => {
      isAlreadyPresent = n.some((x) => x.id === event.id);
      if (isAlreadyPresent) return n;
      if (n.length > 3) n.shift();
      n.push(event);
      return n;
    });
    if (isAlreadyPresent || event.type === AlertType.PROGRESS) return;
    // if (get(view).isPortrait) {
    //   appStore.runAction(Action.MOBILE_TOAST, {
    //     componentParams: { id: event.id }
    //   });
    // } else {
    timer = setTimeout(() => {
      update((n: Toast[]) => {
        n.shift();
        return n;
      });
    }, toastDefaultDuration);
    // }
  };
  const setProgress = (progress: number) => {
    update((n: Toast[]) => {
      const toast = n.find((x) => x.type === AlertType.PROGRESS);
      if (toast) {
        toast.progress = progress;
      }
      return n;
    });
  };

  const closeProgress = (id: string) => {
    update((n: Toast[]) => {
      return n.filter((x) => x.id !== id);
    });
  };

  return {
    subscribe,
    set: (m: Toast[]) => {
      set(m);
    },
    reset: () => {
      clearTimeout(timer);
      update(() => {
        return [];
      });
    },
    success: (
      message: string,
      params?: {
        title?: string;
        closeProgressId?: string;
      }
    ) => {
      if (params?.closeProgressId) {
        closeProgress(params.closeProgressId);
      }
      const id = generateSimpleRandomId();
      trigger({
        title: params?.title,
        message,
        type: AlertType.SUCCESS,
        id
      });
      return id;
    },
    error: (
      message?: string | ErrorMessage,
      params?: {
        title?: string;
        closeProgressId?: string;
      }
    ) => {
      if (params?.closeProgressId) {
        closeProgress(params.closeProgressId);
      }
      if (!message) {
        message = ErrorMessage.DEFAULT;
      }
      const id = generateSimpleRandomId();
      trigger({ title: params?.title, message, type: AlertType.ERROR, id });
      return id;
    },
    showProgress: (id: string, message: string) => {
      trigger({ message, type: AlertType.PROGRESS, id });
      return id;
    },
    closeProgress,
    setProgress,
    trigger: trigger
  };
}

export const confirmationNotification = initConfirmationStore();

function initConfirmationStore() {
  const { subscribe, set, update } = writable<
    ConfirmationNotification | undefined
  >(undefined);
  return {
    subscribe,
    set: (m: any) => {
      set(m);
    },
    reset: () => {
      setTimeout(() => {
        update(() => {
          return undefined;
        });
      }, 100);
    },
    notify: (event: ConfirmationNotification) => {
      update(() => {
        return { ...event };
      });
    }
  };
}
export const fullPageLoadingScreen = initFullPageLoadingScreen();

function initFullPageLoadingScreen() {
  const { subscribe, set, update } = writable<{
    isShow: boolean;
    text: string;
  }>({ isShow: false, text: "loading..." });
  return {
    subscribe,
    set: (m: any) => {
      set(m);
    },
    reset: () => {
      update(() => {
        return { isShow: false, text: "loading..." };
      });
    },
    show: (text: string) => {
      update(() => {
        return { isShow: true, text };
      });
    },
    hide: () => {
      update(() => {
        return { isShow: false, text: "loading..." };
      });
    }
  };
}
