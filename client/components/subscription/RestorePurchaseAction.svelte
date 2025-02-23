<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import account from "$lib/client/stores/account.store";
  import { Size } from "$lib/client/types/size.enum";
  import { toasts } from "$lib/client/stores/notification.store";

  async function restore() {
    //TODO - case for Apple, Play store and Microsoft stores
    toasts.showProgress("restorePlan", "Restoring purchase...");
    const response = await account.restorePurchase();
    if (response.status === "multiple_valid_transactions") {
      //TODO - show a notification to the user that they have multiple active plans
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
