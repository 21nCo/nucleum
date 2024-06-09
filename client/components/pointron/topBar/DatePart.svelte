<script lang="ts">
  import { formatDate } from "$lib/client/utils/time.utils";

  let date = new Date();
  let formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
  let dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });
</script>

<div>{`${formatDate(date)} - ${dayOfWeek}`}</div>
