<script lang="ts">
  import { goto } from "$app/navigation";
  import { fade } from "svelte/transition";
  import Button from "../elements/Button.svelte";
  import Link from "../elements/text/Link.svelte";
  export let body: string;
  export let actionLabel: string | undefined = undefined;
  export let action: string | undefined = undefined;
</script>

<div
  class="flex flex-wrap items-center justify-center gap-4 rounded-md px-8 py-2 outline outline-1 outline-accent1 text-b2"
>
  <div class="grow text-center">
    <span><b>New 🚀:</b></span>
    {body}
  </div>
  {#if action && actionLabel}
    <div class="font-bold underline">
      <Link
        isSameTab={true}
        label={actionLabel}
        href={action}
        feedback="underline"
      />
    </div>
  {/if}
</div>
