<script lang="ts">
  import EarlyAccess from "@21n/components/EarlyAccess.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import Section from "@21n/landing/shared/Section.svelte";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  let {
    commingSoonSectionInputs,
  }: {
    commingSoonSectionInputs: any;
  } = $props();
  let email: string = "";
</script>

<div>
  <div class="flex flex-col items-center justify-center text-center">
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
        class={"text-h2 mo:text-base font-medium mo:font-normal leading-9 mo:leading-5 mo:w-[303px] mt-3 w-[994px]"}
      >
        {description}
      </p>
    {/if}
  </div>
  <EarlyAccess version="V2" />
</div>
