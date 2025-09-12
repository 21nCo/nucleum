<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITestimonial } from "../landing.type";
  export let testimonial: ITestimonial;
</script>

<a
  class={cn(
    "flex flex-col gap-4 bg-bgs1 rounded-xl p-6 mo:w-full mo:min-w-full w-[27rem] min-w-[27rem] min-h-40 h-40 border border-brs3 hover:bg-bgs2 transition-colors duration-300",
    {
      "cursor-pointer": testimonial.link,
      "cursor-default": !testimonial.link
    }
  )}
  href={testimonial.link}
  target={testimonial.link?.startsWith("http") ? "_blank" : "_self"}
  rel={testimonial.link?.startsWith("http") ? "noopener noreferrer" : undefined}
  title={testimonial.link ? "Click to view testimonial" : ""}
>
  <div class="flex justify-between gap-2">
    <p class="text-lb2 font-semibold text-fgs2 text-left">{testimonial.name}</p>
    <!-- <p class="text-lb2 text-fgs2 text-left">{testimonial.source}</p> -->
    <SvgIcon icon={testimonial.source} isRenderRaw={true} />
  </div>
  <p class="text-lb2 text-fgs2 text-left text-wrap truncate">
    {testimonial.body}
  </p>
</a>
