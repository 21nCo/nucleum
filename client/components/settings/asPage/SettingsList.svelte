<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import SettingThumbnail from "../SettingThumbnail.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ActionType } from "$lib/client/types/action.type";
  export let items: string[] = [];
  export let sectionName: string;
  export let orientation: Orientation = Orientation.Horizontal;
  function onClick(item: string) {
    const component = appStore.resolveAction(item);
    if (
      component?.type === ActionType.LINK ||
      component?.type === ActionType.FUNCTION
    )
      appStore.runAction(item, { isReturnIfComponent: true });
    else if (component?.path) appStore.gotoPath(component.path);
    // else appStore.gotoPath("/cp/" + item);
    else
      appStore.toggleSearchParam({
        setting: item
      });
  }
</script>

<div class="flex flex-col gap-2">
  {#if sectionName}
    <div class="pl-4">
      <Text style={TextStyle.SECTION_HEADING} content={sectionName} />
    </div>
  {/if}
  <div
    class={orientation === Orientation.Horizontal
      ? "flex flex-col "
      : "flex flex-wrap gap-2 pl-4"}
  >
    {#if items}
      {#each items as item}
        <SettingThumbnail
          {orientation}
          action={item}
          setActiveByPath={true}
          on:click={() => {
            onClick(item);
          }}
        />
        {#if orientation === Orientation.Horizontal}
          <Divider colorStrength={ColorStrength.Subtle} />
        {/if}
      {/each}
    {/if}
  </div>
</div>
