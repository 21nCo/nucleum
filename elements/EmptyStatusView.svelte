<script lang="ts">
  import EmptyStatus from "../illustrations/EmptyStatus.svelte";
  import EmptyStatusInbox from "../illustrations/EmptyStatusInbox.svelte";
  import { Size } from "../types/size.enum";
  import Button from "./button/Button.svelte";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size = Size.md;
  export let isLoadingState: boolean = false;
  export let actionText: string | undefined = undefined;
</script>

<div class="flex flex-col w-full h-full justify-center items-center gap-2">
  {#if isLoadingState}
    <div class="text-fgs2">Loading...</div>
  {:else}
    <div class="flex flex-col gap-1 items-center">
      {#if size === Size.sm}
        <EmptyStatusInbox width={40} />
      {:else}
        <EmptyStatus />
      {/if}
      <div>{mainText ?? ""}</div>
    </div>
    <div class="text-fgs3 text-center text-b3">
      {subText ?? ""}
    </div>
    {#if actionText}
      <Button label={actionText} size={Size.xs} on:click />
    {/if}
  {/if}
</div>
