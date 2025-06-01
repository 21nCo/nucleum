<script lang="ts">
  export let value: string | number = "";
  export let placeholder: string = "Time";
</script>

<input
  type="time"
  bind:value
  on:change
  class="rounded-md outline-none p-2 bg-bgs2 focus:outline focus:outline-aps1 portrait:w-24 portrait:min-w-24 w-40 min-w-40 default-typeface"
  {placeholder}
/>
