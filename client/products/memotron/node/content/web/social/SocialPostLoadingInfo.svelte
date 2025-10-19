<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";

  export let loading: boolean;
  export let error: string;
  export let platform: string = "social";
</script>

<div
  class={cn("mt-16", {
    "text-fgs3": loading,
    "text-ars1": error
  })}
>
  {loading
    ? `Loading ${platform} post...`
    : error || `Unable to load ${platform} post`}
</div>
