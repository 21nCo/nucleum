<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import { LinkVariant } from "$lib/client/types/button.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { isValidEmail } from "$lib/shared/utils/text.utils";
  import { isUrlMatchPattern } from "$lib/shared/utils/utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  /**
   * href can be a literal url like "https://blank.com" or an action from actionMap
   */
  export let href: string | undefined = undefined;
  export let label: string;
  export let variant: LinkVariant = LinkVariant.DOTTED;
  /**
   * If the text is a valid external url without http included, then http will be prepended and navigation will be followed
   */
  export let isEnforeHttpIfMatchPattern = false;
  function onClick() {
    if (!href) return;
    if (href.includes("http")) appStore.openLink(href);
    else if (isEnforeHttpIfMatchPattern && isUrlMatchPattern(href))
      appStore.openLink(`https://${href}`);
    else if (isValidEmail(href)) appStore.openLink(`mailto:${href}`);
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
    rel="noopener noreferrer"
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
