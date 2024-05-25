<script lang="ts">
  import { CellVariant } from "$lib/client/types/cellVariant.enum";
  import type {
    TableColumnItem,
    TableRowItem
  } from "$lib/client/types/tableCell.type";
  import TableCell from "./TableCell.svelte";
  import RowWrapper from "./RowWrapper.svelte";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  export let columns: TableColumnItem[] = [];
  export let data: TableRowItem[] = [];
  export let width: string = "";
</script>

<div class="border border-bgs2 rounded-md">
  <div class="columns">
    {#if columns.length > 0}
      <RowWrapper variant={CellVariant.COLUMN} {width}>
        {#each columns as column}
          <TableCell variant={CellVariant.COLUMN} width={column.width}>
            {column.label}
          </TableCell>
        {/each}
      </RowWrapper>
    {/if}
  </div>
  <div class="data">
    {#if isValidArrayWithData(data)}
      {#each data as row}
        <RowWrapper variant={CellVariant.ROW} {width}>
          {#each columns as column}
            {#if row[column.key]}
              <TableCell variant={CellVariant.ROW} width={column.width}>
                {#if column.render}
                  {@html column.render(row[column.key])}
                {:else}
                  {row[column.key]}
                {/if}
              </TableCell>
            {:else if column.icon && column.action}
              <TableCell
                rowId={row.id}
                width={column.width}
                icon={column.icon}
                action={column.action}
                variant={CellVariant.ROW}
              />
            {:else}
              <TableCell variant={CellVariant.ROW} width={column.width} />
            {/if}
          {/each}
        </RowWrapper>
      {/each}
    {:else}
      <div
        class="w-full flex items-center justify-center p-6 text-fgs3 text-b3"
      >
        No data
      </div>
    {/if}
  </div>
</div>
