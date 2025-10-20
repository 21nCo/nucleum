<script lang="ts">
  import DatePickerRow from "@21n/elements/datetime/DatePickerRow.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import CalendarColumn from "@21n/components/calendar/column/CalendarColumn.svelte";
  let selectedDate = new Date();
  let viewDate = new Date();
</script>

<main class="flex flex-col gap-6 w-full p-4 cw:pt-16">
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
</main>
