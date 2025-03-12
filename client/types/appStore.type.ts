import type { IAction } from "$lib/client/types/action.type";
import type { InteractionMode } from "../components/settings/interactionMode/interactionMode.type";
import type { Product } from "./product.type";
export type AppStore = {
  product: Product;
  env: string;
  appData: any;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
  isDnDPageActive?: boolean;
  pageMenu?: string[];
  //TACO - dynamic actions
  dynamicBlocks?: IAction[];
  currentPath: string;
  isMenuHidden?: boolean;
  currentComponent?: IAction;
  sheetPath?: string;
  actions: IAction[];
  /**
   * Derived value from uiState. This is to avoid the dependency of appStore on uiState as appStore is used non-logged in user context.
   */
  interactionMode: InteractionMode;
};
