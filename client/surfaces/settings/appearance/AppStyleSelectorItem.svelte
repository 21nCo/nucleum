<script lang="ts">
  import { AppStyle, isFramedAppStyle } from "@21n/theme/app-style";
  import { cn } from "@21n/ui/environment/presentation";
  import { Size } from "@21n/ui/elements/size.enum";

  let {
    style,
    label,
    isActive,
    size = Size.md,
    onclick = undefined
  }: {
    style: AppStyle;
    label: string;
    isActive: boolean;
    size?: Size.sm | Size.md;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();

  const isFramed = $derived(isFramedAppStyle(style));
  const isRounded = $derived(style === AppStyle.Rounded);
</script>

<button
  type="button"
  {onclick}
  aria-pressed={isActive}
  data-selected={isActive}
  data-testid="app-style-option"
  data-app-style-option={style}
  class={cn(
    "relative flex flex-col items-center mx-2 rounded-md border border-brs3",
    {
      "bg-bgs3": isActive,
      "bg-bgs2 hover:bg-bgs1": !isActive,
      "p-2 text-b3 gap-1.5 w-28": size == Size.sm,
      "p-3 max-w-[8rem] text-b2 gap-2 grow": size == Size.md
    }
  )}
>
  <div
    class={cn(
      "flex flex-col w-full h-12 overflow-hidden border border-brs3 bg-bgs2",
      {
        rounded: !isRounded,
        "rounded-lg": isRounded
      }
    )}
    aria-hidden="true"
  >
    <div
      class={cn("flex items-end h-3 shrink-0", {
        "border-b border-brs3": !isFramed
      })}
    >
      <div
        class={cn("h-full w-4 shrink-0", { "border-r border-brs3": !isFramed })}
      ></div>
      <div
        class={cn("h-full w-6 bg-bgs1", {
          "border-r border-brs3": !isFramed,
          "rounded-t-sm": isFramed && !isRounded,
          "rounded-t-md": isRounded
        })}
      ></div>
      <div class="flex justify-end items-center flex-1 h-full pr-1">
        <div
          class={cn("h-1.5 w-3 bg-bgs4", {
            "rounded-sm": !isRounded,
            "rounded-full": isRounded
          })}
        ></div>
      </div>
    </div>
    <div class="flex flex-1 min-h-0">
      <div
        class={cn("flex flex-col items-center gap-1 w-4 shrink-0 pt-1", {
          "border-r border-brs3": !isFramed
        })}
      >
        <div
          class={cn("w-2 h-1.5 bg-bgs4", {
            "rounded-sm": !isRounded,
            "rounded-full": isRounded
          })}
        ></div>
        <div
          class={cn("w-2 h-1.5 bg-bgs4", {
            "rounded-sm": !isRounded,
            "rounded-full": isRounded
          })}
        ></div>
      </div>
      <div
        class={cn("flex-1 bg-bgs1", {
          "mr-1 mb-1 rounded-sm rounded-tl-none": isFramed && !isRounded,
          "mr-1 mb-1 rounded-md rounded-tl-none": isRounded
        })}
      ></div>
    </div>
  </div>
  {label}
  {#if isActive}
    <div
      class="active-marker absolute border-2 inset-0 left-0 top-0 border-aps1 rounded-lg"
    ></div>
  {/if}
</button>

<style>
  .active-marker {
    height: calc(100% + 8px);
    width: calc(100% + 8px);
    margin: -4px;
  }
</style>
