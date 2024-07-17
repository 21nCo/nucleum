import {
  activeResourceFilter,
  generateUID,
  nonTrashFilter
} from "$lib/client/utils/utils";
import { get, writable } from "svelte/store";
import type {
  IGoal,
  PointGoalDbType,
  QuickFocusItem,
  IQuickFocusItemStore
} from "$lib/client/types/pointron/goal.type";
import { GoalPersistence } from "./goal.persistence";
import { prefixTable } from "$lib/shared/utils/text.utils";
import { Item } from "$lib/client/types/item.enum";
import {
  deepCopy,
  isValidArray,
  isValidArrayWithData,
  objIsEmpty,
  shallowDiff
} from "$lib/client/utils/obj.utils";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import { toasts } from "$lib/client/stores/notification.store";
import view from "$lib/client/stores/view.store";
import {
  DependencySyncType,
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { dataManager } from "$lib/client/persistence/dataManager";
import { TagId } from "$lib/client/types/pointron/tagId.enum";
import { logger } from "$lib/client/stores/log.store";
import { Persistence } from "$lib/client/persistence/persistence";
import { ResourceFIRStore } from "$lib/client/stores/resource.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import { AlertType } from "$lib/client/types/notification.type";

export const seedGoal: IGoal = {
  id: generateUID(),
  label: "",
  color: undefined,
  isArchived: false,
  isCompleted: false,
  isFavorite: false,
  isPinnedForQuickStart: false,
  subGoalCount: 0,
  subGoals: [],
  tags: [],
  archivedSubGoalCount: 0,
  parent: {
    hierarchy: []
  },
  analytics: {
    periods: [
      {
        scale: TimeScale.DAYS,
        value: {
          type: TimePeriodType.RELATIVE,
          param: -7
        }
      }
    ]
  }
};

export const goalEditErrorMessage = writable("");

function filterGoals(
  allItems: (IGoal | QuickFocusItem)[],
  filters: { tag?: TagId | string; searchText?: string }
) {
  let filteredGoals = allItems.filter(nonTrashFilter);
  if (filters.tag) {
    if (filters.tag === TagId.ALL) {
      filteredGoals = allItems;
    } else if (filters.tag === TagId.FAVORITES) {
      filteredGoals = allItems.filter((x) => x.isFavorite);
    } else {
      filteredGoals = allItems.filter((x) =>
        x.tags?.includes(filters.tag as string)
      );
    }
  }
  if (filters.searchText) {
    filteredGoals = filteredGoals.filter((x) =>
      x.label
        .toLowerCase()
        .includes((filters.searchText as string).toLowerCase())
    );
  }
  return filteredGoals;
}

const defaultFilter = (items: IGoal[]) => {
  return filter(items, {
    tag: TagId.ALL,
    searchText: "",
    isArchived: false
  });
};
const filter = (
  items: IGoal[],
  filters: {
    tag?: TagId | string;
    searchText?: string;
    isArchived?: boolean;
  }
) => {
  let filteredGoals = filterGoals(items, filters);
  let filtered = (filteredGoals as IGoal[])
    .filter(nonTrashFilter)
    .filter(
      (x) =>
        ((filters.isArchived && x.isArchived) || !x.isArchived) &&
        ((filters.tag === TagId.ALL &&
          !filters.searchText &&
          x.parent?.hierarchy?.length === 0) ||
          filters.tag !== TagId.ALL ||
          filters.searchText)
    );
  return filtered;
};

/**
 * here we are assuming that the there can only be one level(direct level) of nesting in goals(as `subGoals` property), since as of the time writing this function there is only one level of nesting in goals, possible in the app, through the add sub goal feature, for a specific goal
 * @param goal
 */
function flattenSubGoalsAsGoals(
  goal: Partial<IGoal> & Pick<IGoal, "id" | "label" | "subGoals">
) {
  let goalForDB: PointGoalDbType = {
    id: prefixTable(goal.id, Item.PointGoal),
    label: goal.label,
    description: goal.description,
    tags: goal.tags,
    parent: goal?.parent
      ? goal.parent.hierarchy.map(({ id }: { id: string }) => id)
      : [],
    isArchived: goal.isArchived,
    isPinnedForQuickStart: goal.isPinnedForQuickStart,
    isFavorite: goal.isFavorite,
    isCompleted: goal.isCompleted,
    color: goal.color,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  };
  let flattenedSubGoals: PointGoalDbType[] = [];
  if (goal.subGoals.length === 0) {
    return goalForDB;
  }
  const parentForSubGoals =
    goal?.parent && goal.id
      ? [
          ...goal.parent.hierarchy.map(({ id }: { id: string }) => {
            return prefixTable(id, Item.PointGoal);
          }),
          prefixTable(goal.id, Item.PointGoal)
        ]
      : [prefixTable(goal.id, Item.PointGoal)];
  goal.subGoals.forEach((subGoal) => {
    let subGoalAsGoal: PointGoalDbType = {
      id: subGoal.id,
      label: subGoal.label,
      parent: parentForSubGoals,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
    flattenedSubGoals.push(subGoalAsGoal);
  });

  return [goalForDB, ...flattenedSubGoals];
}

class GoalStore extends ResourceFIRStore<IGoal> {
  constructor() {
    super(Item.PointGoal, defaultFilter, {
      refreshQuery: "fn::pointron::goal::fetchAll();"
    });
  }
  filter(filters: {
    tag?: TagId | string;
    searchText?: string;
    isArchived?: boolean;
  }) {
    this.update((store) => {
      store.filtered = filter(store.items, filters);
      return store;
    });
    return true;
  }
  loader(data: any) {
    if (data) super.loader({ items: data });
  }
  resolveGoal(id: string) {
    const goals = this.get().items;
    const goal = goals.find((x) => x.id === id);
    return {
      label: goal?.label ?? "",
      id: goal?.id,
      color: goal?.color ?? goal?.parent?.color,
      childrenCount: goal?.subGoals?.filter(activeResourceFilter).length ?? 0
    };
  }
  resolveChildren(id: string) {
    const goals = this.get().items;
    const goal = goals.find((x) => x.id === id);
    return goal?.subGoals.filter(activeResourceFilter).map((x) => x.id) ?? [];
  }
  async resolveSubGoalsIfNotPresent(goalId: string) {
    const goals = this.get().items;
    const goalInContext = goals.find((x) => x.id === goalId);
    console.log({ goalInContext });
    if (!goalInContext) return;
    if (!isValidArrayWithData(goalInContext?.subGoals)) {
      const subGoals = goals.filter(
        (x) => goalInContext?.id === x.parent?.hierarchy.pop()?.id
      );
      console.log({ subGoals });
    }
  }
  async refresh(
    filters: {
      tag?: TagId | string;
      searchText?: string;
      isArchived?: boolean;
    },
    isShowRefreshingState: boolean = false
  ) {
    logger.log("refreshing goalStore");
    await dataManager.refresh(Item.PointGoal, isShowRefreshingState);
    return this.filter(filters);
  }
  async save(goal: IGoal) {
    if (!isGoalNameValid(goal.label)) return;
    await dataManager.performMutation(this.id, flattenSubGoalsAsGoals(goal), {
      action: PersistanceActionType.CREATE
    });
    setTimeout(() => {
      if (goal.isPinnedForQuickStart) appStore.gotoPath("/focus");
      else {
        // appStore.gotoPath(Item.goal);
      }
    }, 1000);
    toasts.trigger({
      title: "Goal: " + goal.label,
      message: "Created successfully",
      type: AlertType.SUCCESS,
      id: generateUID(),
      actionText: "View",
      callback: () => {
        appStore.gotoResource(Item.goal, prefixTable(goal.id, Item.PointGoal));
      }
    });

    function isGoalNameValid(label: string) {
      if (!label) {
        goalEditErrorMessage.set("Please enter a valid goal name");
        //labelRef?.focus();
        return false;
      }
      return true;
    }
  }
}

export const goalStore = new GoalStore();

class QuickFocusItemStore extends ObservableStore<IQuickFocusItemStore> {
  constructor() {
    super(Item.quickFocusItems, StoreDataType.NA, {
      refreshQuery: "fn::pointron::goal::fetchQuickFocusItems::v2();",
      dependencies: [
        { resource: Item.PointGoal, syncType: DependencySyncType.EAGER },
        { resource: Item.PointLog, syncType: DependencySyncType.DEFERRED }
      ]
    });
    if (!this.get()) {
      this.set({ items: [], filteredItems: [] });
    }
  }
  filter(filters: { tag?: TagId | string; searchText?: string }) {
    this.update((store) => {
      let filteredItems = filterGoals(store.items, filters);
      filteredItems = filteredItems.map((x) => {
        x.color = x.color ?? x.parent?.color;
        return x;
      });
      //sort all items by same color together
      filteredItems = filteredItems.sort((a, b) => {
        if (a.color === b.color) return 0;
        return a.color > b.color ? 1 : -1;
      });
      store.filteredItems = filteredItems;
      return store;
    });
  }
  loader(data: any) {
    logger.log("quickFocusItemStore loader", data);
    if (!data || !isValidArray(data)) return;
    this.update((store) => {
      store.items = data;
      return store;
    });
    this.filter({ tag: TagId.ALL, searchText: "" });
    this.cache();
  }
  async refresh(filters: { tag?: TagId | string; searchText?: string }) {
    logger.log("refreshing quickFocusItemStore");
    super.refresh();
    this.filter(filters);
  }
  propagateDependencyChanges(data: any) {
    logger.log("propagateDependencyChanges to quickFocusItems store", data);
    if (data?.id?.includes(Item.PointGoal) && data?.isPinnedForQuickStart) {
      this.update((store) => {
        let newGoal = data as PointGoalDbType;
        let goalTransformed: QuickFocusItem = {
          ...newGoal,
          id: newGoal.id!,
          color: newGoal.color ?? 0,
          parent: { hierarchy: [], color: 0 }
        };
        store.items.push(goalTransformed as QuickFocusItem);
        return store;
      });
      this.filter({ tag: TagId.ALL, searchText: "" });
      this.cache();
    }
  }
}

export const quickFocusItemStore = new QuickFocusItemStore();

export const currentGoal = initCurrentGoalStore(seedGoal);

function initCurrentGoalStore(initialValue: IGoal) {
  let previousValue: string;
  let originalValue: IGoal | undefined = undefined;
  const { subscribe, set: setRaw, update } = writable(initialValue);
  function isGoalNameValid(label: string) {
    if (!label) {
      goalEditErrorMessage.set("Please enter a valid goal name");
      //labelRef?.focus();
      return false;
    }
    return true;
  }
  const set = (x: IGoal) => {
    setRaw(x);
    previousValue = JSON.stringify(x);
  };
  const persist = async (n: Partial<IGoal>) => {
    return new Persistence().update({ ...n, id: get(currentGoal).id });
  };
  const fetchGoal = async (id: string) => {
    return await new GoalPersistence().fetch(id);
  };
  const propagateChangesTemp = () => {
    goalStore.refresh(
      { tag: TagId.ALL, searchText: "", isArchived: false },
      true
    );
  };
  return {
    subscribe,
    set: async (newValue: IGoal) => {
      console.log("currentGoal", { previousValue, newValue });
      let changedProperties: any = {};
      const propertiesToDelayUpdate = ["description", "label", "tags", "color"];
      if (previousValue) {
        let differences = shallowDiff(newValue, JSON.parse(previousValue));
        let changesToSaveImmediately = differences.filter(
          (x) =>
            ![...propertiesToDelayUpdate, "pendingChanges"].some((y) => y === x)
        );
        let changesToSaveLater = differences.filter((x) =>
          propertiesToDelayUpdate.some((y) => y === x)
        );
        console.log({ changesToSaveImmediately, changesToSaveLater });
        if (isValidArrayWithData(changesToSaveLater)) {
          newValue.pendingChanges = true;
        } else {
          newValue.pendingChanges = false;
        }
        changesToSaveImmediately.forEach((key: string) => {
          changedProperties[key] = newValue[key as keyof IGoal];
        });
      }
      // console.log("currentGoal", {
      //   previousValue: previousValue ? JSON.parse(previousValue) : null,
      //   newValue,
      //   changedProperties
      // });
      if (!objIsEmpty(changedProperties)) {
        set(newValue);
        persist(changedProperties)
          .then(() => {
            toasts.success("Updated successfully", "Goal: " + newValue.label);
            propagateChangesTemp();
            if (get(view).isPortrait) {
              if (newValue.isArchived) appStore.gotoPath("/goals");
            }
          })
          .catch((e) => {
            toasts.error("Something went wrong", "Goal: " + newValue.label);
            console.error(e);
          });
      } else {
        setRaw(newValue);
      }
    },
    propagateChangesTemp,
    load: async (id: string) => {
      let goal = goalStore.get().items.find((x) => x.id === id);
      if (!goal) {
        goal = await fetchGoal(id);
      }
      console.log("currentGoal", { goal });
      if (!goal) return;
      if (!goal.analytics) goal.analytics = seedGoal.analytics;
      if (!goal.tags) goal.tags = [];
      originalValue = deepCopy(goal);
      set({ ...goal });
      goalEditErrorMessage.set("");
      return goal;
    },
    restore: () => {
      if (originalValue) {
        originalValue.pendingChanges = false;
        set(deepCopy(originalValue));
      }
      // else {
      //   set(generateNewSeedGoal());
      //   // goalState.set(GoalState.NEW);
      //   originalValue = undefined;
      // }
      goalEditErrorMessage.set("");
    },
    update: async () => {
      let goal = get(currentGoal);
      if (!isGoalNameValid(goal.label)) return;
      const response = await new Persistence().update({
        id: goal.id,
        label: goal.label,
        color: goal.color,
        tags: goal.tags,
        description: goal.description
      });
      if (!response) return;
      goal.pendingChanges = false;
      set(goal);
      toasts.success("Updated successfully", "Goal: " + goal.label);
      propagateChangesTemp();
      isInEditMode.set(false);
      return goal;
    },
    addSubGoal: async (label: string) => {
      const id = generateUID();
      const parent = get(currentGoal);
      let parentHierarchy: string[] = [
        ...(parent.parent?.hierarchy.map((x) => x.id) ?? []),
        parent.id
      ];
      await new GoalPersistence().create([
        {
          id,
          label,
          parent: parentHierarchy
        }
      ]);
      parent.subGoals = [
        ...parent.subGoals,
        {
          ...seedGoal,
          id: prefixTable(id, Item.PointGoal),
          label: label
        }
      ];
      set(parent);
      propagateChangesTemp();
    }
  };
}
