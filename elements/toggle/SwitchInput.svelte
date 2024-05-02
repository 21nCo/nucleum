<script lang="ts">
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  import Switch from "./Switch.svelte";
  export let label: string;
  export let checked: boolean = false;
  export let width: string | undefined = undefined;
  export let size: Size = Size.md;
  export let isExpanded: boolean = true;
  export let info: FormLabelInfoTooltip | undefined = undefined;
</script>

<div
  class={cn(
    "flex justify-between items-center min-w-fit",
    {
      "w-full max-w-md": isExpanded,
      "gap-3": size === Size.sm,
      "gap-4": size === Size.md
    },
    width ? width : ""
  )}
>
  <FormControlLabel {label} {info} />
  <Switch bind:on={checked} {size} />
</div>
