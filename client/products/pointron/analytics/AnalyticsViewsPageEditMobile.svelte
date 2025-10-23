<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import AddNewButton from "@21n/elements/button/AddNewButton.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { debouncer } from "@21n/utils/utils";
  import { analyticsConfigStore } from "@21n/products/pointron/analytics/analytics.store";
  import {
    onAddPageClicked,
    onPagelabelChange,
    onRemovePageClicked
  } from "@21n/products/pointron/analytics/analytics.utils";

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
    <div class="flex justify-center gap-1 border border-brs3 rounded-md w-full">
      <!-- <button
        on:click
        class="hover:bg-bgs3 rounded-md h-full flex items-center"
      >
        <Icon icon="grab" size={Size.md} />
      </button> -->
      <div class="flex-1 mr-2 px-4 py-2">
        <TextInput
          value={page.label}
          style={InputStyle.PLAIN}
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
