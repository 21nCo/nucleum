<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormLabelTooltip from "$lib/client/elements/text/formLabel/FormLabelTooltip.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import type {
    DropdownGroup,
    DropdownItem
  } from "$lib/client/types/dropdownItem.type";
  export let groups: DropdownGroup[];
  export let options: DropdownItem[];
  export let onSelect: (e: string) => void;
</script>

<div
  class="flex flex-col gap-3 bg-bgs1 border border-brs2 rounded-md py-4 px-1 w-60 max-h-full overflow-y-auto"
>
  {#each groups as group}
    {@const groupOptions = options.filter(
      (option) => option.groupId === group.id
    )}
    <div>
      <span class="flex items-center gap-1 px-3">
        <Text content={group.label} style={TextStyle.SECTION_HEADING_SMALL} />
        {#if group.info}
          <FormLabelTooltip info={group.info} />
        {/if}
      </span>
      {#each groupOptions as option}
        <button
          class={cn(
            "flex items-center justify-between gap-2 px-3 py-2 rounded-md w-full",
            {
              "text-fgs3 cursor-not-allowed": option.isDisabled,
              "hover:bg-bgs2": !option.isDisabled
            }
          )}
          on:click={() => {
            if (option.isDisabled) return;
            onSelect(option.value);
          }}
        >
          <span class="flex items-center gap-2">
            {#if option.icon && typeof option.icon === "string"}
              <Icon icon={option.icon} size={Size.sm} />
            {/if}
            <span class="whitespace-nowrap text-b2">
              {option.label}
            </span>
          </span>
          {#if option.badge}
            <Badge text={option.badge} />
          {/if}
        </button>
      {/each}
    </div>
  {/each}
</div>
