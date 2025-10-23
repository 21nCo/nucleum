<script lang="ts">
  import Onboarding from "@21n/components/onboarding/Onboarding.svelte";
  import type { IOnboardingConfig } from "@21n/components/onboarding/onboarding.type";
  const config: IOnboardingConfig = {
    headline: "At last, your memory atlas!",
    subline: "One click to unlock your digital memory paradise. ✨🎉"
  };
</script>

<Onboarding {config} />
