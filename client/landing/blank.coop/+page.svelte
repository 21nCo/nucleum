<script lang="ts">
  import GridItemsSection from "../shared/grid/GridItemsSection.svelte";
  import HeroSection from "../shared/HeroSection.svelte";
  import type { IHeroInputs, IItem } from "../shared/Landing.types";

  let heroInputs: IHeroInputs = {
    title: "Incubating change",
    label:
      "An Alternative organizational structure for futuristic technology development organizations"
  };

  let corePrinciples: IItem[] = [
    {
      icon: "circular-placeholder",
      title: "Cooperative model",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment."
    },
    {
      icon: "circular-placeholder",
      title: "Incubator model",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment."
    },
    {
      icon: "circular-placeholder",
      title: "Remote First",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment."
    },
    {
      icon: "circular-placeholder",
      title: "Enviroment conscious",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment."
    },
    {
      icon: "circular-placeholder",
      title: "Equity and Independence",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment."
    },
    {
      icon: "circular-placeholder",
      title: "Recloud",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment."
    }
  ];
</script>

<HeroSection {heroInputs} />

<GridItemsSection items={corePrinciples} title="Our Core principles" />
