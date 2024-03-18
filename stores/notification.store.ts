import { get, writable } from "svelte/store";
import {
  AlertType,
  type ConfirmationNotification,
  type ScheduledNotification,
  type Toast
} from "../types/notification.type";
import { postMessageToParent } from "../utils/embed.utils";
import { EmbedMessage } from "../types/embedMessage.enum";
import view from "./view.store";
import modalEvent from "../components/modal/modal.store";
import { AppEvent } from "../types/event.enum";
import { generateUID } from "../utils/utils";

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
    console.log("triggering toast", event);
    update((n: Toast[]) => {
      if (n.length > 3) n.shift();
      n.push(event);
      return n;
    });
    if (get(view).isPortrait) {
      modalEvent.notify({
        path: AppEvent.MOBILE_TOAST,
        componentParams: { id: event.id },
        isShow: true,
        isDismissable: true
      });
    } else {
      timer = setTimeout(() => {
        update((n: Toast[]) => {
          n.shift();
          return n;
        });
      }, 5000);
    }
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
    success: (message: string, title: string = "SUCCESS") => {
      const id = generateUID();
      trigger({ title, message, type: AlertType.SUCCESS, id });
      return id;
    },
    error: (message: string, title: string = "ERROR") => {
      const id = generateUID();
      trigger({ title, message, type: AlertType.ERROR, id });
      return id;
    },
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
