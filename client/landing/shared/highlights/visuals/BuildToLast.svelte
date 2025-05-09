<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { staticUrl } from "../../store/shared.store";

  $: url = `${staticUrl}/images/landing/highlights/${$appearance.colorScheme.isDark ? "sunset-dark.gif" : "sunset.gif"}`;
</script>

<img src={url} alt="Build to Last" width="260" />
