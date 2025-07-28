<script lang="ts">
  import { reorderList } from "$lib/client/actions/rearrange.action";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import {
    TableCellDefaultAction,
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "../button/Button.svelte";
  import Divider from "../Divider.svelte";
  import DropDown from "../dropdown/DropDown.svelte";
  import TextInput from "../input/TextInput.svelte";
  import FormLabelTooltip from "../text/formLabel/FormLabelTooltip.svelte";
  import Switch from "../toggle/Switch.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let columns: TableColumn[] = [];
  export let data: any = [];
  export let actions: { action: TableCellDefaultAction; index: number }[] = [];
  export let isStyled: boolean = false;
  export let addAction: string | undefined = undefined;
  export let id: string = "table";
  export let width: string = "";
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
    switch (action) {
      case TableCellDefaultAction.REORDER:
        return {
          key: "dots-six",
          type: TableCellType.ACTION
        };
      case TableCellDefaultAction.REMOVE:
        return {
          key: "cross",
          type: TableCellType.ACTION,
          actionTooltip: {
            body: "Remove"
          },
          action: (row: any) => {
            data = data?.filter((d) => d.id !== row.id);
          }
        };
      case TableCellDefaultAction.SELECT_ROW:
        return {
          key: "circle",
          type: TableCellType.ACTION,
          action: (row: any) => {
            dispatch("select", row);
          }
        };
      case TableCellDefaultAction.MULTI_SELECT_ROW:
        return {
          key: "check",
          type: TableCellType.ACTION,
          action: (row: any) => {
            dispatch("multiSelect", row);
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
  class={cn("flex flex-col w-full overflow-x-auto", width, {
    "rounded-md border border-brs2": isStyled
  })}
>
  <div
    class={cn("grid gap-8 text-fgs3 text-left text-b2 rounded-md p-3", {
      "bg-bgs2": isStyled
    })}
    style="grid-template-columns: {columns
      .map((column) => `${resolveWidth(column)}fr`)
      .join(' ')}"
  >
    {#each columns as column (column.key)}
      <div
        class={cn("flex items-center gap-1", {
          "w-8": column.type === TableCellType.ACTION
        })}
      >
        {"label" in column ? column.label : ""}
        {#if column.tooltip}
          <FormLabelTooltip info={column.tooltip} />
        {/if}
      </div>
    {/each}
  </div>
  {#if isStyled}
    <Divider />
  {/if}
  <div
    class="flex flex-col px-3"
    use:reorderList={{
      listId: id,
      draggedOverClass: "!outline-aps1",
      dragImage: "dragimage"
    }}
    on:reorder
  >
    {#each data as row, i (row.id)}
      <div
        class="grid gap-8 py-2 text-left outline outline-transparent rounded-md"
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
              tooltip={column.actionTooltip?.body}
              on:click={() => resolveAction(column, row)}
            />
          {:else if column.type === TableCellType.CUSTOM && "component" in column}
            {@const componentProps =
              typeof column.componentProps === "function"
                ? column.componentProps(row)
                : column.componentProps}
            {#if typeof column.component === "string"}
              <ComponentResolver
                path={column.component}
                params={{ row, ...componentProps }}
              />
            {:else}
              <svelte:component
                this={column.component}
                {row}
                {...componentProps}
              />
            {/if}
          {:else}
            <div>{row[column.key] ?? "NA"}</div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
  {#if addAction}
    <div class="flex justify--center items-center p-3 pt-6 w-full">
      <Button
        label={addAction}
        icon="plus"
        style={ButtonStyle.PLAIN}
        type={ButtonVariant.SECONDARY}
        on:click={() => {
          dispatch("add");
        }}
      />
    </div>
  {/if}
</div>
