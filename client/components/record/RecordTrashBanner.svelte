<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let deletedAt: string;
</script>

<InlineInfoBanner
  type={InfoTextType.ERROR}
  icon="ph:trash-light"
  content={"This resource was moved to trash on: *" +
    formatDatetime($userPreferences, new Date(deletedAt)) +
    "*"}
  action={{
    label: "Restore",
    callback: async () => {
      dispatch("restore");
    }
  }}
/>
