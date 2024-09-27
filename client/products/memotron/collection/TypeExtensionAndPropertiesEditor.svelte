<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import { propertyEditorStore } from "./properties/property.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import SearchSingleSelect from "$lib/client/elements/select/SearchSingleSelect.svelte";
  import { createEventDispatcher } from "svelte";
  import { CollectionType, type ICollection } from "./collection.type";
  import {
    collectionStore,
    type IActiveCollectionStore
  } from "./collection.store";
  const dispatch = createEventDispatcher();
  export let typeToExtend: ICollection | undefined = undefined;
  export let isCaptureShortcutEnabled: boolean = false;
  export let collection: IActiveCollectionStore | undefined = undefined;
  let isTypeExtension: boolean = typeToExtend ? true : false;

  const formLabelConfig = {
    orientation: Orientation.Vertical
  };

  function onCaptureShortcutChange(e: CustomEvent) {
    dispatch("shortcutChange", e.detail);
  }

  function onTypeExtensionChange(e: CustomEvent) {
    dispatch("typeExtensionChange", e.detail);
  }

  function searchForTypeExtension(searchQuery: string) {
    return collectionStore.selectMany({
      filters: {
        type: CollectionType.TYPED
      },
      search: {
        query: searchQuery,
        properties: ["label"]
      }
    });
  }
</script>

<div class="flex flex-col items-start w-full gap-2">
  <FormControlLabel props={{ label: "Properties" }} />
  <button
    class="flex justify-center items-center w-full border border-brs3 rounded-md h-11 text-base"
    on:click={() => {
      appStore.runAction(MemotronAction.EDIT_COLLECTION_PROPERTIES, {
        componentParams: {
          collection
        }
      });
    }}
  >
    <span class="flex gap-2 text-fgs2 text-b2">
      <Icon
        icon={$propertyEditorStore.length > 0
          ? "ph:pencil-simple-line-light"
          : "ph:plus-light"}
        size={Size.sm}
      />
      {$propertyEditorStore.length > 0
        ? `Edit properties (${$propertyEditorStore.length})`
        : "Add properties"}
    </span>
  </button>
</div>
<div class="flex flex-col items-start w-full gap-3">
  <SwitchInput
    label={{
      ...formLabelConfig,
      label: "Extend an existing Type collection",
      orientation: Orientation.Horizontal,
      tooltip: {
        body: "You can extend an existing type by adding additional properties on top. Editing the properties on base type will reflect in all extended types.",
        actionText: "Learn more about advanced filter query",
        action: "/kb/advanced-filter-query"
      }
    }}
    isExpanded={true}
    bind:checked={isTypeExtension}
    on:change={onTypeExtensionChange}
  />
  {#if isTypeExtension}
    <div class="flex flex-col items-start w-full gap-2">
      <SearchSingleSelect
        bind:selected={typeToExtend}
        searchCallback={searchForTypeExtension}
        on:select={onTypeExtensionChange}
        placeholder="Search for a collection to extend"
      />
      <div class="text-b2 text-fgs3">
        Inherited properties: {typeToExtend?.properties?.length ?? 0}
      </div>
    </div>
  {/if}
</div>
<SwitchInput
  label={{
    ...formLabelConfig,
    label: "Add to capture shortcuts",
    orientation: Orientation.Horizontal,
    tooltip: {
      body: "Enabling this will create a shortcut on capture page to seamlessly capture a new node entry and add it to the collection.",
      actionText: "Learn more",
      action: "/kb/type-collections"
    }
  }}
  bind:checked={isCaptureShortcutEnabled}
  isExpanded={true}
  on:change={onCaptureShortcutChange}
/>
