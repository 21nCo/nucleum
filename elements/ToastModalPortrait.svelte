<script lang="ts">
  import ModalLayout from "../components/modal/ModalLayout.svelte";
  import { toasts } from "../stores/app.store";
  import type { Toast } from "../types/notification.type";
  import type { ModalParams } from "../types/popup.type";
  import { Size } from "../types/size.enum";
  import ToastNotification from "./ToastNotification.svelte";
  export let params: ModalParams;
  let notification: Toast | undefined;
  if (params.id) notification = $toasts.find((x: Toast) => x.id == params.id);
</script>

<ModalLayout
  bind:params
  layoutParams={{
    size: Size.xs,
    primaryAction: {
      label: "Done",
      callback: () => {
        notification?.callback?.();
      },
    },
  }}
>
  {#if notification}
    <ToastNotification {notification} isShownAsModal={true} />
  {/if}
</ModalLayout>
