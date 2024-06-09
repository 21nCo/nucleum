import { activeResourceFilter, generateUID } from "$lib/client/utils/utils";
import { get, writable } from "svelte/store";
import type {
  Goal,
  GoalStore,
  NewGoalStore,
  PointGoalDbType,
  QuickFocusItem,
  QuickFocusItemStore
} from "$lib/client/types/pointron/goal.type";
import { GoalPersistence } from "./goal.persistence";
import { prefixTable } from "$lib/client/utils/text.utils";
import { Item } from "$lib/client/types/item.enum";
import { Persistance } from "$lib/client/stores/persistence";
import {
  deepCopy,
  isValidArrayWithData,
  objIsEmpty,
  shallowDiff
} from "$lib/client/utils/obj.utils";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import { toasts } from "$lib/client/stores/notification.store";
import view from "$lib/client/stores/view.store";
import { AlertType } from "$lib/client/types/notification.type";
import {
  DependencySyncType,
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { dataManager } from "$lib/client/stores/data.store";
import { TagId } from "$lib/client/types/pointron/tagId.enum";
import { logger } from "$lib/client/stores/log.store";

const seedGoal: Goal = {
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

/**
 * here we are assuming that the there can only be one level(direct level) of nesting in goals(as `subGoals` property), since as of the time writing this function there is only one level of nesting in goals, possible in the app, through the add sub goal feature, for a specific goal
 * @param goal
 */
function flattenSubGoalsAsGoals(
  goal: Partial<Goal> & Pick<Goal, "id" | "label" | "subGoals">
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

function isGoalNameValid(label: string) {
  if (!label) {
    goalEditErrorMessage.set("Please enter a valid goal name");
    //labelRef?.focus();
    return false;
  }
  return true;
}

const newGoalStoreId = "newGoalStore";

export const newGoalStore = initNewGoalStore();

function initNewGoalStore() {
  const { subscribe, update, set } = writable<NewGoalStore>();
  const reset = () => {
    set({
      id: newGoalStoreId,
      goal: { ...deepCopy(seedGoal), id: generateUID() },
      mutatingResources: [Item.PointGoal],
      dataType: StoreDataType.NON_PERSISTING
    });
  };
  reset();
  return {
    subscribe,
    set,
    update,
    reset,
    save: async () => {
      let n = get(newGoalStore);
      if (!isGoalNameValid(n.goal.label)) return;
      await dataManager.performMutation(
        newGoalStoreId,
        flattenSubGoalsAsGoals(n.goal),
        { action: PersistanceActionType.CREATE }
      );
      reset();
      setTimeout(() => {
        if (n.goal.isPinnedForQuickStart) appStore.gotoPath("/focus");
        else {
          appStore.gotoPath(Item.goal);
        }
      }, 1000);
      toasts.trigger({
        title: "Goal: " + n.goal.label,
        message: "Created successfully",
        type: AlertType.SUCCESS,
        id: generateUID(),
        actionText: "View"
      });
    }
  };
}

function filterGoals(
  allItems: (Goal | QuickFocusItem)[],
  filters: { tag?: TagId | string; searchText?: string }
) {
  let filteredGoals = allItems;
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

export const goalStore = initGoalsStore();
function initGoalsStore() {
  const { subscribe, set, update } = writable<GoalStore>({
    goals: [],
    filteredGoals: [],
    archivedGoals: [],
    id: Item.PointGoal,
    dataType: StoreDataType.FIR,
    dependencies: [
      { resource: Item.PointGoal, syncType: DependencySyncType.EAGER }
    ],
    refreshQuery: "fn::pointron::goal::fetchAll();"
  });
  dataManager.retrieveCache(Item.PointGoal).then((goalStoreCache) => {
    update((store) => ({
      ...store,
      isRefreshing: false,
      goals: (goalStoreCache as GoalStore)?.goals ?? [],
      archivedGoals:
        (goalStoreCache as GoalStore)?.goals.filter((x) => x.isArchived) ?? []
    }));
    filter({ tag: TagId.ALL, searchText: "", isArchived: false });
  });
  const cache = async (n: GoalStore) => {
    dataManager.cache(n);
  };
  const filter = (filters: {
    tag?: TagId | string;
    searchText?: string;
    isArchived?: boolean;
  }) => {
    update((store) => {
      let filteredGoals = filterGoals(store.goals, filters);
      store.filteredGoals = (filteredGoals as Goal[]).filter(
        (x) =>
          ((filters.isArchived && x.isArchived) || !x.isArchived) &&
          ((filters.tag === TagId.ALL &&
            !filters.searchText &&
            x.parent?.hierarchy?.length === 0) ||
            filters.tag !== TagId.ALL ||
            filters.searchText)
      );
      return store;
    });
  };
  return {
    subscribe,
    set,
    loader: (data: any) => {
      logger.log("goalStore loader", data);
      if (!data || !isValidArrayWithData(data)) return;
      update((store) => {
        store.goals = data;
        store.archivedGoals = data.filter((x: any) => x.isArchived);
        filter({ tag: TagId.ALL, searchText: "", isArchived: false });
        cache(store);
        return store;
      });
    },
    filter: filter,
    search: async (query: string) => {
      const goals = get(goalStore).goals;
      if (!query) return;
      return goals.filter(
        (x) =>
          x.label.toLowerCase().includes(query.toLowerCase()) && !x.isArchived
      );
    },
    get: (id: string) => {
      const goals = get(goalStore).goals;
      const goal = goals.find((x) => x.id === id);
      return {
        label: goal?.label ?? "",
        id: goal?.id,
        color: goal?.color ?? goal?.parent?.color,
        childrenCount: goal?.subGoals?.filter(activeResourceFilter).length ?? 0
      };
    },
    children: (id: string) => {
      const goals = get(goalStore).goals;
      const goal = goals.find((x) => x.id === id);
      console.log("children", { goal });
      return goal?.subGoals.filter((x) => !x.isArchived).map((x) => x.id) ?? [];
    },
    resolveSubGoalsIfNotPresent: async (goalId: string) => {
      const goals = get(goalStore).goals;
      const goalInContext = goals.find((x) => x.id === goalId);
      console.log({ goalInContext });
      if (!goalInContext) return;
      if (!isValidArrayWithData(goalInContext?.subGoals)) {
        const subGoals = goals.filter(
          (x) => goalInContext?.id === x.parent?.hierarchy.pop()?.id
        );
        console.log({ subGoals });
      }
    },
    refresh: async (
      filters: {
        tag?: TagId | string;
        searchText?: string;
        isArchived?: boolean;
      },
      isShowRefreshingState: boolean = false
    ) => {
      logger.log("refreshing goalStore");
      await dataManager.refresh(Item.PointGoal, isShowRefreshingState);
      filter(filters);
    },
    update,
    propagateDependencyChanges: (data: any) => {
      logger.log("propagateDependencyChanges to goalStore", data);
      if (data?.id?.includes(Item.PointGoal)) {
        update((store) => {
          let newGoal = data as PointGoalDbType;
          let goalTransformed: Goal = {
            ...newGoal,
            id: newGoal.id!,
            color: newGoal.color ?? 0,
            subGoalCount: 0,
            subGoals: [],
            archivedSubGoalCount: 0,
            parent: { hierarchy: [], color: 0 }
          };
          store.goals = [...store.goals, goalTransformed];
          filter({ tag: TagId.ALL, searchText: "", isArchived: false });
          cache(store);
          return store;
        });
      }
    }
  };
}
export const quickFocusItemsStoreId = "quickFocusItems";

export const quickFocusItemStore = initQuickFocusItemStore();
function initQuickFocusItemStore() {
  const { subscribe, set, update } = writable<QuickFocusItemStore>({
    items: [],
    filteredItems: [],
    id: quickFocusItemsStoreId,
    dataType: StoreDataType.FIR,
    refreshQuery: "fn::pointron::goal::fetchQuickFocusItems::v2();",
    dependencies: [
      { resource: Item.PointGoal, syncType: DependencySyncType.EAGER },
      { resource: Item.PointLog, syncType: DependencySyncType.DEFERRED }
    ]
  });
  dataManager.retrieveCache(quickFocusItemsStoreId).then((x) => {
    update((store) => ({
      ...store,
      items: (x as QuickFocusItemStore)?.items ?? [],
      filteredItems: (x as QuickFocusItemStore)?.items ?? []
    }));
  });
  const cache = async (n: QuickFocusItemStore) => {
    dataManager.cache(n);
  };
  const filter = (filters: { tag?: TagId | string; searchText?: string }) => {
    update((store) => {
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
  };
  return {
    subscribe,
    set,
    loader: (data: any) => {
      logger.log("quickFocusItemStore loader", data);
      if (!data || !isValidArrayWithData(data)) return;
      update((store) => {
        store.items = data;
        filter({ tag: TagId.ALL, searchText: "" });
        cache(store);
        return store;
      });
    },
    update,
    filter: filter,
    refresh: async (filters: { tag?: TagId | string; searchText?: string }) => {
      logger.log("refreshing quickFocusItemStore");
      await dataManager.refresh(quickFocusItemsStoreId);
      filter(filters);
    },
    propagateDependencyChanges: (data: any) => {
      logger.log("propagateDependencyChanges to quickFocusItems store", data);
      if (data?.id?.includes(Item.PointGoal) && data?.isPinnedForQuickStart) {
        update((store) => {
          let newGoal = data as PointGoalDbType;
          let goalTransformed: QuickFocusItem = {
            ...newGoal,
            id: newGoal.id!,
            color: newGoal.color ?? 0,
            parent: { hierarchy: [], color: 0 }
          };
          store.items.push(goalTransformed as QuickFocusItem);
          filter({ tag: TagId.ALL, searchText: "" });
          cache(store);
          return store;
        });
      }
    }
  };
}

export const currentGoal = initCurrentGoalStore(seedGoal);

function initCurrentGoalStore(initialValue: Goal) {
  let previousValue: string;
  let originalValue: Goal | undefined = undefined;
  const { subscribe, set: setRaw, update } = writable(initialValue);
  function isGoalNameValid(label: string) {
    if (!label) {
      goalEditErrorMessage.set("Please enter a valid goal name");
      //labelRef?.focus();
      return false;
    }
    return true;
  }
  const set = (x: Goal) => {
    setRaw(x);
    previousValue = JSON.stringify(x);
  };
  const persist = async (n: Partial<Goal>) => {
    return new Persistance().update({ ...n, id: get(currentGoal).id });
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
    set: async (newValue: Goal) => {
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
          changedProperties[key] = newValue[key as keyof Goal];
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
      let goal = get(goalStore).goals.find((x) => x.id === id);
      if (!goal) {
        goal = await fetchGoal(id);
      }
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
      const response = await new Persistance().update({
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
