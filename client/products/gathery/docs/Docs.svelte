<script>
  import Autocomplete from "$lib/client/elements/autocomplete/Autocomplete.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import NodeThumbnail from "$lib/client/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { docStore } from "$local/client/products/gathery/docs.store";
  import { GatheryEvent } from "$lib/client/types/gathery/gatheryEvent.enum";
  export let searchInput = "";
  docStore.refresh();
</script>

<div class="flex flex-col w-full h-full pt-4 px-8 pb-4 gap-6">
  <div class="flex w-full items-center justify-between">
    <Text content="Docs" style={TextStyle.PAGE_HEADING} />
    <!-- <TextInput
      bind:value={searchInput}
      style={TextInputStyle.OUTLINED}
      width="max-w-fit"
      size={Size.xs}
      placeholder="search docs..."
    /> -->
    <Autocomplete
      inputClassList="rounded-full"
      wrapperClassList="w-[28rem]"
      bind:inputValue={searchInput}
      placeholder="search docs"
      hideResetIcon={true}
      on:search
      on:reset={() => {
        // isShowSearchBar = false;
      }}
    />
    <Button
      label="Create new doc"
      size={Size.sm}
      type={ButtonVariant.PRIMARY}
      on:click={() => {
        appStore.runAction(GatheryEvent.NEW_DOC);
      }}
    />
  </div>
  <div class="flex flex-col gap-4 w-full flex-grow">
    <div class="flex justify-center w-full">
      <PanelSwitcher
        items={["All", "Starred"]}
        style={PanelSwitcherStyle.TRAIN}
        size={Size.sm}
      />
    </div>
    <div class="flex flex-col h-full gap-2 overflow-auto">
      {#if isValidArrayWithData($docStore.docs)}
        {#each $docStore.docs as doc}
          <NodeThumbnail
            item={doc}
            on:click={() => {
              appStore.toggleSearchParam({ doc: doc.id });
              appStore.runAction(GatheryEvent.OPEN_DOC, doc);
            }}
          />
        {/each}
      {/if}
    </div>
  </div>
</div>
