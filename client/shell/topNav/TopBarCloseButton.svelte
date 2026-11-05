<svelte:options runes={true} />

<script lang="ts">
  import { cn } from "@21n/ui/environment/presentation";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";

  let {
    label = "Close",
    menuColumn = undefined,
    onclick
  }: {
    /** Accessible name and tooltip of the button. */
    label?: string;
    /** App menu column the button lines up with, if that column is shown. */
    menuColumn?: "labels" | "icons";
    onclick: () => void;
  } = $props();
</script>

<button
  type="button"
  data-testid="top-bar-close"
  aria-label={label}
  class={cn(
    "flex items-center justify-center h-full shrink-0 text-fgs2 hover:bg-bgs3-striped hover:text-fgs1 border-r border-brs3",
    "app-framed:border-r-0 app-framed:h-10 app-framed:w-10 app-framed:px-0 app-framed:rounded-[var(--app-control-radius)] app-framed:bg-bgs1 app-framed:shadow-sm app-framed:hover:bg-bgs3",
    {
      "w-[5.5rem] app-framed:mx-6": menuColumn === "labels",
      "w-[3.5rem] app-framed:mx-2": menuColumn === "icons",
      "px-4 app-framed:ml-[max(var(--app-shell-gap),0.5rem)] app-framed:mr-2":
        !menuColumn
    }
  )}
  use:tooltip={{ text: label }}
  {onclick}
>
  <Icon icon="cross" size={Size.md} />
</button>
