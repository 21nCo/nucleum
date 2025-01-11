<script lang="ts">
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import InputBaseElement from "$lib/client/elements/InputBaseElement.svelte";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  const dispatch = createEventDispatcher();
  export let avatar: string = "star";
  export let count: number;
  export let value: number;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let isReadOnlyMode: boolean = false;
  if (typeof avatar !== "string") {
    avatar = "star";
  }
</script>

{#if isReadOnlyMode}
  <div class={cn("flex gap-1")}>
    {#each Array(count) as _, item}
      {@const _icon = +item + 1 <= value ? avatar + "-fill" : avatar}
      <Icon icon={`ph:${_icon}`} />
    {/each}
  </div>
{:else}
  <InputBaseElement {style} {label}>
    <div class={cn("flex gap-1")}>
      {#each Array(count) as _, item}
        {@const _icon = +item + 1 <= value ? avatar + "-fill" : avatar}
        <button
          on:click={() => {
            value = +item + 1;
            dispatch("change", value);
          }}
          class="flex items-center h-full"
        >
          <Icon icon={`ph:${_icon}`} />
        </button>
      {/each}
    </div>
  </InputBaseElement>
{/if}
