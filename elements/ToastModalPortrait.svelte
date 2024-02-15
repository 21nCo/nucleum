<script lang="ts">
  import ModalFooter from "../components/modal/ModalFooter.svelte";
  import { toasts } from "../stores/app.store";
  import type { Toast } from "../types/notification.type";
  import ToastNotification from "./ToastNotification.svelte";
  export let id: string;
  let notification: Toast | undefined;
  if (id) notification = $toasts.find((x: Toast) => x.id == id);
</script>

{#if notification}
  <ToastNotification {notification} isShownAsModal={true} />
{/if}
<ModalFooter
  primaryAction={{
    label: "Done",
    callback: async () => {
      notification?.callback?.();
    }
  }}
/>
