<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { resolveActiveNodeStore } from "../node.store";
  import TopBarInlineActions from "./TopBarInlineActions.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  export let id: string;
  export let isClonesShown: boolean = false;
  export let nodePageVariant: "v1" | "v2" = "v1";
  const node = resolveActiveNodeStore(id);
  function onLabelChange(e: any) {
    console.log("onLabelChange", e);
    if ($node.label) node.debouncedModify({ label: $node.label });
  }
</script>

{#if $node}
  <div
    class="flex gap-4 items-center justify-between px-20 py-4 {nodePageVariant ===
    'v1'
      ? ''
      : 'border-b border-brs2'}"
  >
    <!-- Parent breadcrumbs -->
    <div class="flex gap-4 grow">
      {#if $node.type?.avatar}
        <AvatarView avatar={$node.type?.avatar} size={Size.md} />
      {/if}
      {#if $isInEditMode}
        <TextInput
          size={Size.xl}
          bind:value={$node.label}
          style={InputStyle.PLAIN}
          placeholder="Node title"
          width="w-full"
          on:input={onLabelChange}
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
