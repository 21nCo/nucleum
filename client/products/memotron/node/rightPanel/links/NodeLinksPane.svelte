<script lang="ts">
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "../../node.store";
  import LinkSearch from "../../../common/linkbox/LinkSearch.svelte";
  import { linker } from "../../../memotron.store";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { LinkType, type INode } from "../../node.type";
  import LinkItems from "./LinkItems.svelte";
  export let node: IActiveNodeStore;
  let links: INode[] = [];
  onMount(async () => {
    //TODO - refresh on focus
    await refresh();
  });

  async function onSelect(e: CustomEvent<any>) {
    console.log("onselect", e.detail);
    if (!e.detail.item.id) return;
    if (links.some((x) => x.id == e.detail.item.id)) return;
    linker.link($node.focusedBlock ?? node.id, e.detail.item.id);
    links = [...links, e.detail.item.id];
  }
  async function refresh() {
    const result = await node.fetchLinks();
    console.log({ result });
    if (!result) return;
    const linkIds = [
      ...result.from
        .filter(
          (x) => x.linkType === LinkType.DIRECT && x.in.startsWith("node:")
        )
        .map((x) => x.in),
      ...result.to
        .filter(
          (x) => x.linkType === LinkType.DIRECT && x.out.startsWith("node:")
        )
        .map((x) => x.out)
    ];
    console.log({ linkIds });
    links = await $dataManager.cacheSource.dexie.node
      .where("id")
      .anyOfIgnoreCase(linkIds)
      .toArray();
  }
</script>

<LinkSearch context="nodepage" on:select={onSelect} />
<LinkItems {links} />
