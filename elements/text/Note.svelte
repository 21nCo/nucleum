<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { bg } from "$lib/tidy/utils/theme.utils";
  import Icon from "../Icon.svelte";

  export let note: string;
</script>

<div
  class="flex text-fgs3 items-center text-b3 gap-2 text-left p-4 {bg(
    $userPreferences.theme,
    1
  )} rounded-md w-full"
>
  <Icon icon="info" size={Size.sm} />
  <!-- <strong>Note</strong> -->
  {note}
</div>
