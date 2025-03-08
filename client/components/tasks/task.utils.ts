export function resolveTaskSubTypesForSwitcher(isGoalContext?: boolean) {
  const withoutDueDate = {
    label: "Without due date",
    value: "without-due-date",
    icon: "ph:question-light"
  };
  const byDate = {
    label: "By date",
    value: "bydate",
    icon: "ph:calendar-light"
  };
  const byMonth = {
    label: "By month",
    value: "bymonth",
    icon: "ph:calendar-blank-light"
  };
  const withoutGoal = {
    label: "Without goal",
    value: "without-goal",
    icon: "ph:circle-light"
  };

  if (isGoalContext) {
    return [byDate, byMonth, withoutDueDate];
  }
  return [byDate, byMonth, withoutDueDate, withoutGoal];
}
