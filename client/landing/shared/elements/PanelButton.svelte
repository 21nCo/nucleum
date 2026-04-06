<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { PanelName } from "@21n/landing/shared/landing.type";
  import DayAndNightToggle from "@21n/landing/shared/DayAndNightToggle.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  let {
    label,
    description,
    icon,
    id = "",
    isProduct = false,
    isRightPanel = false,
    onclick
  }: {
    label: string;
    description: string;
    icon: string;
    id?: string;
    isProduct?: boolean;
    isRightPanel?: boolean;
    onclick?: () => void;
  } = $props();

  let className: string = "";
  export { className as class };

  let isHovered: boolean = false;
  const isInteractive = $derived(isProduct || isRightPanel);
</script>

{#if !$view.isPortrait}
  <button
    {id}
    class={cn(
      "w-[100px] h-full flex flex-col items-center justify-center p-4 text-center text-fgs2 text-opacity-80 text-base leading-5 ml-[1px] border-brs3",
      className,
      {
        "border-l": label == PanelName.PRODUCTS,
        "border-r": label == "21n",
        "hover:text-fgs1": isInteractive
      }
    )}
    onclick={onclick}
    use:hoverable={{
      onHover: (value) => {
        isHovered = value;
      }
    }}
  >
    {#if isInteractive}
      {#if isHovered}
        <SvgIcon {icon} size={Size.lg} />
      {/if}
      {#if isHovered}
        {description ?? label}
      {:else if label === "21n"}
        <SvgIcon icon="21n-temp" size={Size.xl} />
      {:else}
        {label}
      {/if}
    {:else}
      <DayAndNightToggle />
    {/if}
  </button>
{/if}
