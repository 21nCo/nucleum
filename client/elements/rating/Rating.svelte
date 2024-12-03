<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import type {
    AvatarWithCode,
    IconAvatar
  } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import InputBaseElement from "../InputBaseElement.svelte";
  import { createEventDispatcher } from "svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  const dispatch = createEventDispatcher();
  export let avatar: AvatarWithCode<IconAvatar>;
  export let count: number;
  export let value: number;
  export let size: Size = Size.md;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let isReadOnlyMode: boolean = false;
</script>

{#if isReadOnlyMode}
  <div class={cn("flex gap-1")}>
    {#each Array(count) as _, item}
      <AvatarRenderer
        dev_iOSTempRatingFallback={$context.os === OperatingSystem.IOS}
        avatar={{ ...avatar, isFilled: +item + 1 <= value }}
        {size}
      />
    {/each}
  </div>
{:else}
  <InputBaseElement {style} {label}>
    <div class={cn("flex gap-1")}>
      {#each Array(count) as _, item}
        <button
          on:click={() => {
            value = +item + 1;
            dispatch("change", value);
          }}
          class="flex items-center h-full"
        >
          <AvatarRenderer
            dev_iOSTempRatingFallback={$context.os === OperatingSystem.IOS}
            avatar={{ ...avatar, isFilled: +item + 1 <= value }}
            {size}
          />
        </button>
      {/each}
    </div>
  </InputBaseElement>
{/if}
