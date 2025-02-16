<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Badge from "./Badge.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import AvatarRenderer from "../avatarPicker/AvatarRenderer.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import context from "$lib/client/stores/context.store";
  const dispatch = createEventDispatcher();
  export let label: string;
  export let parentBgIndex: number = 1;
  export let icon: string | IAvatar | undefined = undefined;
  export let size: Size.sm | Size.md = Size.md;
  export let isRemovable = true;
  export let isActive = false;
  export let count: number | undefined = undefined;
  export let id: IRecordId | undefined = undefined;
  export let isShowExpandFeedbackOnActive = false;
  export let expandFeedbackPosition:
    | Placement.BottomCenter
    | Placement.BottomLeft
    | Placement.BottomRight = Placement.BottomCenter;
  export let removeStyle: "overlay" | "inline" | "always-show" = "inline";
  let isHovering = false;
  $: isRemoveIconRenderedInline =
    isRemovable &&
    ($context.isTouchDevice ||
      removeStyle === "always-show" ||
      (removeStyle === "inline" && isHovering));
</script>

<div class="overflow-hidden">
  <button
    class={cn(
      "relative flex gap-2 items-center justify-center whitespace-nowrap border min-w-20",
      {
        "text-b3 px-2 py-0.5 rounded-md": size === Size.sm,
        "text-b2 pl-4 pr-2 py-1 rounded-full": size === Size.md,
        "pr-4": size === Size.md && !isRemoveIconRenderedInline,
        "border-brs3 hover:border-fgs4": !isActive,
        "border-aps1": isActive
      }
    )}
    id={id?.toString()}
    on:click
    use:hoverable={{
      onHover: (value) => (isHovering = value)
    }}
  >
    {#if icon && typeof icon === "string"}
      <Icon {icon} size={Size.sm} />
    {:else if icon && typeof icon === "object"}
      <AvatarRenderer avatar={icon} size={Size.sm} />
    {/if}
    {label ? truncateString(label, 24) : ""}
    {#if count !== undefined}
      <Badge text={count} size={size === Size.sm ? Size.xs : Size.sm} />
    {/if}
    {#if isRemoveIconRenderedInline}
      <button
        class={cn("rounded-full flex h-full items-center", {
          "from-bgs1 via-bgs1": parentBgIndex === 1,
          "from-bgs2 via-bgs2": parentBgIndex === 2,
          "from-bgs3 via-bgs3": parentBgIndex === 3,
          "absolute top-0 right-0 bg-gradient-to-l  to-transparent pr-2 pl-3":
            removeStyle === "overlay",
          "active:bg-bgs2 notouch:hover:bg-bgs2":
            removeStyle === "inline" || removeStyle === "always-show"
        })}
        on:click={(e) => {
          dispatch("remove");
          e.stopPropagation();
        }}
      >
        <Icon icon="cross" />
      </button>
    {/if}
    {#if isActive && isShowExpandFeedbackOnActive}
      <svg
        width="16"
        height="10"
        viewBox="0 0 16 10"
        class={cn("absolute -bottom-[5px] -translate-x-1/2", {
          "left-1/4": expandFeedbackPosition === Placement.BottomLeft,
          "right-1/4": expandFeedbackPosition === Placement.BottomRight,
          "left-1/2": expandFeedbackPosition === Placement.BottomCenter
        })}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 7C2 7 4.5 7 8 7C11.5 7 14 7 14 7L8 1L2 7Z"
          class="stroke-aps1 fill-bgs1"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </button>
</div>
