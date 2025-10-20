<script lang="ts">
  import modalEvent from "@21n/components/modal/modal.store";
  import { Action } from "@21n/types/action.enum";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { Size } from "@21n/types/size.enum";
  import type { Toast } from "@21n/types/notification.type";
  import ToastNotification from "@21n/elements/feedback/ToastNotification.svelte";
  export let id: string;
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
