<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import { LinkVariant } from "$lib/client/types/button.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  /**
   * href can be a literal url like "https://blank.com" or an action from actionMap
   */
  export let href: string | undefined = undefined;
  export let label: string;
  export let variant: LinkVariant = LinkVariant.DOTTED;
  function onClick() {
    if (href && href.includes("http")) appStore.openLink(href);
    else if (href) appStore.runAction(href);
    dispatch("click");
  }
</script>

{#if href && !$context.isEmbed && href?.includes("http")}
  <a
    class={cn("relative hover:text-aps1 whitespace-nowrap min-w-fit", {
      "underline-dotted hover:underline-dotted-hover":
        variant === LinkVariant.DOTTED
    })}
    {href}
    target="_blank"
    >{label}
  </a>
{:else}
  <button
    on:click={onClick}
    class={cn("hover:text-aps1 whitespace-nowrap min-w-fit", {
      "underline-dotted hover:underline-dotted-hover":
        variant === LinkVariant.DOTTED
    })}
  >
    {label}
  </button>
{/if}
