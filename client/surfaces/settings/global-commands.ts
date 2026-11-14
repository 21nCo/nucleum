import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { Action } from "@nucleum/client/config/action.enum";
import { Embed } from "@nucleum/client/runtime/context.type";
import DataSettings from "@nucleum/surfaces/settings/DataSettings.svelte";
import OfflineStatusModal from "@nucleum/surfaces/settings/sync/OfflineStatusModal.svelte";
import { get } from "svelte/store";
import {
  SWITCH_APPEARANCE_PROFILE_ACTION,
  appearanceProfiles,
  applyAppearanceProfile,
  type AppearanceProfile
} from "@nucleum/shared-state/appearance/appearance-profiles";

/** Commands owned by settings; assembled in application composition. */
export const settingsCommands = {
  data_settings: {
    action: Action.DATA_SETTINGS,
    type: ActionType.MODAL,
    label: "Data Settings",
    icon: "database",
    component: DataSettings,
    hideContext: [Embed.HANDSET],
    modalParams: {
      title: "Data Settings",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  switch_appearance_profile: {
    action: SWITCH_APPEARANCE_PROFILE_ACTION,
    type: ActionType.SEARCH_CMD,
    label: "Switch appearance profile",
    cmdLabel: "Switch appearance profile",
    icon: "palette",
    searchActionParams: {
      placeholder: "select an appearance profile",
      searchCallback: async (search: string) => {
        const query = search.trim().toLowerCase();
        return get(appearanceProfiles)
          .profiles.filter((profile) =>
            profile.name.toLowerCase().includes(query)
          )
          .map((profile) => ({ ...profile, label: profile.name }));
      },
      callback: (profile: AppearanceProfile) => {
        applyAppearanceProfile(profile.id);
      }
    }
  },
  offline_status: {
    action: Action.OFFLINE_STATUS,
    type: ActionType.MODAL,
    component: OfflineStatusModal,
    modalParams: {
      layout: {
        size: Size.sm,
        isOveriddenFooter: true
      }
    }
  }
} satisfies Record<string, IAction | IAction[]>;
