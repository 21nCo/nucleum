<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FormControlLabel from "../elements/text/FormControlLabel.svelte";
  export let value: string | undefined = undefined;
  export let label: string;
  export let info: string | undefined = undefined;
  export let hour: number | undefined = undefined;
  export let minute: number | undefined = undefined;
  let hours: any[] = [];
  let minutes: any[] = [];
  if (value) {
    let parts = value.split(":");
    hour = +parts[0];
    minute = +parts[1];
  } else if (!hour && !minute) {
    hour = 0;
    minute = 0;
  }
  const dispatch = createEventDispatcher();
  $: {
    hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    minutes = Array.from({ length: 60 }, (_, i) =>
      i.toString().padStart(2, "0")
    );
  }
  function onChange() {
    value = `${hour}:${minute}`;
    dispatch("change", { value: hour + ":" + minute });
  }
</script>

<div class="flex flex-col gap-2">
  <FormControlLabel {label} {info} />
  <div class="flex items-center space-x-2">
    <select
      class="bg-bgs2 p-2 border rounded-lg"
      bind:value={hour}
      on:change={onChange}
    >
      {#each hours as hour}
        <option value={+hour}>{hour}</option>
      {/each}
    </select>

    <span class="text-gray-400">:</span>

    <select
      class="bg-bgs2 p-2 border rounded-lg"
      bind:value={minute}
      on:change={onChange}
    >
      {#each minutes as minute}
        <option value={+minute}>{minute}</option>
      {/each}
    </select>
  </div>
</div>
