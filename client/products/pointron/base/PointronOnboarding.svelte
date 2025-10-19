<script lang="ts">
  import Onboarding from "@21n/components/onboarding/Onboarding.svelte";
  import type { IOnboardingConfig } from "@21n/components/onboarding/onboarding.type";
  const config: IOnboardingConfig = {
    headline: "Welcome to your focus haven!",
    subline: "One click to reimagine your focus journey. ✨"
  };
</script>

<Onboarding {config} />
