<script lang="ts">
  import appearance from "@21n/stores/appearance.store";
  import { staticUrl } from "@21n/landing/shared/store/shared.store";

  $: url = `${staticUrl}/images/landing/highlights/${$appearance.colorScheme.isDark ? "sunset-dark.gif" : "sunset.gif"}`;
</script>

<img src={url} alt="Build to Last" width="260" />
