<script lang="ts">
  import Features from "@21n/landing/shared/features/Features.svelte";
  import type { IFeature } from "@21n/landing/shared/landing.type";

  const features: IFeature[] = [
    {
      image: "sunset.gif",
      feature: "Advanced focus",
      title: "Focus in more powerful ways",
      desc: "Focus the way you work with customisable focus sessions and break reminders.",
      visualRenderComponent: "ainative"
    },
    {
      image: "sunset.gif",
      feature: "Goals and tasks",
      title: "Infinite goal nesting",
      desc: "Create and track goals granularly using deep nesting and create tasks on atomic level.",
      visualRenderComponent: "ainative"
    },
    {
      image: "sunset.gif",
      feature: "Calendar",
      title: "Calendar",
      desc: "Track your time and goals in a calendar view. Add events to your calendar to stay on top of your schedule.",
      visualRenderComponent: "ainative",
      tutorialUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  ];
</script>

<Features
  {features}
  title="Explore focus in a whole new way"
  subtitle="One feature at a time"
/>
