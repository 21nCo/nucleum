import { TaskDueDateFilter, TaskSubTypeForSwitcher } from "@21n/components/tasks/task.type";

export function resolveTaskSubTypesForSwitcher() {
  const overdue = {
    label: "Overdue",
    value: TaskSubTypeForSwitcher.OVERDUE,
    icon: "alarm"
  };
  const withoutDueDate = {
    label: "Without due date",
    value: TaskSubTypeForSwitcher.WITHOUT_DUE_DATE,
    icon: "question"
  };
  const byDate = {
    label: "By date",
    value: TaskSubTypeForSwitcher.BY_DATE,
    icon: "calendar"
  };
  const byMonth = {
    label: "By month",
    value: TaskSubTypeForSwitcher.BY_MONTH,
    icon: "calendar"
  };
  const withoutGoal = {
    label: "Without goal",
    value: TaskSubTypeForSwitcher.WITHOUT_GOAL,
    icon: "circle-dashed"
  };
  return [byDate, byMonth];
}

export function resolveTaskDueDateFilters(params?: {
  isDatedContext?: boolean;
}) {
  const withoutDueDate = {
    label: "Without due date",
    value: TaskDueDateFilter.WITHOUT_DUE_DATE,
    icon: "question"
  };
  return [
    {
      label: "All",
      value: TaskDueDateFilter.ALL,
      icon: "asterisk"
    },
    {
      label: "Overdue",
      value: TaskDueDateFilter.OVERDUE,
      icon: "alarm"
    },
    ...(!params?.isDatedContext ? [withoutDueDate] : [])
  ];
}
