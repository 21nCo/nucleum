<script lang="ts">
  import { elementPlatform as context } from "@21n/ui/environment/element-environment.store";
  import { getElementActionHost } from "@21n/ui/hosts/action-host";
  import { LinkVariant } from "@21n/ui/elements/button/button.type";
  import { cn } from "@21n/ui/environment/presentation";
  import { isValidEmail } from "@21n/shared-utils/text.utils";
  import { isUrlMatchPattern } from "@21n/shared-utils/url.utils";

  let {
    href = undefined,
    label,
    variant = LinkVariant.DOTTED,
    isEnforeHttpIfMatchPattern = false,
    onclick = undefined
  }: {
    href?: string | undefined;
    label: string;
    variant?: LinkVariant;
    isEnforeHttpIfMatchPattern?: boolean;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();

  function handleClick(event: MouseEvent) {
    if (!href) return;
    const host = getElementActionHost();
    const url = href.includes("http")
      ? href
      : isEnforeHttpIfMatchPattern && isUrlMatchPattern(href)
        ? `https://${href}`
        : undefined;
    if (url) {
      if (host) host.openLink(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    } else if (isValidEmail(href)) host?.navigate?.(`mailto:${href}`);
    else host?.runAction(href);
    onclick?.(event);
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
    onclick={handleClick}
    class={cn("hover:text-aps1 whitespace-nowrap min-w-fit", {
      "underline-dotted hover:underline-dotted-hover":
        variant === LinkVariant.DOTTED
    })}
  >
    {label}
  </button>
{/if}
