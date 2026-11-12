<script lang="ts">
  import { AppStyle } from "@21n/theme/app-style";
  import type { ColorScheme } from "@21n/theme/appearance.type";
  import colorSchemes from "@21n/theme/colorschemes.json";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { popover } from "@21n/ui/actions/popover.action";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { cn } from "@21n/ui/environment/presentation";
  import type { AppearanceProfile } from "@nucleum/shared-state/appearance/appearance-profiles";
  import AppearanceProfileNameEditor from "@nucleum/surfaces/settings/appearance/AppearanceProfileNameEditor.svelte";
  import { resolveAppearanceProfileSummary } from "@nucleum/surfaces/settings/appearance/appearance-profile-summary";

  let {
    profile,
    isApplied,
    isEditing = false,
    onApply,
    onRename = undefined,
    onDelete = undefined,
    onSubmitName = undefined,
    onCancelEdit = undefined
  }: {
    profile: AppearanceProfile;
    isApplied: boolean;
    isEditing?: boolean;
    onApply: () => void;
    onRename?: (() => void) | undefined;
    onDelete?: (() => void) | undefined;
    onSubmitName?: ((name: string) => void) | undefined;
    onCancelEdit?: (() => void) | undefined;
  } = $props();

  const schemes = colorSchemes as unknown as ColorScheme[];
  let menuKey = $state(0);

  function findScheme(id: string) {
    return schemes.find((entry) => String(entry.id) === String(id));
  }

  function swatch(scheme: ColorScheme | undefined) {
    return [scheme?.colors.bgs2 ?? "", scheme?.colors.aps1 ?? ""];
  }

  const lightScheme = $derived(findScheme(profile.settings.lightColorSchemeId));
  const darkScheme = $derived(findScheme(profile.settings.darkColorSchemeId));
  const light = $derived(swatch(lightScheme));
  const dark = $derived(swatch(darkScheme));
  const style = $derived(profile.settings.appStyle ?? AppStyle.Boxed);
  const summary = $derived(
    resolveAppearanceProfileSummary({
      lightLabel: lightScheme?.label,
      darkLabel: darkScheme?.label,
      appStyle: style,
      typeface: profile.settings.typeface
    })
  );
  const hasMenu = $derived(!profile.isBuiltIn && (onRename || onDelete));

  function closeMenuThen(action: (() => void) | undefined) {
    menuKey += 1;
    action?.();
  }

  const menu = $derived({
    placement: Placement.BottomRight,
    content: ContextMenu,
    triggerMethod: [PopoverTriggerMethod.CLICK],
    componentProps: {
      size: Size.sm,
      menuResolver: () => [
        {
          group: "all",
          items: [
            {
              label: "Rename",
              value: "rename",
              icon: "pencil",
              callback: async () => closeMenuThen(onRename)
            },
            {
              label: "Delete",
              value: "delete",
              icon: "trash",
              callback: async () => closeMenuThen(onDelete)
            }
          ]
        }
      ]
    },
    id: `appearance-profile-menu-${profile.id}`
  });
</script>

{#snippet swatchPreview()}
  <div
    class={cn("flex w-14 h-8 shrink-0 overflow-hidden border border-brs3", {
      rounded: style === AppStyle.Boxed,
      "rounded-md": style === AppStyle.Semi,
      "rounded-xl": style === AppStyle.Rounded
    })}
    aria-hidden="true"
  >
    {#each [light, dark] as colors}
      <div class="flex flex-1">
        <div class="flex-1" style:background-color={colors[0]}></div>
        <div class="w-1.5" style:background-color={colors[1]}></div>
      </div>
    {/each}
  </div>
{/snippet}

<div
  class={cn(
    "flex items-center w-full rounded-md border border-brs3 transition-colors",
    {
      "bg-bgs3 ring-2 ring-inset ring-aps1": isApplied,
      "bg-bgs2 hover:bg-bgs3": !isApplied
    }
  )}
>
  {#if isEditing}
    <div class="flex items-center flex-1 min-w-0 gap-3 p-2">
      {@render swatchPreview()}
      <AppearanceProfileNameEditor
        initialName={profile.name}
        onSubmit={(name) => onSubmitName?.(name)}
        onCancel={() => onCancelEdit?.()}
      />
    </div>
  {:else}
    <button
      type="button"
      aria-pressed={isApplied}
      data-selected={isApplied}
      data-testid="appearance-profile-option"
      data-profile-id={profile.id}
      title={profile.name}
      class="flex items-center flex-1 min-w-0 gap-3 p-2 text-left"
      onclick={onApply}
    >
      {@render swatchPreview()}
      <div class="flex flex-col min-w-0">
        <span class="truncate text-b2 text-fgs1">{profile.name}</span>
        <span
          class="truncate text-b3 text-fgs3"
          data-testid="appearance-profile-summary"
        >
          {summary}
        </span>
      </div>
    </button>
  {/if}
  {#if hasMenu && !isEditing}
    {#key menuKey}
      <button
        type="button"
        aria-label={`More actions for ${profile.name}`}
        data-testid="appearance-profile-menu"
        class="flex items-center justify-center w-8 h-8 mr-2 shrink-0 rounded-md text-fgs3 hover:bg-bgs1 hover:text-fgs1"
        use:popover={menu}
      >
        <Icon icon="ellipsis" size={Size.sm} />
      </button>
    {/key}
  {/if}
</div>
