<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import type {
    FeatureWheelMode,
    FeatureWheel
  } from "$lib/client/types/featureWheel.type";
  import FwTrial3 from "./FWTrial3.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import OptionSelectorPopover from "./optionSelector/OptionSelectorPopover.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  export let mode: FeatureWheelMode;
  export let wheel: FeatureWheel;
  export let groups: string[] | undefined = undefined;
  export let selectedSpoke: string | undefined = undefined;
  $: contemporariesList = wheel.groups
    .map((group) => group.spokes)
    .flat()
    .map((spoke) => spoke.contemporaries)
    .flat()
    .map((item) => (typeof item.label === "string" ? [item.label] : item.label))
    .flat()
    .filter((item) => item !== undefined)
    .filter((item, index, self) => self.indexOf(item) === index);
  $: console.log({ wheel, contemporariesList });
</script>

<div class="flex flex-col gap-8 w-full flex-1 max-h-[100vh] p-3">
  <div
    class="sticky top-0 flex justify-between items-center bg-bgs1 rounded-md border border-brs3 p-4 h-16 w-full"
  >
    <div>Wholesome chart</div>
    <div class="flex gap-2">
      <button
        use:popover={{
          content: OptionSelectorPopover,
          isRenderAsSibling: true,
          offsetInPx: 12,
          componentProps: {
            title: "Filter by category",
            options: wheel.groups.map((group) => ({
              label: group.label,
              value: group.label
            }))
          }
        }}
      >
        Filter by category
      </button>
      <button
        use:popover={{
          content: OptionSelectorPopover,
          isRenderAsSibling: true,
          offsetInPx: 12,
          componentProps: {
            title: "Compare with",
            options: contemporariesList.map((item) => ({
              label: properCase(item),
              value: item,
              icon: item
            })),
            isUseExternalLogoForIcon: true
          }
        }}
      >
        Compare with
      </button>
    </div>
    <button
      class="flex items-center text-b3 text-fgs2 p-2 rounded-md hover:bg-bgs2"
    >
      <SvgIcon icon="question" />
      How to use
    </button>
  </div>
  <FwTrial3 {mode} {wheel} />
</div>
