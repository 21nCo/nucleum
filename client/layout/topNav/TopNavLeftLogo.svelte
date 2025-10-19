<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import SubAtomLogo from "@21n/branding/SubAtomLogo.svelte";
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
