<script lang="ts">
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { elementHaptic as haptic } from "@21n/ui/environment/element-environment.store";
  import BackButton from "@nucleum/shell/navigation/components/BackButton.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
    let {
    label,
    textStyle = TextStyle.PANEL_HEADING,
    backCallback,
    height = "h-16",
  }: {
    label: string;
    textStyle?: TextStyle;
    backCallback: () => void;
    height?: string;
  } = $props();

  
  
  
</script>

<div class="flex justify-between items-center w-full {height}">
  <BackButton
    isPreventDefault={true}
    onclick={() => {
      haptic();
      backCallback();
    }}
  />
  <Text style={textStyle} content={label} />
  <div class="w-12 opacity-0"></div>
</div>
