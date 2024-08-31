<script lang="ts">
  import Footer from "../shared/footer/Footer.svelte";
  import GridItemsSection from "../shared/grid/GridItemsSection.svelte";
  import HeroSection from "../shared/HeroSection.svelte";
  import type {
    IHeroInputs,
    IGridItem,
    ITileItem,
    IListItem
  } from "../shared/Landing.types";
  import TileItemsSection from "../shared/tile/TileItemsSection.svelte";

  let heroInputs: IHeroInputs = {
    title: "Incubating change",
    label:
      "An Alternative organizational structure for futuristic technology development organizations"
  };

  let corePrinciples: IGridItem[] = [
    {
      icon: "circular-placeholder",
      title: "Cooperative model",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment.",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      icon: "circular-placeholder",
      title: "Incubator model",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment.",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      icon: "circular-placeholder",
      title: "Remote First",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment.",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      icon: "circular-placeholder",
      title: "Enviroment conscious",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment.",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      icon: "circular-placeholder",
      title: "Equity and Independence",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment.",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      icon: "circular-placeholder",
      title: "Recloud",
      description:
        "A cooperative is a member-driven organization focused on mutual benefit and democratic control, guided by principles of inclusivity, shared ownership, and community commitment.",
      href: "https://docs.blanklabs.org/soft"
    }
  ];
  let currentProducts: ITileItem[] = [
    {
      image: "pointron-product-image",
      title: "Pointron",
      description: "The one focus time tracker that you will ever need",
      href: "https://app.pointron.io"
    },
    {
      image: "pointron-product-image",
      title: "Memotron",
      description: "The kind of second brain that you are waiting for",
      href: "https://app.memotron.io"
    }
  ];

  let transformedProducts: IListItem[] = currentProducts.map((product) => ({
    title: product.title,
    href: product.href || "/"
  }));

  let products: ITileItem[] = [
    ...currentProducts,
    {
      title: "Recloud",
      description: "Next generation cloud and authentication provider",
      href: "https:/app.gathery.io"
    },
    {
      title: "Selftron",
      description: "The best body-mind tracking and analytics ever built"
    }
  ];
</script>

<HeroSection {heroInputs} />

<GridItemsSection items={corePrinciples} title="Our Core principles" />

<TileItemsSection items={products} title="Our products" />

<Footer products={transformedProducts} />
