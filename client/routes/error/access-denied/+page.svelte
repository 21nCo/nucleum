<script lang="ts">
  import PageError from "$lib/client/components/error/PageError.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import { Action } from "$lib/client/types/action.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";
  function resolveMessage(product: Product) {
    if (product === Product.NUCLEUS) {
      return "You don't have access to Nucleus. Please upgrade to a Nucleus plan to continue.";
    }
    return "You don't have access to this page.";
  }

  function resolveActions(product: Product) {
    if (product === Product.NUCLEUS) {
      return [
        {
          label: "Upgrade now",
          icon: "sparkle",
          variant: ButtonVariant.PRIMARY,
          callback: async () => {
            appStore.runAction(Action.USER_PLAN);
          }
        }
      ];
    }
    return [];
  }
</script>

<PageError message={resolveMessage($appStore.product)} />
