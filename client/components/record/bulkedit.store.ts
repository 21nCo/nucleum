import type { IRecordId } from "@21n/types/data.type";
import { type IMultiSelectContext } from "@21n/components/flux/resourceStores/resource.type";
import {
  isSameResource,
  resourceInList
} from "@21n/components/flux/resourceStores/resource.utils";
import { stringify } from "@21n/shared-utils/json.utils";
import { writable, derived, get } from "svelte/store";

type ActionHandler = (
  ids: IRecordId[],
  action: string,
  data?: unknown
) => void | Promise<void>;

type SelectAllHandler = () => IRecordId[];

interface IBulkEditState {
  selectedIds: IRecordId[];
  context: IMultiSelectContext | null;
  actionHandler: ActionHandler | null;
  selectAllHandler: SelectAllHandler | null;
  subContext: string | undefined;
}

const initialState: IBulkEditState = {
  selectedIds: [],
  context: null,
  actionHandler: null,
  selectAllHandler: null,
  subContext: undefined
};

const state = writable<IBulkEditState>(initialState);

function isSameContext(
  currentContext: IMultiSelectContext | null,
  newContext: IMultiSelectContext
) {
  if (!currentContext) return false;
  return (
    stringify(currentContext, { isPreventReplacer: true }) ===
    stringify(newContext, { isPreventReplacer: true })
  );
}

export const bulkEditStore = {
  subscribe: derived(state, ($state) => $state.selectedIds).subscribe,

  count: derived(state, ($state) => $state.selectedIds.length),

  context: derived(state, ($state) => $state.context),

  subContext: derived(state, ($state) => $state.subContext),

  getState: () => get(state),

  activate(
    context: IMultiSelectContext,
    handlers?: {
      onAction?: ActionHandler;
      onSelectAll?: SelectAllHandler;
      subContext?: string;
    }
  ) {
    const currentState = get(state);
    if (!isSameContext(currentState.context, context)) {
      state.set({
        selectedIds: [],
        context,
        actionHandler: handlers?.onAction ?? null,
        selectAllHandler: handlers?.onSelectAll ?? null,
        subContext: handlers?.subContext
      });
    } else {
      state.update(($state) => ({
        ...$state,
        actionHandler: handlers?.onAction ?? null,
        selectAllHandler: handlers?.onSelectAll ?? null,
        subContext: handlers?.subContext
      }));
    }
  },

  reset() {
    state.update(($state) => ({ ...$state, selectedIds: [] }));
  },

  clear() {
    state.set(initialState);
  },

  select(ids: IRecordId[]) {
    state.update(($state) => ({
      ...$state,
      selectedIds: Array.isArray(ids) ? [...ids] : []
    }));
  },

  toggle(id: IRecordId) {
    state.update(($state) => {
      const isSelected = $state.selectedIds.some(resourceInList(id));
      return {
        ...$state,
        selectedIds: isSelected
          ? $state.selectedIds.filter((x) => !isSameResource(x, id))
          : [...$state.selectedIds, id]
      };
    });
  },

  async onAction(action: string, data?: unknown) {
    const currentState = get(state);
    if (currentState.actionHandler) {
      await currentState.actionHandler(currentState.selectedIds, action, data);
    }
  },

  onSelectAll() {
    const currentState = get(state);
    if (currentState.selectAllHandler) {
      const ids = currentState.selectAllHandler();
      if (Array.isArray(ids)) {
        this.select(ids);
      }
    }
  },

  clickHandler(id: IRecordId): boolean {
    const currentState = get(state);
    if (currentState.selectedIds.length > 0) {
      this.toggle(id);
      return true;
    }
    return false;
  },

  isActive(context: IMultiSelectContext): boolean {
    const currentState = get(state);
    return isSameContext(currentState.context, context);
  },

  matchesContext(context: IMultiSelectContext): boolean {
    return this.isActive(context);
  }
};

export type BulkEditStore = typeof bulkEditStore;
