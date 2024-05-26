<script lang="ts">
  import {
    CurationType,
    CollectionLayout,
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
  import {
    collectionLayoutOptions,
    combinationLayoutOptions,
    curations
  } from "./curation.store";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  let title: string;
  let errMsg: string;
  let isCreationInProgress: boolean = false;
  let isStarred: boolean = false;
  let selectedType: CurationType = CurationType.COLLECTION;
  let selectedView: CollectionLayout | CombinationViewType;
  const formLabelConfig = {
    orientation: Orientation.Vertical
  };
</script>

<div class="flex flex-col w-full h-full items-start gap-4 p-4">
  <Text content="Create curation" style={TextStyle.PANEL_HEADING} />
  <div class="flex flex-col gap-12 p-4 w-full overflow-auto">
    <!-- Cover photo -->
    <div class="flex items-end w-full gap-2">
      <TextInput
        label={{ ...formLabelConfig, label: "Curation name" }}
        bind:value={title}
        width="grow"
      />
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
      labelProps={{
        ...formLabelConfig,
        label: "Type of curation",
        tooltip: {
          body: "Choose the type of collection you want to create.",
          actionText: "Learn more about curation types",
          action: "/kb/curation-types"
        }
      }}
      bind:selected={selectedType}
      size={Size.lg}
    />
    {#if selectedType === CurationType.COLLECTION}
      <OptionSelector
        style={OptionSelectorStyle.TRAIN}
        options={[
          { label: "Simple linking", value: "linking", icon: "at-symbol" },
          { label: "Advanced filter query", value: "filter", icon: "search" }
        ]}
        labelProps={{
          ...formLabelConfig,
          label: "Items condition",
          tooltip: {
            body: "Choose advanced filter query to filter items based on specified conditions. It works as a live query.",
            actionText: "Learn more about advanced filter query",
            action: "/kb/advanced-filter-query"
          }
        }}
      />
      <OptionSelector
        options={collectionLayoutOptions}
        iconOrientation={Orientation.Vertical}
        labelProps={{
          ...formLabelConfig,
          label: "Default view",
          tooltip: {
            body: "Choose the default view for your collection.",
            actionText: "Learn more about view types",
            action: "/kb/view-types"
          }
        }}
        bind:selected={selectedView}
      />
      <!-- Type selector if simple linking -->
    {:else}
      <!-- COMBINATION OPTIONS  -->
      <OptionSelector
        options={combinationLayoutOptions}
        iconOrientation={Orientation.Vertical}
        bind:selected={selectedView}
        style={OptionSelectorStyle.OUTLINE}
        labelProps={{ ...formLabelConfig, label: "Default view" }}
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
            defaultLayout: selectedView,
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
