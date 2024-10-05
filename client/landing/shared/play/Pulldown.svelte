<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";

  let className: string = "";
  export { className as class };
</script>

<div class={cn("w-[26px] h-[48px] border border-fgs1 rounded-2xl", className)}>
  <div
    class="moveMe absolute top-[9px] left-[9px] w-[8px] h-[8px] bg-fgs1 rounded-full"
  ></div>
</div>

<style>
  @keyframes moveDownAndDisappear {
    100% {
      top: 9px;
      opacity: 0;
    }
    0% {
      top: 38px;
      opacity: 1;
    }
  }
  .moveMe {
    animation: moveDownAndDisappear 1s ease-out infinite;
  }
</style>
