<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { isProductsPage } from "./store/shared.store";

  export let title: string;
</script>

<p
  class={cn(
    !$isProductsPage &&
      "w-[800px] mo:w-[342px] text-center text-[72px] mo:text-[29px] font-black leading-[98px] mo:leading-10",
    $isProductsPage &&
      "w-[900px] mo:w-[342px] text-center text-[62px] mo:text-[24px] font-black leading-[85px] mo:leading-7"
  )}
>
  {title}
</p>
