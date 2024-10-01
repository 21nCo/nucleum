<script lang="ts">
  import { dragDropList } from "$lib/client/actions/draggable.action";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
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
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let columns: TableColumn[] = [];
  export let data: any = [];
  export let actions: { action: "remove" | "rearrange"; index: number }[] = [];
  export let isStyled: boolean = false;
  export let addAction: string | undefined = undefined;
  export let id: string = "table";
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
      <div
        class={cn({
          "flex w-8": column.type === TableCellType.ACTION
        })}
      >
        {"label" in column ? column.label : ""}
      </div>
    {/each}
  </div>
  {#if isStyled}
    <Divider />
  {/if}
  <div
    class="flex flex-col px-3"
    use:dragDropList={{
      listId: id,
      draggedOverClass: "!border-t-aps1"
    }}
    on:rearrange
  >
    {#each data as row, i (row.id)}
      <div
        class="grid gap-8 py-2 text-left border-t-4 border-t-transparent"
        style="grid-template-columns: {columns
          .map((column) => `${resolveWidth(column)}fr`)
          .join(' ')}"
        draggable="true"
        data-index={i}
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
  {#if addAction}
    <div class="flex justify-center items-center p-3 w-full">
      <Button
        label={addAction}
        icon="plus"
        type={ButtonVariant.SECONDARY}
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          dispatch("add");
        }}
      />
    </div>
  {/if}
</div>
