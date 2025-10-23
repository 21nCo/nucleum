<script lang="ts">
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { InfoTextType } from "@21n/types/text.type";
  import { formatDatetime } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let deletedAt: string;
</script>

<InlineInfoBanner
  type={InfoTextType.ERROR}
  icon="trash"
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
