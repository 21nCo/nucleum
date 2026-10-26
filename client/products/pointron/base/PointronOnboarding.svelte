<script lang="ts">
  import Onboarding from "@nucleum/surfaces/onboarding/Onboarding.svelte";
  import type { IOnboardingConfig } from "@nucleum/surfaces/onboarding/onboarding.type";
  const config: IOnboardingConfig = {
    headline: "Welcome to your focus haven!",
    subline: "One click to reimagine your focus journey. ✨"
  };
</script>

<Onboarding {config} />
