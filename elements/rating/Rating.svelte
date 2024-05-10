<script lang="ts">
  import AvatarView from "$lib/tidy/elements/avatarPicker/AvatarView.svelte";
  import type { AvatarWithCode, IconAvatar } from "$lib/tidy/types/avatar.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { InputStyle, type InputLabel } from "$lib/tidy/types/input.type";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import InputBaseElement from "../InputBaseElement.svelte";
  export let avatar: AvatarWithCode<IconAvatar>;
  export let count: number;
  export let value: number;
  export let size: Size = Size.md;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
</script>

<InputBaseElement {style} {label}>
  <div class={cn("flex gap-1")}>
    {#each Array(count) as _, item}
      <button
        on:click={() => {
          value = +item;
        }}
        class="flex items-center h-full"
      >
        <AvatarView avatar={{ ...avatar, isFilled: +item <= value }} {size} />
      </button>
    {/each}
  </div>
</InputBaseElement>
