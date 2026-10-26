import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { Resource } from "@nucleum/datafn/resource.enum";
import CreateCollection from "@nucleum/features/collections/CreateCollection.svelte";
import PropertiesEditor from "@nucleum/features/collections/properties/PropertiesEditor.svelte";
import CollectionTitleLabelPart from "@nucleum/features/collections/thumbnail/CollectionThumbnailLabel.svelte";
import PropertyConfig from "@nucleum/features/collections/properties/propertyConfig/PropertyConfig.svelte";
import Collection from "@nucleum/features/collections/DummyCollection.svelte";

/** Commands owned by collections; assembled in application composition. */
export const collectionsCommands = {
  collection_create: {
    action: resourceAction(Resource.collection, ResourceActionType.CREATE),
    component: CreateCollection,
    label: "Create a new collection",
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  property_edit: {
    action: resourceAction(Resource.property, ResourceActionType.EDIT),
    component: PropertiesEditor,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        isOveriddenFooter: true
      }
    }
  },
  collection: {
    action: Resource.collection,
    type: ActionType.MODAL,
    component: Collection,
    resourceLabelRenderer: CollectionTitleLabelPart,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true,
        isShowBackButton: true
      }
    }
  },
  propertyconfig: {
    action: "propertyConfig",
    type: ActionType.INLINE,
    isMeta: true,
    component: PropertyConfig
  }
} satisfies Record<string, IAction | IAction[]>;
