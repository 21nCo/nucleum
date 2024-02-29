<script lang="ts">
  import { formatDate } from "$lib/tidy/utils/time.utils";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
</script>

<!-- TODO - date picker when clicked on this date title - dotted underline for this title -->
<Text
  content={formatDate($selectedTimePeriod)}
  style={TextStyle.PANEL_HEADING}
/>
