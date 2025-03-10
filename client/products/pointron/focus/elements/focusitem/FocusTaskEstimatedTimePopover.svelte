<script lang="ts">
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let estimatedTime: number;
  export let onChange: (event: CustomEvent<number>) => void;
  if (!estimatedTime) estimatedTime = 0;
</script>

<div class="w-60 lg:w-96 z-50 text-fgs1">
  <div
    class="flex flex-col w-full gap-2 items-center bg-bgs1 border border-brs3 rounded-xl p-4 shadow-md"
  >
    <div class="w-full h-full">
      <DurationInput
        bind:value={estimatedTime}
        label={{
          label: "Estimated time",
          orientation: Orientation.Vertical
        }}
        on:change={onChange}
      />
    </div>
  </div>
</div>
