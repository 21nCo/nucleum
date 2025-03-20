import { TaskDueDateFilter, TaskSubTypeForSwitcher } from "./task.type";

export function resolveTaskSubTypesForSwitcher() {
  const overdue = {
    label: "Overdue",
    value: TaskSubTypeForSwitcher.OVERDUE,
    icon: "ph:alarm-light"
  };
  const withoutDueDate = {
    label: "Without due date",
    value: TaskSubTypeForSwitcher.WITHOUT_DUE_DATE,
    icon: "ph:question-light"
  };
  const byDate = {
    label: "By date",
    value: TaskSubTypeForSwitcher.BY_DATE,
    icon: "ph:calendar-light"
  };
  const byMonth = {
    label: "By month",
    value: TaskSubTypeForSwitcher.BY_MONTH,
    icon: "ph:calendar-blank-light"
  };
  const withoutGoal = {
    label: "Without goal",
    value: TaskSubTypeForSwitcher.WITHOUT_GOAL,
    icon: "ph:circle-dashed-light"
  };
  return [byDate, byMonth];
}

export function resolveTaskDueDateFilters(params?: {
  isDatedContext?: boolean;
}) {
  const withoutDueDate = {
    label: "Without due date",
    value: TaskDueDateFilter.WITHOUT_DUE_DATE,
    icon: "ph:question-light"
  };
  return [
    {
      label: "All",
      value: TaskDueDateFilter.ALL,
      icon: "ph:asterisk-light"
    },
    {
      label: "Overdue",
      value: TaskDueDateFilter.OVERDUE,
      icon: "ph:alarm-light"
    },
    ...(!params?.isDatedContext ? [withoutDueDate] : [])
  ];
}
