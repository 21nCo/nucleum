<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FormControlLabel from "../elements/text/FormControlLabel.svelte";
  export let value: string;
  export let label: string;
  export let info: string | undefined = undefined;
  let selectedHour: string = "00";
  let selectedMinute: string = "00";
  let hours: any[] = [];
  let minutes: any[] = [];
  let parts = value.split(":");
  selectedHour = parts[0];
  selectedMinute = parts[1];
  const dispatch = createEventDispatcher();
  $: {
    hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    minutes = Array.from({ length: 60 }, (_, i) =>
      i.toString().padStart(2, "0")
    );
  }
  function onChange() {
    value = selectedHour + ":" + selectedMinute;
    dispatch("change", { value: selectedHour + ":" + selectedMinute });
  }
</script>

<div class="flex flex-col gap-2">
  <FormControlLabel {label} {info} />
  <div class="flex items-center space-x-2">
    <select
      class="bg-bgs2 p-2 border rounded-lg"
      bind:value={selectedHour}
      on:change={onChange}
    >
      {#each hours as hour}
        <option value={hour}>{hour}</option>
      {/each}
    </select>

    <span class="text-gray-400">:</span>

    <select
      class="bg-bgs2 p-2 border rounded-lg"
      bind:value={selectedMinute}
      on:change={onChange}
    >
      {#each minutes as minute}
        <option value={minute}>{minute}</option>
      {/each}
    </select>
  </div>
</div>
