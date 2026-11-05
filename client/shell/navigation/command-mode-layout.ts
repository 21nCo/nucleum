import { Embed } from "@nucleum/client/runtime/context.type";
import { InteractionMode } from "@21n/ui/elements/keyboard/interaction-mode.type";

/**
 * Whether the app shows the Home-only command mode layout, which renders an
 * opened resource page over the command home and has no split beside it.
 */
export function isCommandModeLayout(
  interactionMode: InteractionMode | undefined,
  embed: Embed | undefined
) {
  return interactionMode === InteractionMode.AGENT && embed !== Embed.HANDSET;
}
