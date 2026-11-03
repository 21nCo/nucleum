<script lang="ts">
  import { AppStyle } from "@21n/theme/app-style";
  import AppStyleSelectorItem from "@nucleum/surfaces/settings/appearance/AppStyleSelectorItem.svelte";
  import FormControlLabelWrapper from "@21n/ui/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";

  let {
    label = "App style",
    size = Size.md,
    selected,
    onSelect = undefined
  }: {
    label?: string;
    size?: Size.sm | Size.md;
    selected: AppStyle;
    onSelect?: ((style: AppStyle) => void) | undefined;
  } = $props();

  const options = [
    { style: AppStyle.Boxed, label: "Boxed" },
    { style: AppStyle.Semi, label: "Semi-rounded" },
    { style: AppStyle.Rounded, label: "Rounded" }
  ];
</script>

<FormControlLabelWrapper props={{ label, orientation: Orientation.Vertical }}>
  <div
    class={cn("flex flex-wrap text-b2 mt-2", {
      "gap-4": size === Size.md,
      "gap-3": size === Size.sm
    })}
    role="group"
    aria-label={label}
    data-testid="app-style-selector"
  >
    {#each options as option (option.style)}
      <AppStyleSelectorItem
        style={option.style}
        label={option.label}
        {size}
        isActive={option.style === selected}
        onclick={() => onSelect?.(option.style)}
      />
    {/each}
  </div>
</FormControlLabelWrapper>
