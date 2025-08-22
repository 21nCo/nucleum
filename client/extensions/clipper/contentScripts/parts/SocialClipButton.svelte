<script lang="ts">
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { webpage } from "../store";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { AlertType } from "$lib/client/types/notification.type";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";

  export let contentType: NodeType;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let label: string | undefined = undefined;

  let id: string | undefined = undefined;
  let isSaving: boolean = false;
  let tooltipSaved: string = "Saved to Memotron";
  let tooltipSaving: string = "Saving...";
  let tooltipDefault: string = "Save to Memotron";
  let classList: string = "";
  export { classList as class };
  let isHovering: boolean = false;
  const dev_variant: "v1" | "v2" = "v2";

  function resolveTooltip(isSaving: boolean, id: string | undefined) {
    if (isSaving && id) return "Reparsing...";
    if (isSaving) return tooltipSaving;
    if (id) return tooltipSaved;
    if (label) return "";
    return tooltipDefault;
  }

  async function onClick(e: MouseEvent){
    try {
      e.stopPropagation();
      const target = e.target as HTMLElement | undefined;
      if (isSaving || !target) return;
      isSaving = true;
      if (id) {
        webpage.focus(id, {
          message: `${enumToString(contentType)} already saved!`,
          type: AlertType.SUCCESS
        });
        isSaving = false;
        return;
      }
      const result = await webpage.saveInlineSocialPost(target, contentType);
      if (result) {
        id = result.id;
      }
    } catch (err) {
      logger.error(`Error saving ${enumToString(contentType)} post`, err);
    } finally {
      isSaving = false;
    }
  }
</script>

{#if dev_variant === "v2"}
<div data-type="clip-button" class={classList}>
    <HoverableElement
      tooltip={resolveTooltip(isSaving, id)}
      tooltipOptions={{
        isUseAbsolutePositioning: true,
        placement: Placement.TopCenter
      }}
      class="relative flex justify-center items-center"
      on:click
    >
    <Button icon={isSaving
      ? "svg-spinners:3-dots-fade"
      : id
        ? "mynaui:check-hexagon-solid"
        : "mynaui:plus-hexagon"} 
        style={label ? ButtonStyle.OUTLINED : ButtonStyle.PLAIN} 
        size={size} 
        on:click={onClick} 
        {label} 
        />
    </HoverableElement>
</div>
{:else}
<button
    data-type="clip-button"
  class={classList}
  on:click|stopPropagation={onClick}
>
  <HoverableElement
    tooltip={resolveTooltip(isSaving, id)}
    tooltipOptions={{
      isUseAbsolutePositioning: true,
      placement: Placement.TopCenter
    }}
    class="relative flex justify-center items-center"
    on:click
  >
    <div
      class={cn("absolute inset-0 -ml-1.5 -mt-1 rounded-full w-8 h-8 bg-aps2", {
        "opacity-0": !isHovering
      })}
    ></div>
    <div
      use:hoverable={{ onHover: (val) => (isHovering = val) }}
      class={cn(
        "flex justify-center items-center p-0.5 py-1 [clip-path:url(#rounded-hexagon)] hover:scale-105 transition-all duration-100",
        { "bg-aps1": id, "bg-aps2 hover:bg-aps1": !id }
      )}
    >
      <Icon
        icon={isSaving
          ? "svg-spinners:3-dots-fade"
          : id
            ? "ph:check"
            : "plus"}
        size={id ? Size.xs : Size.sm}
        class={cn({
          "fill-abg": isHovering || id,
          "fill-aps1": !isHovering && !id
        })}
      />
    </div>
  </HoverableElement>
  <slot />

  <svg width="0" height="0" class="absolute">
    <defs>
      <clipPath id="rounded-hexagon" clipPathUnits="objectBoundingBox">
        <path
          d="M0.02,0.25 Q0.02,0.27 0.04,0.27 L0.46,0.04 Q0.5,0.02 0.54,0.04 L0.96,0.27 Q0.98,0.27 0.98,0.25 L0.98,0.75 Q0.98,0.73 0.96,0.73 L0.54,0.96 Q0.5,0.98 0.46,0.96 L0.04,0.73 Q0.02,0.73 0.02,0.75 Z"
        />
      </clipPath>
    </defs>
  </svg>
</button>
{/if}
