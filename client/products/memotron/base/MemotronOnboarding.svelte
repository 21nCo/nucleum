<script lang="ts">
  import Onboarding from "@nucleum/surfaces/onboarding/Onboarding.svelte";
  import type { IOnboardingConfig } from "@nucleum/surfaces/onboarding/onboarding.type";
  const config: IOnboardingConfig = {
    headline: "At last, your memory atlas!",
    subline: "One click to unlock your digital memory paradise. ✨🎉"
  };
</script>

<Onboarding {config} />
