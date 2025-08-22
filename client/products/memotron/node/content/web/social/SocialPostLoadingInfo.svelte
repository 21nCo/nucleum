<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";

  export let loading: boolean;
  export let error: string;
</script>

<div
  class={cn("mt-12", {
    "text-fgs3": loading,
    "text-ars1": error
  })}
>
  {loading ? "Loading Reddit post..." : error || "Unable to load Reddit post"}
</div>
