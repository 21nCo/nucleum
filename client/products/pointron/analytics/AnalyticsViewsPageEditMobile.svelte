<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import AddNewButton from "$lib/client/elements/button/AddNewButton.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { debouncer } from "$lib/client/utils/utils";
  import { analyticsConfigStore } from "./analytics.store";
  import {
    onAddPageClicked,
    onPagelabelChange,
    onRemovePageClicked
  } from "./analytics.utils";

  $: pages =
    $analyticsConfigStore.pages.length > 0
      ? $analyticsConfigStore.pages?.map((page) => {
          return { label: page.label, value: page.id };
        })
      : [];
  let labelChangeEvent = new CustomEvent<{ value: string; label: string }>(
    "pageLabelChange",
    {
      detail: {
        value: "",
        label: ""
      }
    }
  );
  const debounceLabelChange = debouncer(
    () => onPagelabelChange(labelChangeEvent),
    500
  );
</script>

<div class="flex flex-col space-y-4 justify-center items-center">
  {#each pages as page}
    <div class="flex justify-center gap-1 border border-brs3">
      <button
        on:click
        class="hover:bg-bgs3 rounded-md h-full flex items-center"
      >
        <Icon icon="grab" size={Size.md} />
      </button>
      <div class="w-3/4 mr-2">
        <TextInput
          value={page.label}
          on:input={(e) => {
            labelChangeEvent.detail.label = e.detail.value;
            labelChangeEvent.detail.value = page.value;
            debounceLabelChange();
          }}
        />
      </div>
      <Button
        icon="cross"
        size={Size.sm}
        on:click={() => {
          const customEvt = new CustomEvent("pageRemove", {
            detail: page.value
          });
          onRemovePageClicked(customEvt);
        }}
      />
    </div>
  {/each}

  <!-- <AddNewButton
    class="border border-brs3 w-fit p-2 rounded"
    size={Size.sm}
    on:click={onAddPageClicked}
  /> -->
  <Button
    icon="plus"
    size={Size.sm}
    on:click={onAddPageClicked}
    label="Add new"
  />
</div>
