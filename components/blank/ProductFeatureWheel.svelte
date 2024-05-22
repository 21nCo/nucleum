<script lang="ts">
  import OptionSelector from "$lib/tidy/elements/select/OptionSelector.svelte";
  import {
    FeatureWheelMode,
    type FeatureWheelGroup,
    type FeatureWheelContemporary
  } from "$lib/tidy/types/featureWheel.type";
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import FeatureWheel from "../featureWheel/FeatureWheel.svelte";
  import { memotronWheel } from "./memotronWheel";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import DropDown from "$lib/tidy/elements/dropdown/DropDown.svelte";
  import { OptionSelectorStyle } from "$lib/tidy/types/select.type";
  export let isShowInfoPanel = true;
  export let mode = FeatureWheelMode.DEFAULT;
  export let product: string = "memotron";
  export let features: FeatureWheelGroup[];
  export let filteredFeatures: FeatureWheelGroup[];
  let productContemporaries: string[];
  let contemporaryToCompare: string = "";
  onMount(() => {
    const modeSearchParam = $page.url.searchParams.get("mode");
    if (modeSearchParam) {
      mode = modeSearchParam as FeatureWheelMode;
    }
    const productSearchParam = $page.url.searchParams.get("product");
    if (productSearchParam) {
      product = productSearchParam;
    }
    const isShowInfoPanelSearchParam = $page.url.searchParams.get("info");
    if (isShowInfoPanelSearchParam) {
      isShowInfoPanel = isShowInfoPanelSearchParam === "true";
    }
  });

  $: refresh(product);

  function refresh(product: string) {
    if (product === "memotron") {
      features = memotronWheel;
    }
    productContemporaries = [
      ...new Set(
        features
          .map((group) => {
            return group.spokes
              .map((spoke) => {
                return spoke.contemporaries.map((contemporary) => {
                  if (typeof contemporary.label === "string") {
                    return [contemporary.label];
                  } else return [...contemporary.label];
                });
              })
              .flat(2);
          })
          .flat(2)
      )
    ];
    refreshFilter();
  }

  function refreshFilter() {
    console.log("refreshFilter", { contemporaryToCompare });
    if (!contemporaryToCompare) {
      filteredFeatures = features;
      return;
    }
    filteredFeatures = features.map((group) => {
      return {
        ...group,
        spokes: group.spokes.map((spoke) => {
          return {
            ...spoke,
            contemporaries: spoke.contemporaries.reduce(
              (acc: FeatureWheelContemporary[], contemporary) => {
                if (
                  (typeof contemporary.label === "string" &&
                    contemporary.label === contemporaryToCompare) ||
                  contemporary.label.includes(contemporaryToCompare)
                ) {
                  acc.push(
                    typeof contemporary.label === "string" &&
                      contemporary.label === contemporaryToCompare
                      ? contemporary
                      : {
                          ...contemporary,
                          label: contemporaryToCompare
                        }
                  );
                }
                return acc;
              },
              []
            )
          };
        })
      };
    });
    console.log("features after filter", { features });
  }
</script>

<div class="flex h-full w-full">
  {#if isShowInfoPanel}
    <div
      class="w-96 flex flex-col gap-10 items-center bg-bgs2 p-6 m-6 rounded-md"
    >
      <div
        class="relative flex flex-col bg-bgs1 gap-4 items-center justify-center rounded-full p-4 w-32 h-32"
      >
        <SubAtomLogo subatom={product} />
        <span class="absolute top-2/3 text-b4">
          {properCase(product)}
        </span>
      </div>
      <div class="flex flex-col w-full">
        <OptionSelector
          labelProps={{ label: "Mode" }}
          options={[
            { value: FeatureWheelMode.DEFAULT },

            { value: FeatureWheelMode.PROGRESS },
            {
              value: FeatureWheelMode.CONTEMPORARY
            }
          ]}
          style={OptionSelectorStyle.CHECK_CIRCLE}
          bind:selected={mode}
        />
      </div>
      {#if mode === FeatureWheelMode.CONTEMPORARY}
        <DropDown
          label={{ label: "Compare with contemporary" }}
          parentBackgroundIndex={2}
          items={productContemporaries.map((contemporary) => {
            return { label: contemporary, value: contemporary };
          })}
          bind:value={contemporaryToCompare}
          on:select={() => {
            mode = FeatureWheelMode.CONTEMPORARY;
            refreshFilter();
          }}
        />
      {/if}
    </div>
  {/if}
  {#if product && filteredFeatures}
    <div class="flex flex-col grow h-full bg-bgs1">
      {#key filteredFeatures}
        <FeatureWheel {mode} wheel={{ product, groups: filteredFeatures }} />
      {/key}
      <div class="flex justify-center w-full pb-12"></div>
    </div>
  {/if}
</div>
