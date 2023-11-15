<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Orientation } from "../types/direction.enum";
  import FormControlLabelWrapper from "../elements/input/FormControlLabelWrapper.svelte";
  export let value: string | undefined = undefined;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let hour: number | undefined = undefined;
  export let minute: number | undefined = undefined;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let isShowOnlyAfterCurrentTime: boolean = false;
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
    if (isShowOnlyAfterCurrentTime) {
      let now = new Date();
      hours = Array.from({ length: 24 - now.getHours() }, (_, i) =>
        (i + now.getHours()).toString().padStart(2, "0")
      );
      if (hour == now.getHours()) {
        minutes = Array.from({ length: 60 - now.getMinutes() }, (_, i) =>
          (i + now.getMinutes()).toString().padStart(2, "0")
        );
      } else {
        minutes = Array.from({ length: 60 }, (_, i) =>
          i.toString().padStart(2, "0")
        );
      }
    } else {
      hours = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, "0")
      );
      minutes = Array.from({ length: 60 }, (_, i) =>
        i.toString().padStart(2, "0")
      );
    }
  }

  function onChange() {
    value = `${hour}:${minute}`;
    dispatch("change", { value: hour + ":" + minute });
  }
</script>

<FormControlLabelWrapper {label} {info} orientation={labelOrientation}>
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
</FormControlLabelWrapper>
