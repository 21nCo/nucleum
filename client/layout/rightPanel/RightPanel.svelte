<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import ComponentResolver from "../paint/ComponentResolver.svelte";
  import type { IAction } from "@21n/types/action.type";
  import { Size } from "@21n/types/size.enum";
  import { resizeListener } from "@21n/actions/resize.action";
  import { setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import { Context } from "@21n/types/appStore.type";
  import type { IContainer } from "../layout.type";
  export let action: IAction;
  const containerStore = writable<IContainer | undefined>(undefined);
  setContext<Writable<IContainer | undefined>>(
    Context.CONTAINER,
    containerStore
  );
</script>

<div
  class={cn(
    "flex justify-center items-center h-full bg-bgs2 border-l border-brs3 transition-all duration-200",
    {
      "min-w-80 w-80 2k:min-w-96 2k:w-96":
        action.rightPanelParams?.size === Size.sm,
      "min-w-96 w-96 2k:min-w-128 2k:w-128":
        !action.rightPanelParams?.size ||
        action.rightPanelParams?.size === Size.md
    }
  )}
  use:resizeListener={(e) => {
    containerStore.set(e);
  }}
>
  <ComponentResolver {action} />
</div>
