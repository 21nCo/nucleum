<script lang="ts">
  import {
    CurationType,
    CollectionViewType,
    CombinationViewType
  } from "$lib/client/types/memotron/curation.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { curations } from "./curation.store";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  let title: string;
  let errMsg: string;
  let isCreationInProgress: boolean = false;
  let isStarred: boolean = false;
  let selectedType: CurationType = CurationType.COLLECTION;
  let selectedView: CollectionViewType | CombinationViewType;
</script>

<div class="flex flex-col w-full h-full items-start gap-4 p-4">
  <Text content="Create curation" style={TextStyle.PANEL_HEADING} />
  <div class="flex flex-col gap-12 p-4 w-full overflow-auto">
    <!-- Cover photo -->
    <div class="flex items-end w-full gap-2">
      <TextInput label="Curation name" bind:value={title} width="grow" />
      <Toggle icon="star" bind:on={isStarred} />
    </div>
    <OptionSelector
      options={[
        {
          value: CurationType.COLLECTION,
          icon: "rectangle-stack"
        },
        {
          value: CurationType.COMBINATION,
          icon: "rectangle-group"
        }
      ]}
      style={OptionSelectorStyle.TRAIN}
      label="Type of curation"
      info={{
        body: "Choose the type of collection you want to create.",
        linkText: "Learn more about curation types",
        link: "/kb/curation-types"
      }}
      bind:selected={selectedType}
      size={Size.xl}
    />
    {#if selectedType === CurationType.COLLECTION}
      <OptionSelector
        style={OptionSelectorStyle.TRAIN}
        options={[
          { label: "Simple linking", value: "linking", icon: "at-symbol" },
          { label: "Advanced filter query", value: "filter", icon: "search" }
        ]}
        info={{
          body: "Choose advanced filter query to filter items based on specified conditions. It works as a live query.",
          linkText: "Learn more about advanced filter query",
          link: "/kb/advanced-filter-query"
        }}
        label="Items condition"
      />
      <OptionSelector
        options={[
          {
            value: CollectionViewType.BASIC,
            icon: "rectangle-stack"
          },
          {
            value: CollectionViewType.TABLE,
            icon: "table-cells"
          },
          { value: CollectionViewType.HEATMAP, icon: "calendar-days" },
          { value: CollectionViewType.GEOMAP, icon: "map" }
        ]}
        iconOrientation={Orientation.Vertical}
        label="Default view"
        bind:selected={selectedView}
        info={{
          body: "Choose the default view for your collection.",
          linkText: "Learn more about view types",
          link: "/kb/view-types"
        }}
      />
      <!-- Type selector if simple linking -->
    {:else}
      <!-- COMBINATION OPTIONS  -->
      <OptionSelector
        options={[
          { value: CombinationViewType.TREE, icon: "rectangle-stack" },
          { value: CombinationViewType.GRAPH, icon: "graph" },
          { value: CombinationViewType.WHITEBOARD, icon: "whiteboard" },
          { value: CombinationViewType.INFIGRID, icon: "infigrid" }
        ]}
        iconOrientation={Orientation.Vertical}
        bind:selected={selectedView}
        style={OptionSelectorStyle.OUTLINE}
        label="Default view"
      />
    {/if}
  </div>
  <footer class="flex flex-col w-full pb-8 gap-2">
    <InlineErrorMessage bind:error={errMsg} />
    <div class="flex w-full justify-center gap-4">
      <Button
        isLoading={isCreationInProgress}
        type="primary"
        on:click={async () => {
          isCreationInProgress = true;
          // await new CurationPersistance().create({
          //   label: title,
          //   type: selectedType,
          //   defaultView: selectedView
          // });
          // dataManager.performMutationForIFR(Item.curation,PersistanceActionType.CREATE, {
          //   label: title,
          //   type: selectedType,
          //   defaultView: selectedView
          // })
          curations.create({
            label: title,
            type: selectedType,
            defaultView: selectedView,
            isStarred
          });
          isCreationInProgress = false;
          if (!errMsg) modalEvent.hide();
        }}
        label="Save"
      />
      <Button
        on:click={() => {
          modalEvent.hide();
        }}>Discard</Button
      >
    </div>
  </footer>
</div>
