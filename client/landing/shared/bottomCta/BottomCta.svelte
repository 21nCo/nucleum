<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  import Title from "@21n/landing/shared/Title.svelte";
  import { onMount } from "svelte";
  import type { IButton } from "@21n/landing/shared/landing.type";
  import view from "@21n/stores/view.store";
  let {
    deviceImages = [],
    body = "Sign up for a free trial and see how Pointron can help you get more done.",
    primaryAction,
    secondaryAction = undefined,
    title = undefined,
  }: {
    deviceImages?: string[];
    body?: string;
    primaryAction: IButton;
    secondaryAction?: IButton | undefined;
    title?: string | undefined;
  } = $props();

  let deviceImagesContainer: HTMLElement;
  let phoneImage: HTMLImageElement | null = null;
  let tabImage: HTMLImageElement | null = null;
  let laptopImage: HTMLImageElement | null = null;

  function bindImage(node: HTMLImageElement, type: string) {
    if (type === "phone") {
      phoneImage = node;
    } else if (type === "tab") {
      tabImage = node;
    } else if (type === "laptop") {
      laptopImage = node;
    }
    return {
      destroy() {
        if (type === "phone") phoneImage = null;
        if (type === "tab") tabImage = null;
        if (type === "laptop") laptopImage = null;
      }
    };
  }
  const deviceMultiplier = $view.isConstrainedWidth ? 1 : 10;

  onMount(() => {
    const handleScroll = () => {
      if (!deviceImagesContainer || !phoneImage || !tabImage) return;

      const rect = deviceImagesContainer.getBoundingClientRect();
      const viewportHeight =
        typeof window !== "undefined" ? window.innerHeight : 0;
      const distanceFromBottom = rect.top - viewportHeight;
      const distanceFromCenter =
        (rect.top + rect.bottom) / 2 - viewportHeight / 2;
      // console.log({ at: "handleScroll", distanceFromCenter });
      if (distanceFromCenter < 0) return;
      const multiplier = Math.min(
        Math.max(-distanceFromCenter / viewportHeight, -0.5),
        0.5
      );

      if (phoneImage) {
        phoneImage.style.transform = `translateX(${multiplier * -20 * deviceMultiplier}px)`;
        phoneImage.style.transition =
          "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
      }

      if (tabImage) {
        tabImage.style.transform = `translateX(${multiplier * 30 * deviceMultiplier}px)`;
        tabImage.style.transition =
          "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
      }

      // Scale factor for laptop - starts at 1.25 (larger) and scales down when entering viewport
      if (laptopImage) {
        // Start scale at 1.25 when fully out of viewport
        // Scale down to 1.0 as it enters and reaches center
        const laptopScaleFactor =
          distanceFromBottom > 0
            ? 1.15 // When fully out of viewport
            : Math.max(
                1,
                1.15 - (Math.abs(distanceFromBottom) / viewportHeight) * 0.25
              );

        laptopImage.style.transform = `scale(${laptopScaleFactor})`;
        laptopImage.style.transition =
          "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)";
      }
    };

    document.getElementById("main")?.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      document
        .getElementById("main")
        ?.removeEventListener("scroll", handleScroll);
    };
  });
</script>

<section class="flex flex-col gap-16 w-full">
  <div
    class={cn("flex flex-col gap-2 w-full", {
      "gap-3": title,
      "gap-20": !title
    })}
  >
    {#if title}
      <Title {title} />
    {:else if deviceImages.length > 0}
      {@const laptopImageSrc = deviceImages.find((image) =>
        image.includes("laptop")
      )}
      <div
        class="flex gap-2 relative mo:min-h-40 min-h-[490px] 2k:min-h-[700px] w-full"
        bind:this={deviceImagesContainer}
      >
        <div class={cn("relative inset-x-0 bottom-0 w-[60vw] mx-auto")}>
          <img
            src={laptopImageSrc}
            alt={laptopImageSrc}
            class="object-contain absolute bottom-0 z-20 transition-all ease-out duration-500"
            use:bindImage={"laptop"}
          />
          {#each deviceImages.filter((image) => !image.includes("laptop")) as image}
            <img
              src={image}
              alt={image}
              class={cn("object-contain transition-all ease-out duration-500", {
                "w-[25%] absolute bottom-0 mo:-right-5 -right-20 z-30":
                  image.includes("phone"),
                "w-7/10 absolute bottom-1 mo:-left-10 -left-20 z-10":
                  image.includes("tab")
              })}
              use:bindImage={image.includes("phone")
                ? "phone"
                : image.includes("tab")
                  ? "tab"
                  : ""}
            />
          {/each}
        </div>
      </div>
    {/if}
    <p class="text-lb2 text-fgs2 text-center">{body}</p>
  </div>
  <div class="flex flex-wrap w-full justify-center gap-2">
    <Button {...primaryAction} />
    {#if secondaryAction}
      <Button {...secondaryAction} />
    {/if}
  </div>
</section>
