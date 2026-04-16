<script lang="ts">
  import appearance from "@21n/stores/appearance.store";
  import view from "@21n/stores/view.store";
  import { Theme } from "@21n/types/appearance.type";
  import { cn } from "@21n/utils/ui.utils";
  export { className as class };

  const monoGradient = $derived(
    $appearance.theme === Theme.DARK
      ? "rgba(240, 248, 255, 0.2)"
      : "rgba(0,0,0, 0.1)"
  );
  const mainGradient = $derived(monoGradient);
  const gradientColor2 = $derived(monoGradient);

  let {
    dev_gradientBgVariant = "one-center",
  }: {
    dev_gradientBgVariant?: | "one-center"
    | "two-center-sides"
    | "two-corners"
    | "none";
  } = $props();
</script>

<!-- <div
      style="background: radial-gradient(circle at 50% 50%, rgba(39,61,38,00.5) 0%, rgba(39,61,38,0) 50%);"
      class="absolute w-[800px] h-[800px] -top-[180px] -left-[170px] z-0 pointer-events-none rounded-full"
    ></div>
    <div
      style="background: radial-gradient(circle at 50% 50%, rgba(39,61,38,0.5) 0%, rgba(39,61,38,0) 40%);"
      class="absolute w-[800px] h-[800px] -top-[100px] -right-[120px] z-0 pointer-events-none"
    ></div> -->

{#if dev_gradientBgVariant === "one-center" || $view.isPortrait}
  <div
    class={cn("absolute mo:w-[600px] mo:h-[600px] rounded-full opacity-60", {
      "w-[1100px] h-[1100px]": $appearance.theme === Theme.DARK,
      "w-[1000px] h-[1000px]": $appearance.theme !== Theme.DARK
    })}
    style="
background: radial-gradient(circle, {mainGradient} 0%, transparent 70%);
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
"
  ></div>
{:else if dev_gradientBgVariant === "two-center-sides"}
  <div
    class={cn("absolute rounded-full opacity-60", {
      "w-[1100px] h-[1100px]": $appearance.theme === Theme.DARK,
      "w-[1000px] h-[1000px]": $appearance.theme !== Theme.DARK
    })}
    style="
background: radial-gradient(circle, {mainGradient} 0%, transparent 70%);
top: 50%;
left: 25%;
transform: translate(-50%, -50%);
"
  ></div>

  <div
    class={cn("absolute rounded-full opacity-60", {
      "w-[900px] h-[900px]": $appearance.theme === Theme.DARK,
      "w-[800px] h-[800px]": $appearance.theme !== Theme.DARK
    })}
    style="
background: radial-gradient(circle, {gradientColor2} 0%, transparent 70%);
top: 50%;
left: 75%;
transform: translate(-50%, -50%);
"
  ></div>
{:else if dev_gradientBgVariant === "two-corners"}
  <div
    class="absolute w-[800px] h-[800px] rounded-full opacity-60"
    style="
    background: radial-gradient(circle, {mainGradient} 0%, transparent 70%);
    top: -400px;
    left: -200px;
  "
  ></div>

  <div
    class="absolute w-[600px] h-[600px] rounded-full opacity-60 overflow-clip"
    style="
    background: radial-gradient(circle, {gradientColor2} 0%, transparent 70%);
    bottom: -300px;
    right: -100px;
  "
  ></div>
{/if}
<!-- <BackgroundPattern mode={$appearance.theme} /> -->
{#if $appearance.theme === Theme.DARK}
  <!-- <div class="absolute inset-0 bg-black/10"></div> -->
{:else}
  <!-- <div class="absolute inset-0 backdrop-blur-xl"></div> -->
  <div class="absolute inset-0 bg-white/10"></div>
{/if}
