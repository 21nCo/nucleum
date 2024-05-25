<script lang="ts">
  import type { Type } from "$lib/client/types/memotron/type.type";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { dataManager } from "$lib/client/stores/data.store";
  import type { Avatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TextInputStyle } from "$lib/client/types/textinput.enum";
  import Memocon from "../../common/Memocon.svelte";
  import { resolveActiveNodeStore } from "../node.store";
  import TopBarInlineActions from "./TopBarInlineActions.svelte";
  export let id: string;
  export let isClonesShown: boolean = false;
  export let nodePageVariant: "v1" | "v2" = "v1";
  const node = resolveActiveNodeStore(id);
  //TODO - more actions - history, archive, delete, share, copy link
</script>

{#if $node}
  <div
    class="flex gap-4 items-center justify-between pl-12 pr-2 py-2 {nodePageVariant ===
    'v1'
      ? ''
      : 'border-b border-brs2'}"
  >
    <!-- Parent breadcrumbs -->
    <div class="flex gap-4 grow">
      <!-- TODO - reenable after loading time issue of Avatar picker -->
      <!-- <Memocon bind:avatar={$node.avatar} /> -->
      {#if $node.type?.avatar}
        <AvatarView avatar={$node.type?.avatar} size={Size.md} />
      {/if}
      {#if $isInEditMode}
        <TextInput
          size={Size.xl}
          bind:value={$node.label}
          style={TextInputStyle.PLAIN}
          placeholder="Node title"
          width="w-full"
        />
      {:else}
        <Text
          content={$node.label ?? ""}
          style={TextStyle.PANEL_HEADING_SMALL}
        />
      {/if}
    </div>
    <div class="flex items-center gap-4 mx-4">
      <TopBarInlineActions {id} on:backlinks on:clones {isClonesShown} />
    </div>
  </div>
{/if}
