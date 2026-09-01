import type { DatafnSeedTransport } from "../fixtures/datafn-seed";

export type SeededObjective = {
  id: string;
  label: string;
};

export type SeededTask = {
  id: string;
  label: string;
  objectiveId: string;
};

export type FocusResourceFixture = {
  objective: SeededObjective;
  nestedTasks: SeededTask[];
  standaloneTasks: SeededTask[];
};

export type SeededSessionDetailFixture = {
  itemIds: string[];
  nestedTaskLabel: string;
  notesText: string;
  objectiveLabel: string;
  sessionId: string;
  sessionLogIds: string[];
  standaloneTaskLabel: string;
};

export type SeedObjectiveOptions = {
  color?: number;
  isPinnedForQuickFocus?: boolean;
  label?: string;
  parentId?: string | null;
  parentPath?: string;
  prefix?: string;
  sortOrder?: number;
  status?: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
  type?: "DEFINITE" | "INDEFINITE" | "ROUTINE";
};

export type SeedTaskOptions = {
  dateUnix?: number;
  isChecked?: boolean;
  label?: string;
  objectiveId?: string | null;
  prefix?: string;
};

type FocusResource = "objective" | "task";

/** Seeds valid focus-domain records without exercising creation UI. */
export class FocusSeed {
  constructor(private readonly transport: DatafnSeedTransport) {}

  /** Seeds one objective with production creation defaults. */
  async objective(options: SeedObjectiveOptions = {}) {
    const [objective] = await this.objectives(1, options);
    return objective;
  }

  /** Seeds multiple objectives in one DataFn mutation batch. */
  async objectives(count: number, options: SeedObjectiveOptions = {}) {
    const objectives = Array.from({ length: count }, (_, index) => {
      const id = this.transport.createId("objective");
      const label =
        count === 1 && options.label
          ? options.label
          : this.transport.createLabel(
              `${options.prefix ?? "E2E objective"}${count > 1 ? ` ${index + 1}` : ""}`
            );
      return { id, label };
    });
    await this.transport.mutate(
      "objective",
      objectives.map((objective) => ({
        operation: "insert",
        id: objective.id,
        record: {
          id: objective.id,
          label: objective.label,
          type: options.type ?? "INDEFINITE",
          status: options.status ?? "NOT_STARTED",
          isPinnedForQuickFocus: options.isPinnedForQuickFocus ?? false,
          ...(options.color === undefined ? {} : { color: options.color }),
          ...(options.parentId === undefined
            ? {}
            : { parentId: options.parentId }),
          ...(options.parentPath === undefined
            ? {}
            : { parentPath: options.parentPath }),
          ...(options.sortOrder === undefined
            ? {}
            : { sortOrder: options.sortOrder })
        }
      }))
    );
    return objectives;
  }

  /** Seeds one task with production creation defaults. */
  async task(options: SeedTaskOptions = {}) {
    const [task] = await this.tasks(1, options);
    return task;
  }

  /** Seeds multiple tasks in one DataFn mutation batch. */
  async tasks(count: number, options: SeedTaskOptions = {}) {
    const tasks = Array.from({ length: count }, (_, index) => {
      const id = this.transport.createId("task");
      const label =
        count === 1 && options.label
          ? options.label
          : this.transport.createLabel(
              `${options.prefix ?? "E2E task"}${count > 1 ? ` ${index + 1}` : ""}`
            );
      return {
        id,
        label,
        objectiveId: options.objectiveId ?? ""
      };
    });
    await this.transport.mutate(
      "task",
      tasks.map((task) => ({
        operation: "insert",
        id: task.id,
        record: {
          id: task.id,
          label: task.label,
          dateUnix: options.dateUnix ?? 0,
          isChecked: options.isChecked ?? false,
          objectiveId: task.objectiveId
        }
      }))
    );
    return tasks;
  }

  /** Updates a seeded focus resource while preserving its identity. */
  async mergeResource(
    resource: FocusResource,
    id: string,
    record: Record<string, unknown>
  ) {
    await this.transport.mutate(resource, {
      operation: "merge",
      id,
      record: { id, ...record }
    });
  }

  /** Updates the label of a seeded objective or task. */
  async updateResourceLabel(
    resource: FocusResource,
    id: string,
    label: string
  ) {
    await this.mergeResource(resource, id, { label });
  }

