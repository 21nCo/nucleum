import {
  activeResourceFilter,
  generateUID,
  nonTrashFilter
} from "$lib/client/utils/utils";
import { get, writable } from "svelte/store";
import type {
  IGoal,
  IPointGoal,
  QuickFocusItem,
  IQuickFocusItemStore
} from "$lib/client/types/pointron/goal.type";
import { GoalPersistence } from "./goal.persistence";
import { prefixTable } from "$lib/shared/utils/text.utils";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  deepCopy,
  isValidArray,
  isValidArrayWithData,
  objIsEmpty,
  shallowDiff
} from "$lib/shared/utils/obj.utils";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import { appStore, isInEditMode } from "$lib/client/stores/app.store";
import { toasts } from "$lib/client/stores/notification.store";
import view from "$lib/client/stores/view.store";
import {
  DependencySyncType,
  PersistenceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { dataManager } from "$lib/client/persistence/dataManager";
import { TagId } from "$lib/client/types/pointron/tagId.enum";
import { logger } from "$lib/client/components/debug/logger.client";
import { Persistence } from "$lib/client/persistence/persistence";
import { ResourceFIRStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import { AlertType } from "$lib/client/types/notification.type";

export const seedGoal: IGoal = {
  id: generateUID(),
  label: "",
  color: undefined,
  isArchived: false,
  isCompleted: false,
  isStarred: false,
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
    } else if (filters.tag === TagId.STARRED) {
      filteredGoals = allItems.filter((x) => x.isStarred);
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
  let goalForDB: IPointGoal = {
    id: prefixTable(goal.id, Resource.PointGoal),
    label: goal.label,
    description: goal.description,
    tags: goal.tags,
    parent: goal?.parent
      ? goal.parent.hierarchy.map(({ id }: { id: string }) => id)
      : [],
    isArchived: goal.isArchived,
    isPinnedForQuickStart: goal.isPinnedForQuickStart,
    isStarred: goal.isStarred,
    isCompleted: goal.isCompleted,
    color: goal.color,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  };
  let flattenedSubGoals: IPointGoal[] = [];
  if (goal.subGoals.length === 0) {
    return goalForDB;
  }
  const parentForSubGoals =
    goal?.parent && goal.id
      ? [
          ...goal.parent.hierarchy.map(({ id }: { id: string }) => {
            return prefixTable(id, Resource.PointGoal);
          }),
          prefixTable(goal.id, Resource.PointGoal)
        ]
      : [prefixTable(goal.id, Resource.PointGoal)];
  goal.subGoals.forEach((subGoal) => {
    let subGoalAsGoal: IPointGoal = {
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
    super(Resource.PointGoal, defaultFilter, {
      refreshQuery: "fn::pointron::goal::fetchAll();",
      refreshOnAppear: true,
      dboDependencies: [
        "fn::pointron::goal::fetchAll",
        "fn::pointron::goal::fetchQuickFocusItems::v2"
      ]
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
      childrenCount: goal?.subGoals?.filter(activeResourceFilter).length ?? 0,
      parent: goal?.parent
    };
  }
  resolveChildren(id: string) {
    // const goals = this.get().items;
    // const goal = goals.find((x) => x.id === id);
    // return goal?.subGoals.filter(activeResourceFilter).map((x) => x.id) ?? [];
    return this.resolveSubGoalsIfNotPresent(id)?.map((x) => x.id) ?? [];
  }
  resolveSubGoalsIfNotPresent(goalId: string) {
    const goals = this.get().items;
    const goalInContext = goals.find((x) => x.id === goalId);

    if (!goalInContext) return [];

    const subGoals = goals
      .filter(
        (x) =>
          goalInContext?.id ===
          x.parent?.hierarchy[x.parent?.hierarchy.length - 1]?.id
      )
      .filter(activeResourceFilter);

    return subGoals;
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
    await dataManager.refresh(Resource.PointGoal, isShowRefreshingState);
    return this.filter(filters);
  }
  async save(goal: IGoal) {
    if (!isGoalNameValid(goal.label)) return;
    let goalForDB: IPointGoal = {
      id: goal.id,
      label: goal.label,
      description: goal.description,
      tags: goal.tags,
      parent: goal?.parent
        ? goal.parent.hierarchy.map(({ id }: { id: string }) => id)
        : [],
      isArchived: goal.isArchived,
      isPinnedForQuickStart: goal.isPinnedForQuickStart,
      isStarred: goal.isStarred,
      isCompleted: goal.isCompleted,
      color: goal.color,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
    await dataManager.performMutation(this.id, goalForDB, {
      action: PersistenceActionType.CREATE
    });
    this.update((store) => {
      store.items.push(goalForDB);
      return store;
    });
    toasts.trigger({
      message: goal.label + " created successfully.",
      type: AlertType.SUCCESS,
      id: generateUID()
    });
    this.refresh(
      {
        tag: TagId.ALL
      },
      true
    );
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
    super(Resource.quickFocusItems, StoreDataType.NA, {
      refreshQuery: "fn::pointron::goal::fetchQuickFocusItems::v2();",
      dependencies: [
        { resource: Resource.PointGoal, syncType: DependencySyncType.EAGER },
        { resource: Resource.PointLog, syncType: DependencySyncType.DEFERRED }
      ]
    });
    if (!this.get()) {
      this.set({ items: [], filteredItems: [], selectedTagId: TagId.ALL });
    }
  }
  filter(searchQuery: string = "") {
    this.update((store) => {
      const filters = {
        tag: store.selectedTagId,
        searchText: searchQuery
      };
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
    logger.log({ context: "quickFocusItemStore loader", data });
    if (!data || !isValidArray(data)) {
      return;
    }
    this.update((store) => {
      store.items = data;
      return store;
    });
    this.filter();
    this.cache();
  }
  async refresh(
    searchQuery: string = "",
    isShowRefreshingState: boolean = false
  ) {
    logger.log("refreshing quickFocusItemStore");
    super.refresh({ isShowRefreshingState });
    this.filter(searchQuery);
  }
  propagateDependencyChanges(data: any) {
    logger.log("propagateDependencyChanges to quickFocusItems store", data);
    if (data?.id?.includes(Resource.PointGoal) && data?.isPinnedForQuickStart) {
      this.update((store) => {
        let newGoal = data as IPointGoal;
        let goalTransformed: QuickFocusItem = {
          ...newGoal,
          id: newGoal.id!,
          color: newGoal.color ?? 0,
          parent: { hierarchy: [], color: 0 }
        };
        store.items.push(goalTransformed as QuickFocusItem);
        return store;
      });
      this.filter();
      this.cache();
    }
  }
  async pinGoal(id: string) {
    const items = this.get().items;
    const goal = items.find((x) => x.id === id);
    if (goal) return -1;
    await goalStore.modify({ id, isPinnedForQuickStart: true });
    this.refresh();
    return 1;
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
      // console.log("currentGoal", { previousValue, newValue });
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
        // console.log({ changesToSaveImmediately, changesToSaveLater });
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
            if (
              !get(view).isPortrait ||
              "isPinnedForQuickStart" in changedProperties
            ) {
              const successMessage = changedProperties.isPinnedForQuickStart
                ? " pinned successfully."
                : changedProperties.isArchived && newValue.isArchived
                  ? " archived successfully."
                  : " updated successfully.";
              toasts.success("Goal: " + newValue.label + successMessage);
            }
            propagateChangesTemp();
          })
          .catch((e) => {
            toasts.error("Something went wrong. Please try again later.");
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
      // console.log("currentGoal", { goal });
      if (!goal) return;
      if (!goal.analytics) goal.analytics = seedGoal.analytics;
      if (!goal.tags) goal.tags = [];
      goal.subGoalsRefreshId = generateUID();
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
          id: prefixTable(id, Resource.PointGoal),
          label: label
        }
      ];
      // set(parent);
      await goalStore.refresh(
        { tag: TagId.ALL, searchText: "", isArchived: false },
        true
      );
      parent.subGoalsRefreshId = generateUID();
      set({ ...parent });
    }
  };
}
