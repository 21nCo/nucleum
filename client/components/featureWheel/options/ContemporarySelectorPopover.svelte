<script lang="ts">
  import ExternalLogo from "@21n/branding/external/ExternalLogo.svelte";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import type {
    ISelectItem,
    ISelectValue
  } from "@21n/types/select.type";
  import { cn } from "@21n/utils/ui.utils";
  import Divider from "@21n/elements/Divider.svelte";

  export let title: string;
  export let options: ISelectItem[] = [];
  export let comingsoonOptions: ISelectItem[] = [];
  export let selected: ISelectValue[] | undefined = undefined;
  export let isUseExternalLogoForIcon: boolean = false;
  export let onSelect: (selected: ISelectValue[]) => void = () => {};
  export let onSeeComparisonReport: () => void = () => {};

  let searchTerm = "";
  let errorMessage: string | null = null;
  const MAX_SELECTIONS = 3;

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
          label="See report"
          type="primary"
          isShort={true}
          on:click={() => {
            onSeeComparisonReport();
          }}
        />
        <Button
          label="Clear"
          type="secondary"
          isShort={true}
          on:click={() => {
            selected = undefined;
            onSelect(selected ?? []);
            errorMessage = null;
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
  {#if errorMessage}
    <InlineErrorMessage bind:error={errorMessage} />
  {/if}
  <div class="flex flex-col gap-12 overflow-y-auto max-h-[30rem]">
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
              errorMessage = null;
            } else if ((selected ?? []).length >= MAX_SELECTIONS) {
              errorMessage = `You can only select up to ${MAX_SELECTIONS} items`;
            } else {
              selected = [...(selected ?? []), option.value];
            }
            onSelect(selected ?? []);
          }}
        >
          {#if isUseExternalLogoForIcon && typeof option.icon === "string"}
            {@const isUrl = option.icon.includes(".")}
            <div class="w-8 h-8 border border-brs3 rounded-full">
              <ExternalLogo
                provider={isUrl ? undefined : option.icon}
                url={isUrl ? option.icon : undefined}
                width={32}
                class="border border-brs3 rounded-full"
              />
            </div>
          {:else if typeof option.icon === "string"}
            <SvgIcon icon={option.icon} />
          {/if}
          <span class="text-b2 text-fgs2">{option.label ?? option.value}</span>
        </button>
      {/each}
    </div>
    {#if comingsoonOptions && comingsoonOptions.length > 0}
      <div class="flex flex-col gap-3">
        <Divider />
        <div class="text-b2 text-fgs2">Comparisions coming soon...</div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {#each comingsoonOptions as option}
            <div class="text-b2 text-fgs3 font-light">{option.label}</div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
