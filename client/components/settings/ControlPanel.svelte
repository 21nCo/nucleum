<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ControlPanelLayout from "./ControlPanelLayout.svelte";
</script>

<ControlPanelLayout>
  <EmptyStatusView
    subText="Please select an option from the left panel to get started"
  />
</ControlPanelLayout>
