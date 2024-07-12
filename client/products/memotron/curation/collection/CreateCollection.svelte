<script lang="ts">
  import { CombinationViewType } from "$lib/client/types/memotron/curation.type";
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
    collectionStore
  } from "./collection.store";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { MemotronAction } from "$lib/client/types/memotron/memotronAction.enum";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import PropertiesEditor from "../../type/PropertiesEditor.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import {
    CollectionLayout,
    CollectionType
  } from "$lib/client/types/memotron/collection.type";
  let title: string;
  let errMsg: string;
  let isCreationInProgress: boolean = false;
  let isStarred: boolean = false;
  let selectedType: CollectionType = CollectionType.UNTYPED;
  let selectedView: CollectionLayout | CombinationViewType;
  let associatedType: string = "";
  let isSearchQuery: boolean = false;
  const formLabelConfig = {
    orientation: Orientation.Vertical
  };
  function onTypeSelect(e: CustomEvent) {
    console.log("type selected", e.detail, associatedType);
    if (associatedType === "add") {
      appStore.runAction(MemotronAction.CREATE_TYPE);
    }
  }
  function generateInfo(selectedType: CollectionType) {
    switch (selectedType) {
      case CollectionType.TYPED:
        return {
          content:
            "Typed collections are used to store structured data. You can define the properties of the data you want to store and customize avatar, content templates etc.",
          action: {
            label: "Learn more",
            action: "/kb/typed-collections"
          }
        };
      case CollectionType.QUERY:
        return {
          content:
            "Query collections are used to store data based on a query. You can define the query to filter the data you want to store. New items will be automatically added based on the query.",
          action: {
            label: "Learn more",
            action: "/kb/query-collections"
          }
        };
      default:
        return {
          content: "Basic collections are used to store unstructured data.",
          action: {
            label: "Learn more",
            action: "/kb/basic-collections"
          }
        };
    }
  }
</script>

<div class="flex flex-col w-full h-full items-start gap-4 p-4">
  <Text content="Create collection" style={TextStyle.PANEL_HEADING} />
  <div class="flex flex-col gap-12 p-4 w-full overflow-auto">
    <!-- Cover photo -->
    <div class="flex items-end w-full gap-2">
      <TextInput
        label={{ ...formLabelConfig, label: "Name of the collection" }}
        bind:value={title}
        width="grow"
      />
      <Toggle icon="star" bind:on={isStarred} />
    </div>
    <OptionSelector
      options={[
        {
          label: "Simple Collection",
          value: CollectionType.UNTYPED,
          icon: "rectangle-stack"
        },
        {
          label: "Type Collection",
          value: CollectionType.TYPED,
          icon: "cube"
        },
        {
          label: "Query Collection",
          value: CollectionType.QUERY,
          icon: "at-symbol"
        }
      ]}
      style={OptionSelectorStyle.TRAIN}
      labelProps={{
        ...formLabelConfig,
        label: "Type of collection"
      }}
      bind:selected={selectedType}
      size={Size.md}
    />
    <InlineInfoBanner {...generateInfo(selectedType)} />
    {#if selectedType === CollectionType.TYPED}
      <SwitchInput
        label={{
          ...formLabelConfig,
          label: "Extend an existing Typed collection",
          orientation: Orientation.Horizontal,
          tooltip: {
            body: "You can extend an existing type by adding additional properties on top. Editing the properties on base type will reflect in all extended types.",
            actionText: "Learn more about advanced filter query",
            action: "/kb/advanced-filter-query"
          }
        }}
        bind:checked={isSearchQuery}
      />

      <!-- {#if !isSearchQuery}
        <TypeSelector on:select={onTypeSelect} bind:selected={associatedType} />
      {/if} -->
      <!-- <TypeEditor /> -->
      <div class="flex flex-col gap-2">
        <FormControlLabel props={{ label: "Properties" }} />
        <PropertiesEditor />
      </div>
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
          collectionStore.create({
            label: title,
            type: selectedType,
            defaultLayout: selectedView,
            isStarred,
            associatedType,
            isSearchQuery
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
