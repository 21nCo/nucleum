<script lang="ts">
  import { IconVariant } from "../types/icon.type";
  export let variant: IconVariant = IconVariant.Outline;
</script>

<circle cx="26" cy="26" r="24.6" stroke="#2C70DD" stroke-width="2.8" />
<circle
  cx="26"
  cy="26"
  r="23"
  fill="#2C70DD"
  stroke={variant === IconVariant.Mini ? "" : "white"}
  stroke-width="1.5"
/>
