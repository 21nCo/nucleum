<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import Button from "$lib/client/landing/shared/elements/Button.svelte";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";

  export let title: string;
  export let options: ISelectItem[] = [];
  export let selected: ISelectValue[] | undefined = undefined;
  export let isUseExternalLogoForIcon: boolean = false;
  export let onSelect: (selected: ISelectValue[]) => void = () => {};

  let searchTerm = "";
  $: filteredOptions = searchTerm
    ? options.filter(
        (option) =>
          option.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.value
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
    : options;
</script>

<div
  class="flex flex-col gap-4 bg-bgs1 rounded-md border border-brs3 p-4 mo:max-w-full max-w-[50rem] w-[30rem] cw:w-full max-h-full"
>
  <div class="flex w-full justify-between h-8">
    <span>
      {title ?? ""}
    </span>
    <span class="text-b3 text-fgs2 flex gap-2">
      {#if selected && selected.length > 0}
        <Button
          label="Clear selection"
          type="secondary"
          isShort={true}
          on:click={() => {
            selected = undefined;
          }}
        />
      {/if}
    </span>
  </div>
  <div>
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Search..."
      class="w-full p-2 rounded-md border border-brs3 bg-bgs1 focus:outline-none focus:border-aps1"
    />
  </div>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
    {#each filteredOptions as option}
      <button
        class={cn(
          "flex flex-col min-h-16 items-center justify-center gap-2 p-2 rounded-md border",
          {
            "border-aps1 bg-aps3 text-aps1": selected?.includes(option.value),
            "border-brs3 hover:bg-bgs2": !selected?.includes(option.value)
          }
        )}
        on:click={() => {
          if (selected?.includes(option.value)) {
            selected = selected?.filter((value) => value !== option.value);
          } else {
            selected = [...(selected ?? []), option.value];
          }
          onSelect(selected);
        }}
      >
        {#if isUseExternalLogoForIcon && typeof option.icon === "string"}
          <ExternalLogo provider={option.icon} />
        {:else if typeof option.icon === "string"}
          <SvgIcon icon={option.icon} />
        {/if}
        <span>{option.label ?? option.value}</span>
      </button>
    {/each}
  </div>
</div>
