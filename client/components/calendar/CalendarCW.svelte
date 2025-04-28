<script lang="ts">
  import DatePickerRow from "$lib/client/elements/datetime/DatePickerRow.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import CalendarColumn from "./column/CalendarColumn.svelte";
  let selectedDate = new Date();
  let viewDate = new Date();
</script>

<div class="flex flex-col gap-6 w-full p-4">
  <!-- <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Calendar" /> -->
  <!-- <DatePickerRow
    density={Size.lg}
    isDateMode={true}
    date={selectedDate}
    on:pageChange={(e) => {
      console.log({ e });
      viewDate = e.detail.viewDate;
    }}
    on:change={(e) => {
      selectedDate = e.detail;
      viewDate = selectedDate;
    }}
  /> -->
  <div class="flex flex-grow w-full">
    {#key selectedDate}
      <CalendarColumn
        scale={TimeScaleUnit.DAY}
        date={selectedDate}
        isCwContext={true}
        on:dateChange={(e) => {
          if (e.detail) selectedDate = e.detail;
        }}
      />
    {/key}
  </div>
</div>
