<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "./SettingsAsPageLayout.svelte";
</script>

<SettingsAsPageLayout>
  <EmptyStatusView
    subText="Please select an option from the left panel to get started"
  />
</SettingsAsPageLayout>
