<script lang="ts">
  import EmptyStatus from "$lib/tidy/illustrations/EmptyStatus.svelte";
  import ControlPanelLayout from "./ControlPanelLayout.svelte";
</script>

<ControlPanelLayout>
  <div class="flex flex-col w-full h-full justify-center items-center">
    <EmptyStatus />
    <div class="text-fgs3 text-b2 text-center mt-4">
      Please select an option from the left panel to get started
    </div>
  </div>
</ControlPanelLayout>
