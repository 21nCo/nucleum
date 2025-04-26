<script lang="ts">
  import type { ITestimonial } from "../Landing.types";
  export let testimonial: ITestimonial;
</script>

<div
  class="flex flex-col gap-4 bg-bgs1 rounded-xl p-6 w-[27rem] min-w-[27rem] min-h-40 h-40 border border-brs3"
>
  <div class="flex justify-between gap-2">
    <p class="text-lb2 font-semibold text-fgs2 text-left">{testimonial.name}</p>
    <p class="text-lb2 text-fgs2 text-left">{testimonial.source}</p>
  </div>
  <p class="text-lb2 text-fgs2 text-left">{testimonial.body}</p>
</div>
