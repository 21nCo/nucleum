import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { helpCommands } from "@nucleum/surfaces/help/global-commands";
import { accountCommands } from "@nucleum/surfaces/account/global-commands";
import { shellCommands } from "@nucleum/shell/navigation/global-commands";
import { commandCommands } from "@nucleum/surfaces/commandBar/global-commands";
import { calendarCommands } from "@nucleum/features/calendar/global-commands";
import { memoryCommands } from "@nucleum/features/memory/markdown/global-commands";
import { recordsCommands } from "@nucleum/features/records/global-commands";
import { collectionsCommands } from "@nucleum/features/collections/global-commands";
import { spacesCommands } from "@nucleum/features/spaces/global-commands";
import { libraryCommands } from "@nucleum/surfaces/library/global-commands";
import { subscriptionCommands } from "@nucleum/surfaces/subscription/global-commands";
import { memotronCommands } from "@nucleum/products/memotron/search-commands";
import { pointronCommands } from "@nucleum/products/pointron/clock-commands";
import { settingsCommands } from "@nucleum/surfaces/settings/global-commands";

/** Assembles owner-defined commands in their existing lookup and display order. */
export const globalActions: IAction[] = [
  helpCommands.credits,
  helpCommands[404],
  helpCommands.error,
  helpCommands.offline,
  accountCommands.extenstion_login,
  accountCommands.signup,
  helpCommands.web,
  helpCommands.docs,
  helpCommands.docs_mobile,
  helpCommands.docs_docusaurus,
  helpCommands.tutorials,
  helpCommands.downloads,
  helpCommands.chat,
  helpCommands.call,
  helpCommands.faqs,
  helpCommands.changelog,
  helpCommands.roadmap,
  helpCommands.discord,
  helpCommands.opencollective,
  helpCommands.twitter,
  helpCommands.reddit,
  helpCommands.bluesky,
  helpCommands.instagram,
  helpCommands.git,
  helpCommands.privacy_policy,
  helpCommands.terms_of_service,
  helpCommands.terms_of_service_apple,
  helpCommands.feedback,
  helpCommands.requestfeature,
  helpCommands.report,
  shellCommands.mobile_toast,
  shellCommands.edit_mode,
  helpCommands.help,
  commandCommands.cmd,
  shellCommands.toggle_sidebar,
  helpCommands.troubleshoot,
  accountCommands.bootstrap,
  calendarCommands.calendar,
  commandCommands.activate_search_box,
  memoryCommands.markdown_shortcuts,
  memoryCommands.hot_keys,
  recordsCommands.cover_picker,
  helpCommands.dexie_console,
  helpCommands.signaldb_console,
  shellCommands.go_back,
  shellCommands.go_forward,
  collectionsCommands.collection_create,
  calendarCommands.event_create,
  collectionsCommands.property_edit,
  spacesCommands.space_create,
  ...libraryCommands.resourceMetadata,
  collectionsCommands.collection,
  calendarCommands.event,
  libraryCommands.collection_browse,
  libraryCommands.event_browse,
  libraryCommands.tag_browse,
  libraryCommands.add_item_to_collection,
  collectionsCommands.propertyconfig,
  subscriptionCommands.user_plan,
  subscriptionCommands.inactive_plan,
  subscriptionCommands.pay,
  subscriptionCommands.plan_onboarding,
  subscriptionCommands.user_billing,
  subscriptionCommands.user_plan_cancelation,
  libraryCommands.bulk_link,
  memotronCommands.global_search_modal,
  memotronCommands.search,
  pointronCommands.simpledigitalclock,
  calendarCommands.samplecalendaritemthumbnail,
  calendarCommands.focustimelineentry,
  calendarCommands.calendar_day,
  calendarCommands.history,
  settingsCommands.data_settings,
  calendarCommands.calendar_settings,
  libraryCommands.browse,
  settingsCommands.offline_status,
  shellCommands.navigator,
  calendarCommands.today,
  shellCommands.rhombus
];
