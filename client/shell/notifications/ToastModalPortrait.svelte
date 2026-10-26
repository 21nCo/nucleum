<script lang="ts">
  import modalEvent from "@nucleum/shell/overlays/modal.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import ModalFooter from "@nucleum/shell/modal/ModalFooter.svelte";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { Size } from "@21n/ui/elements/size.enum";
  import type { Toast } from "@nucleum/shared-state/notifications/notification.type";
  import ToastNotification from "@nucleum/shell/notifications/ToastNotification.svelte";
    let {
    id,
  }: {
    id: string;
  } = $props();

  let notification: Toast | undefined;
  if (id) notification = $toasts.find((x: Toast) => x.id == id);
</script>

{#if notification}
  <ToastNotification {notification} isShownAsModal={true} />
{/if}
<ModalFooter
  action={Action.MOBILE_TOAST}
  size={Size.sm}
  primaryAction={{
    label: "Done",
    callback: async () => {
      notification?.callback?.();
      modalEvent.hide(Action.MOBILE_TOAST);
    }
  }}
/>
