import { logger } from "@nucleum/client/runtime/logging/logger";
import { ErrorMessage } from "@nucleum/shared-state/notifications/error.enum";
import { type IClip } from "@nucleum/features/memory/node/node.type";
import { ObservableStore } from "@nucleum/datafn/observable-store";
import { AlertType } from "@nucleum/shared-state/notifications/notification.type";
import { type IFeedbackPaneStore } from "@nucleum/extensions/clipper/contentScripts/types";

class FeedbackPaneStore extends ObservableStore<IFeedbackPaneStore> {
  constructor() {
    super("feedbackPane");
    this.set({
      isShown: false,
      feedback: "",
      focusedClip: null,
      modalClip: null
    });
  }
  reset() {
    this.update(() => {
      return {
        isShown: false,
        feedback: "",
        focusedClip: null,
        modalClip: null
      };
    });
  }
  toggle(params?: { isUserInitiated?: boolean }) {
    this.update((n) => {
      n.isShown = !n.isShown;
      n.isUserInitiated = params?.isUserInitiated ?? false;
      return n;
    });
  }
  focus(
    clip: IClip | null,
    message: string | { message: string; type: AlertType }
  ) {
    logger.log({
      at: "feedbackPane.focus",
      clipId: clip?.id,
      clipType: clip?.contentType
    });
    this.update((n) => {
      n.focusedClip = clip;
      n.feedback = message;
      n.isShown = true;
      return n;
    });
  }
  openInModal(clip: IClip | null) {
    this.update((n) => {
      n.modalClip = clip;
      return n;
    });
  }
  closeModalClip() {
    this.update((n) => {
      n.modalClip = null;
      return n;
    });
  }
  /**
   * Sets saving status with single message and prevents auto close.
   * @param text
   */
  onPageSaveStart(text: string) {
    this.update((n) => {
      n.feedback = {
        message: text,
        type: AlertType.PROGRESS
      };
      n.isShown = true;
      n.isPreventAutoClose = true;
      n.isShowStatusOnly = true;
      return n;
    });
  }

  onPageSaved(message: string, type: AlertType = AlertType.SUCCESS) {
    this.update((n) => {
      n.feedback = {
        message,
        type
      };
      n.isPreventAutoClose = false;
      n.isShowStatusOnly = type !== AlertType.SUCCESS;
      return n;
    });
  }

  setErrorFeedback(params?: {
    message?: string;
    isPreventAutoClose?: boolean;
  }) {
    this.update((n) => {
      n.feedback = {
        message: params?.message ?? ErrorMessage.DEFAULT,
        type: AlertType.ERROR
      };
      if (params?.isPreventAutoClose !== undefined) {
        n.isPreventAutoClose = params.isPreventAutoClose;
      }
      return n;
    });
  }
}

export const feedbackPane = new FeedbackPaneStore();
