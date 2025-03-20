<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import account from "$lib/client/stores/account.store";
  import { Size } from "$lib/client/types/size.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";

  async function restore() {
    if ($context.isEmbed && $context.os === OperatingSystem.IOS) {
      postMessageToParent(EmbedMessage.RESTORE_PURCHASE);
      return;
    }
    toasts.showProgress("restorePlan", "Restoring purchase...");
    const response = await account.restorePurchase();
    if (response.status === "multiple_valid_transactions") {
      toasts.error("Please contact us via Discord or email.", {
        title: "Multiple valid plans found."
      });
    } else if (response.status === "no_valid_transaction") {
      toasts.error("No valid plan found");
    } else if (response.status === "success") {
      toasts.success("Purchase restored");
    }
    toasts.closeProgress("restorePlan");
  }
</script>

<div class="flex justify-center gap-2">
  <Button
    label="Restore purchase"
    isUnderlined={true}
    style={ButtonStyle.PLAIN}
    size={Size.sm}
    on:click={restore}
  />
</div>
