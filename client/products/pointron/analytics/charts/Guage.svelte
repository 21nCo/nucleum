<script lang="ts">
  import CarbonChart from "$lib/client/components/charts/CarbonChart.svelte";
  import { ChartType } from "$lib/client/types/analytics.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import "@carbon/charts-svelte/styles.css";
  export let size: Size = Size.md;
  export let label: string;
  export let total: number | undefined = undefined;
  export let actual: number | undefined = undefined;
  export let percentage: number | undefined = undefined;
  export let guageType: string = "semi";
  let options = {
    width:
      guageType == "semi"
        ? size == Size.sm
          ? "70px"
          : "90px"
        : size == Size.sm
          ? "40px"
          : size == Size.md
            ? "100px"
            : "120px",
    height:
      guageType == "semi"
        ? size == Size.sm
          ? "25px"
          : "50px"
        : size == Size.sm
          ? "40px"
          : size === Size.md
            ? "100px"
            : "120px",
    arcWidth: size == Size.sm ? 4 : size === Size.md ? 8 : 10,
    valueFontSize: (val: any) => {
      return size == Size.sm ? 12 : size === Size.md ? 16 : 20;
    },
    // valueFontSize: (v: any) => {
    //         if (v < 10) {
    //           return 2;
    //         } else if (v < 100) {
    //           return 12;
    //         } else {
    //           return 2;
    //         }
    //       }
    deltaFontSize: (val: any) => {
      return size == Size.sm ? 12 : size === Size.md ? 12 : 36;
    },
    guageType
  };
  let data: any;
  initializeData();
  function initializeData() {
    try {
      data = [
        {
          group: "value",
          value: percentage ?? (actual && total ? (actual / total) * 100 : 0)
        }
      ];
    } catch (e) {
      console.error(e);
    }
  }
</script>

{#if data}
  <div class="flex flex-col max-h-40 gap-0.5">
    <CarbonChart type={ChartType.GUAGE} {data} additionalOptions={options} />
    <div class="flex flex-col justify-center items-center">
      {#if size != Size.sm}
        <div
          class={cn("text-fgs2", {
            "text-b3": size === Size.lg || size === Size.xl,
            "text-b4": size === Size.md
          })}
        >
          {formatSeconds(actual ?? 0)} / {formatSeconds(total ?? 0)}
        </div>
      {/if}
      <div
        class={cn({
          "text-b2": size === Size.md,
          "text-b3": size === Size.sm
        })}
      >
        {label ?? ""}
      </div>
    </div>
  </div>
{/if}
