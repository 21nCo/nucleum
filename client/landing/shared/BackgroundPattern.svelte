<!-- Background pattern -->
<script lang="ts">
  export let mode: "light" | "dark" = "light";
</script>

<div class="absolute inset-0 overflow-hidden">
  <div
    class="grid-overlay"
    class:light={mode === "light"}
    class:dark={mode === "dark"}
  />
  <div
    class="noise-overlay"
    class:light={mode === "light"}
    class:dark={mode === "dark"}
  />
</div>

<style>
  .noise-overlay {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    mix-blend-mode: overlay;
  }

  .noise-overlay.light {
    opacity: 0.1;
  }

  .noise-overlay.dark {
    opacity: 0.05;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background-size: 50px 50px;
    mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
  }

  .grid-overlay.light {
    background-image: linear-gradient(
        to right,
        rgba(0, 0, 0, 0.04) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
  }

  .grid-overlay.dark {
    background-image: linear-gradient(
        to right,
        rgba(255, 255, 255, 0.05) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  }
</style>
