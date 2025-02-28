export function resolveTaskSubTypesForSwitcher() {
  return [
    {
      label: "Without due date",
      value: "without-due-date",
      icon: "ph:question-light"
    },
    { label: "By date", value: "bydate", icon: "ph:calendar-light" },
    { label: "By month", value: "bymonth", icon: "ph:calendar-blank-light" }
  ];
}
