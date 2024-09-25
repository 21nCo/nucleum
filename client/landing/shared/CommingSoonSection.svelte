<script lang="ts">
  import EarlyAccess from "$lib/client/components/EarlyAccess.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Section from "./Section.svelte";
  import Button from "./elements/Button.svelte";
  export let commingSoonSectionInputs: any;
  let email: string = "";
</script>

<Section>
  <div class={"flex flex-col items-center text-center mt-16 -mb-12 mo:-mb-10"}>
    {#if commingSoonSectionInputs.label}
      {@const label = commingSoonSectionInputs.label}
      <div
        class={"text-[82px] mo:text-[26px] font-black leading-[98px] mo:leading-9  w-[1150px] mo:w-[350px]"}
      >
        {label}
      </div>
    {/if}
    {#if commingSoonSectionInputs.description}
      {@const description = commingSoonSectionInputs.description}
      <p
        class={"text-h2 mo:text-base font-medium mo:font-normal leading-9 mo:leading-5 mo:w-[303px] mt-4 w-[994px]"}
      >
        {description}
      </p>
    {/if}
  </div>
  <EarlyAccess version="V2" />
</Section>
