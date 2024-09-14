<script lang="ts">
  import EarlyAccess from "$lib/client/components/EarlyAccess.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Section from "./Section.svelte";
  import Button from "./elements/Button.svelte";
  export let commingSoonSectionInputs: any;
  let email: string = "";
</script>

<Section>
  <div class={"flex flex-col items-center text-center mt-16"}>
    {#if commingSoonSectionInputs.title}
      {@const title = commingSoonSectionInputs.title}
      <div
        class={"text-[82px] mo:text-[26px] font-black leading-[98px] mo:leading-9 h-[196px] mo:h-[72px] w-[1110px] mo:w-[350px]"}
      >
        {title}
      </div>
    {/if}
    {#if commingSoonSectionInputs.label}
      {@const label = commingSoonSectionInputs.label}
      <p
        class={"text-h2 mo:text-base font-medium mo:font-normal leading-9 mo:leading-5 h-[72px] mo:h-[66px] mo:w-[303px] mt-4 w-[994px]"}
      >
        {label}
      </p>
    {/if}

    <EarlyAccess version="V2" />
  </div></Section
>
