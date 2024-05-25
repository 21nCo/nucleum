<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { AppEvent } from "$lib/client/types/event.enum";
  import ModalFooter from "../../components/modal/ModalFooter.svelte";
  import { toasts } from "../../stores/notification.store";
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
  isPreventAutoClose={true}
  primaryAction={{
    label: "Done",
    callback: async () => {
      notification?.callback?.();
      modalEvent.hideSpecific(AppEvent.MOBILE_TOAST);
    }
  }}
/>
