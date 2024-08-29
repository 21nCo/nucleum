<script lang="ts">
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import {
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "../button/Button.svelte";
  import Divider from "../Divider.svelte";
  import DropDown from "../dropdown/DropDown.svelte";
  import TextInput from "../input/TextInput.svelte";
  import Switch from "../toggle/Switch.svelte";
  export let columns: TableColumn[] = [];
  export let data: any = [];
  export let actions: { action: "remove" | "rearrange"; index: number }[] = [];
  export let isStyled: boolean = false;
  $: if (actions.length > 0) {
    actions.forEach((action) => {
      columns = [
        ...columns.slice(0, action.index),
        resolveDefaultAction(action.action),
        ...columns.slice(action.index)
      ].filter((column) => column);
    });
  }
  function resolveDefaultAction(action: string) {
    if (action === "rearrange") {
      return {
        key: "bars",
        type: TableCellType.ACTION,
        action: (row: any) => {
          /**
           * TODO - Rearrange action implementation
           */
          console.log("rearrange clicked", row);
        }
      };
    } else if (action === "remove") {
      return {
        key: "cross",
        type: TableCellType.ACTION,
        action: (row: any) => {
          console.log("remove clicked", row);
          data = data.filter((d) => d.id !== row.id);
        }
      };
    }
  }
  function resolveWidth(column: TableColumn) {
    return "width" in column
      ? column.width
      : column.type === TableCellType.ACTION
        ? 0.085
        : 1;
  }
  function resolveAction(column: TableColumn, row: any) {
    if (!("action" in column)) return;
    return column.action(row);
  }
</script>

<div
  class={cn("flex flex-col w-full", {
    "rounded-md border border-brs2": isStyled
  })}
>
  <div
    class={cn("grid gap-8 text-fgs3 text-left text-b2 rounded-md p-3 ", {
      "bg-bgs2": isStyled
    })}
    style="grid-template-columns: {columns
      .map((column) => `${resolveWidth(column)}fr`)
      .join(' ')}"
  >
    {#each columns as column (column.key)}
      <div>{"label" in column ? column.label : ""}</div>
    {/each}
  </div>
  {#if isStyled}
    <Divider />
  {/if}
  <div class="flex flex-col px-3">
    {#each data as row, i (row.id)}
      <div
        class="grid gap-8 py-2 text-left"
        style="grid-template-columns: {columns
          .map((column) => `${resolveWidth(column)}fr`)
          .join(' ')}"
      >
        {#each columns as column}
          {#if column.type === TableCellType.TEXT_INPUT}
            <TextInput
              bind:value={row[column.key]}
              placeholder={"placeholder" in column &&
              typeof column.placeholder === "string"
                ? column.placeholder
                : "placeholder" in column &&
                    column.placeholder instanceof Function
                  ? column.placeholder(row)
                  : ""}
            />
          {:else if column.type === TableCellType.TOGGLE}
            <Switch
              bind:on={row[column.key]}
              isDisabled={column.disabledCriteria?.(row) ?? false}
            />
          {:else if column.type === TableCellType.DROPDOWN && "options" in column}
            <!-- TODO: tooltip for dropdown group is not updating the position on scroll-->
            <DropDown
              items={column.options}
              groups={column.groups}
              bind:value={row[column.key]}
              style={column.style ?? InputStyle.BORDERED}
            />
          {:else if column.type === TableCellType.ACTION}
            <Button
              icon={column.key}
              on:click={() => resolveAction(column, row)}
            />
          {:else if column.type === TableCellType.CUSTOM && "component" in column}
            {#if typeof column.component === "string"}
              <ComponentResolver path={column.component} params={{ row }} />
            {:else}
              <svelte:component this={column.component} {row} />
            {/if}
          {:else}
            <div>{row[column.key] ?? "NA"}</div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>
