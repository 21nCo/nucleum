<script lang="ts">
  import context from "@21n/stores/context.store";
  import { Action } from "@21n/types/action.enum";
  import { OperatingSystem } from "@21n/types/context.type";
  import Link from "@21n/elements/text/Link.svelte";
  export let pretext: string = "By signing up, you agree to our";
  $: tosLink =
    $context.isEmbed &&
    ($context.os === OperatingSystem.IOS ||
      $context.os === OperatingSystem.MACOS)
      ? Action.TERMS_OF_SERVICE_APPLE
      : Action.TERMS_OF_SERVICE;
</script>

<footer class="px-8">
  <div class="text-b3 text-fgs2 text-center">
    {pretext}
    <Link href={tosLink} label="Terms of Service" />
    and
    <Link href={Action.PRIVACY_POLICY} label="Privacy Policy" />.
  </div>
</footer>