  /** Seeds the objective and task mix used by active-session scenarios. */
  async resources(
    options: {
      nestedTaskCount?: number;
      standaloneTaskCount?: number;
      objectiveStatus?: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
      taskCheckedState?: boolean;
      dateUnix?: number;
      prefix?: string;
    } = {}
  ): Promise<FocusResourceFixture> {
    const prefix = options.prefix ?? "E2E session";
    const objective = await this.objective({
      prefix: `${prefix} objective`,
      status: options.objectiveStatus
    });
    const nestedTasks = await this.tasks(options.nestedTaskCount ?? 0, {
      dateUnix: options.dateUnix,
      isChecked: options.taskCheckedState,
      objectiveId: objective.id,
      prefix: `${prefix} nested task`
    });
    const standaloneTasks = await this.tasks(options.standaloneTaskCount ?? 0, {
      dateUnix: options.dateUnix,
      isChecked: options.taskCheckedState,
      objectiveId: "",
      prefix: `${prefix} standalone task`
    });
    return { nestedTasks, objective, standaloneTasks };
  }

  /** Seeds a completed session with related items, interval blocks, notes, and logs. */
  async sessionDetail(): Promise<SeededSessionDetailFixture> {
    const objective = await this.objective({
      prefix: "E2E session objective"
    });
    const nestedTask = await this.task({
      objectiveId: objective.id,
      prefix: "E2E session nested task"
    });
    const standaloneTask = await this.task({
      objectiveId: "",
      prefix: "E2E session standalone task"
    });
    const sessionId = this.transport.createId("session");
    const sessionLogIds = Array.from({ length: 3 }, () =>
      this.transport.createId("sessionLog")
    );
    const notesText = this.transport.createLabel("E2E session note");
    const startUnix = Date.now() - 40 * 60 * 1000;
    const firstFocusEnd = startUnix + 20 * 60 * 1000;
    const breakEnd = firstFocusEnd + 5 * 60 * 1000;
    const endUnix = breakEnd + 15 * 60 * 1000;
    await this.transport.mutate("session", [
      {
        operation: "insert",
        id: sessionId,
        record: {
          id: sessionId,
          type: "COUNTUP",
          startUnix,
          endUnix,
          elapsed: 40 * 60,
          extended: 0,
          blocks: [
            {
              id: this.transport.createEmbeddedId("block"),
              type: 1,
              start: startUnix,
              duration: 20 * 60,
              progress: 1
            },
            {
              id: this.transport.createEmbeddedId("block"),
              type: 0,
              start: firstFocusEnd,
              duration: 5 * 60,
              progress: 1
            },
            {
              id: this.transport.createEmbeddedId("block"),
              type: 1,
              start: breakEnd,
              duration: 15 * 60,
              progress: 1
            }
          ],
          notes: {
            blocks: [
              {
                id: this.transport.createEmbeddedId("node"),
                contentType: "SIMPLE_TEXT",
                body: notesText
              }
            ]
          }
        }
      },
      {
        operation: "relate",
        id: sessionId,
        relations: {
          items: [
            {
              $ref: objective.id,
              itemResource: "objective",
              sortOrder: 0,
              blocks: [{ start: startUnix, end: firstFocusEnd }]
            },
            {
              $ref: nestedTask.id,
              itemResource: "task",
              parentObjectiveId: objective.id,
              sortOrder: 1,
              blocks: [{ start: startUnix, end: firstFocusEnd }]
            },
            {
              $ref: standaloneTask.id,
              itemResource: "task",
              sortOrder: 2,
              blocks: [{ start: breakEnd, end: endUnix }]
            }
          ]
        }
      }
    ]);
    await this.transport.mutate("sessionLog", [
      {
        operation: "insert",
        id: sessionLogIds[0],
        record: {
          id: sessionLogIds[0],
          sessionId,
          objectiveId: objective.id,
          taskId: "",
          startUnix,
          endUnix: firstFocusEnd,
          focus: 20 * 60,
          breakTime: 0
        }
      },
      {
        operation: "insert",
        id: sessionLogIds[1],
        record: {
          id: sessionLogIds[1],
          sessionId,
          objectiveId: objective.id,
          taskId: nestedTask.id,
          startUnix,
          endUnix: firstFocusEnd,
          focus: 20 * 60,
          breakTime: 0
        }
      },
      {
        operation: "insert",
        id: sessionLogIds[2],
        record: {
          id: sessionLogIds[2],
          sessionId,
          objectiveId: "",
          taskId: standaloneTask.id,
          startUnix: breakEnd,
          endUnix,
          focus: 15 * 60,
          breakTime: 0
        }
      }
    ]);
    return {
      itemIds: [objective.id, nestedTask.id, standaloneTask.id],
      nestedTaskLabel: nestedTask.label,
      notesText,
      objectiveLabel: objective.label,
      sessionId,
      sessionLogIds,
      standaloneTaskLabel: standaloneTask.label
    };
  }
}
