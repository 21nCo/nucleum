<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import TopBarInlineActions from "./TopBarInlineActions.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { type IActiveNodeStore } from "../node.store";
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { onMount } from "svelte";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  export let node: IActiveNodeStore;
  export let isClonesShown: boolean = false;
  export let nodePageVariant: "v1" | "v2" = "v1";
  let breadcrumbs: BreadcrumbItem[] | undefined = undefined;
  function onLabelChange(e: any) {
    console.log("onLabelChange", e);
    if ($node.label) node.debouncedModify({ label: $node.label });
  }
  onMount(() => {
    node.subscribe(async (x) => {
      if (x.parent) breadcrumbs = await refreshBreadcrumbs(x.parent);
    });
  });
  async function refreshBreadcrumbs(parent: string[]) {
    console.log("refreshing breadcrumbs", { node: $node });
    if (!parent) return;
    const parentItems = await flux.selectMany(Resource.node, {
      filters: {
        id: parent
      }
    });
    return parent
      .map((x) => {
        let item = parentItems.find((y) => y.id === x);
        if (!item) return;
        return {
          label: item.label ?? item.body,
          resourceId: x
        };
      })
      .filter((x) => x);
  }
  function onBreadcrumbClick(e: CustomEvent) {
    console.log("onBreadcrumbClick", e);
    if (!e.detail.item.resourceId) return;
    node.eventStore.set({
      event: e.detail.event,
      id: e.detail.item.resourceId
    });
  }
</script>

{#if $node}
  <div
    class="flex gap-4 items-center justify-between px-20 py-4 {nodePageVariant ===
    'v1'
      ? ''
      : 'border-b border-brs2'}"
  >
    {#if breadcrumbs && breadcrumbs.length > 0}
      <Breadcrumb
        items={breadcrumbs}
        isPreventDefault={true}
        on:click={onBreadcrumbClick}
      />
    {/if}
    <div class="flex gap-4 grow">
      {#if $node.type?.avatar}
        <AvatarView avatar={$node.type?.avatar} size={Size.md} />
      {/if}
      {#if !$node.focusedBlock}
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
            content={$node.label ?? $node.body ?? ""}
            style={TextStyle.PANEL_HEADING_SMALL}
          />
        {/if}
      {/if}
    </div>
    <div class="flex items-center gap-4 mx-4">
      <TopBarInlineActions {node} on:backlinks on:clones {isClonesShown} />
    </div>
  </div>
{/if}
