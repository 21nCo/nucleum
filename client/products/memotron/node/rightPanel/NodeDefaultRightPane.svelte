<script lang="ts">
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import InlineMarkdownTextInput from "@21n/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { canHaveTraces } from "@21n/products/memotron/node/node.type";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import { appStore } from "@21n/stores/app.store";
  import { focusById } from "@21n/actions/focusById.action";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import InfoCard from "@21n/products/memotron/node/metadata/InfoCard.svelte";
  import { resolveNodeLabel } from "../node.utils";
  import NodeTitle from "../title/NodeTitle.svelte";
  import CollectionsLane from "../floatingBar/CollectionsLane.svelte";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  export let node: IActiveNodeStore;
  let _notes = $node.notes;
  const notesInputId = generateSimpleRandomId();

  function onNotesChange(e: any) {
    if (_notes !== undefined)
      node.modify({ notes: _notes }, { isPreventBackPropagation: true });
  }

  $: _label = resolveNodeLabel($node);
</script>

<div class="flex flex-col gap-4 w-full h-full bg-bgs2 cw:p-2 px-3">
  <div class="flex w-full justify-between">
    <NodeTitle
      node={$node}
      on:labelChange={(e) => {
        if ($node.label !== undefined) node.modify({ label: $node.label });
      }}
      on:editModeChange={(e) => {
        node.toggleEditMode(e.detail);
      }}
    />
  </div>
  <div class="flex w-full justify-between">
    <CollectionsLane {node} />
  </div>
  <div class="w-full">
    <PropertiesPane
      item={node}
      resource={Resource.node}
      isVisibleProps={true}
    />
  </div>
  <div class="w-full grid grid-cols-3 gap-3 px-2 dp:px-3">
    {#if _label && typeof _label === "object" && "parent" in _label}
      <InfoCard
        label="Parent"
        value={_label.parent.label}
        parentBgIndex={0}
        span="col-span-2"
        on:click={(e) => {
          appStore.resourceClickHandler(e, _label?.parent.id, {
            replaceId: $node.id,
            defaultTo: ResourceAccessMode.POP
          });
        }}
      />
    {/if}
    <InfoCard
      label="Saved at"
      value={$node.createdAt}
      parentBgIndex={0}
      on:click={() => node.switchPanel(ResourcePanelType.METADATA)}
    />
    <!-- <InfoCard label="Genre" value={"Sci fi (3 items in library)"} parentBgIndex={0}
      on:click={() => (pane = ResourcePanelType.LINKS)}
      /> -->
    <InfoCard
      label="Links"
      value={$node.links?.length || 0}
      parentBgIndex={0}
      on:click={() => node.switchPanel(ResourcePanelType.LINKS)}
    />
    {#if canHaveTraces.includes($node.contentType)}
      <InfoCard
        label="Bookmarks"
        value={$node.clips?.length || 0}
        parentBgIndex={0}
        on:click={() => node.switchPanel(ResourcePanelType.BOOKMARKS)}
      />
    {/if}
  </div>
  <div
    class="flex flex-col gap-1 items-start w-full flex-1 min-h-0 max-h-1/2 border-t border-brs2 pt-1"
  >
    <span
      class="flex flex-row justify-between items-center w-full px-2 dp:px-3"
    >
      <span class="flex flex-row gap-1 items-center">
        <Text content="Side notes" style={TextStyle.SECTION_HEADING} />
      </span>
      <span>
        <Button
          icon="expand"
          size={Size.sm}
          parentBgIndex={2}
          on:click={() => node.switchPanel(ResourcePanelType.SIDENOTES)}
        />
      </span>
    </span>
    <button
      class="flex w-full flex-1 bg-bgs2 bg-opacity-60 px-4 pb-2 overflow-y-auto"
      use:focusById={notesInputId}
    >
      <InlineMarkdownTextInput
        id={notesInputId}
        placeholder="Add notes"
        bind:content={_notes}
        on:debouncedChange={onNotesChange}
      />
    </button>
  </div>
</div>
