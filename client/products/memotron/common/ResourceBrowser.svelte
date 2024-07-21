<script lang="ts">
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Position } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { liveQuery } from "dexie";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { appStore } from "$lib/client/stores/app.store";
  import { collectionStore } from "../collection/collection.store";
  import Curation from "../curation/Curation.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import Resources from "./Resources.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  import { page } from "$app/stores";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import { resourceAction } from "$lib/client/components/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/resourceStores/resource.type";
  export let resource: Resource;
  collectionStore.refresh();
  let searchQuery: string = "";
  let id: string | null = null;
  $: id = $page.url.searchParams.get(ResourceAccessMode.INLINE);
  let starred = liveQuery(() =>
    //@ts-ignore
    $dataManager.cacheSource.dexie[resource]
      .where("id")
      .notEqual("")
      .and((item: any) => activeResourceFilter(item))
      .and((item: any) => item.isStarred === true)
      .toArray()
  );

  let data = liveQuery(() =>
    //@ts-ignore
    $dataManager.cacheSource.dexie[resource]
      .where("id")
      .notEqual("")
      .and((item: any) => activeResourceFilter(item))
      .toArray()
  );

  function refreshStarredData() {}
</script>

<Panel
  floatingButton={{
    label: "Create " + resource,
    callback: async () =>
      appStore.runAction(resourceAction(resource, ResourceActionType.CREATE)),
    icon: "plus",
    variant: ButtonVariant.PRIMARY
  }}
>
  <slot name="nonpadded" slot="nonpadded">
    <div class="flex flex-col gap-4 h-full">
      <header class="flex gap-1 items-center py-4 px-5 border-b border-brs2">
        <TextInput
          bind:value={searchQuery}
          size={Size.lg}
          style={InputStyle.PLAIN}
          placeholder={"Search " + resource + "s"}
        />
        {#if searchQuery}
          <Button
            icon="cross"
            tooltip="Clear query"
            size={Size.sm}
            on:click={() => {
              searchQuery = "";
            }}
          />
          <!-- {:else}
            <Button icon="adjustments-vertical" size={Size.sm} /> -->
        {/if}
        <Button
          icon="adjustments-vertical"
          tooltip="Refine search"
          toolTipPlacement={Position.Right}
          size={Size.md}
        />
      </header>
      <main class="flex flex-col gap-8 mx-5 overflow-auto">
        <div class="flex flex-col gap-4">
          <Text style={TextStyle.SECTION_HEADING} content="Starred" />
          <Resources
            data={$starred}
            {resource}
            defaultAccessMode={ResourceAccessMode.INLINE}
          />
        </div>
        <div class="flex flex-col gap-4">
          <Text style={TextStyle.SECTION_HEADING} content="All" />
          <Resources
            data={$data}
            {resource}
            defaultAccessMode={ResourceAccessMode.INLINE}
          />
        </div>
        <ScrollViewBottomSpacer />
      </main>
    </div>
  </slot>
  <slot slot="right" name="right">
    {#key id}
      {#if id}
        <ResourceResolver {id} />
      {/if}
    {/key}
  </slot>
</Panel>
