<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import type { ICollectionView } from "$lib/client/types/memotron/collection.type";
  import type { INodeThumbnail } from "$lib/client/types/memotron/node.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeItems from "../../../common/NodeItems.svelte";
  import { resolvePropertyOptions } from "../../curation.utils";
  import SubGroup from "./SubGroup.svelte";
  export let view: ICollectionView;
  export let group: any;
  export let data: any;
  export let properties: IProperty[] | null = null;
  export let isBoardOverflow = false;
  let isRenderColors = true;
  $: subGroups = resolveBoards(view.subGroupBy);
  function resolveBoards(id: string) {
    // if (view.subGroups) return view.subGroups;
    return resolvePropertyOptions(id, properties);
  }
  function filterSubGroupData(val: ISelectValue) {
    return data?.filter((node: INodeThumbnail) => {
      return (
        node.properties?.find((p) => p.id === view.subGroupBy)?.value === val
      );
    });
  }
</script>

<CustomColorPropagator color={group.color}>
  <div
    class={cn(
      "board relative h-full min-w-[24rem] dp:w-[28rem] 2k:w-[30rem] flex flex-col gap-2 border border-brs3 px-4 mb-2 rounded-md",
      {
        "overflow-y-auto": isBoardOverflow,
        "border-ccs2 bg-ccs3": isRenderColors,
        "border-brs3 bg-bgs1": !isRenderColors
      }
    )}
    style="height: calc(100vh - 95px);"
  >
    <div
      class="board-title sticky top-0 flex items-center w-full justify-between py-4 bg-bgs1"
    >
      <Text content={group.label} style={TextStyle.PANEL_HEADING_SMALL} />
      <Button icon="ellipsis-vertical" />
    </div>
    <div class="grow w-full flex flex-col gap-2">
      {#if isValidArrayWithData(subGroups)}
        {#each subGroups as subGroup}
          <SubGroup
            {subGroup}
            data={filterSubGroupData(subGroup.value)}
            arrangement={view.arrangement}
          />
        {/each}
      {:else if isValidArrayWithData(data)}
        <NodeItems nodes={data} arrangement={view.arrangement} />
      {:else}
        <EmptyStatusView size={Size.sm} subText="No items meet this criteria" />
      {/if}
    </div>
  </div>
</CustomColorPropagator>
