<script lang="ts">
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import { currentTime } from "@nucleum/shared-state/app-context/app.store";
  import { formatDatetime } from "@21n/shared-utils/datetime/date-formatting";

</script>
<div class="h-full px-1.5 text-b3 text-fgs2 flex items-center hover:bg-bgs3-striped">
    {formatDatetime($userPreferences, $currentTime)}
</div>
