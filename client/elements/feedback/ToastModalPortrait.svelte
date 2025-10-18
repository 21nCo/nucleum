<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  import ModalFooter from "../../components/modal/ModalFooter.svelte";
  import { toasts } from "../../stores/notification.store";
  import { Size } from "../../types/size.enum";
  import type { Toast } from "../../types/notification.type";
  import ToastNotification from "./ToastNotification.svelte";
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
