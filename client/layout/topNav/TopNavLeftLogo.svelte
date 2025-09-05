<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  export let isHideMenuLabels: boolean = false;
</script>

<div
  class={cn("flex items-center h-full w-fit border-r border-brs3", {
    "px-[0.72rem]": isHideMenuLabels,
    "px-[1.72rem]": !isHideMenuLabels
  })}
>
  <div class="opacity-50">
    <SubAtomLogo size={Size.sm} />
  </div>
</div>
