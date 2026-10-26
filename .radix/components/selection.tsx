import { useComments } from "./comments.tsx";

// What a component spreads onto its root element to be selectable, and to
// show a marker when it has unresolved comments.
export function useSelectable(component: string) {
  const { threads } = useComments();
  const open = threads.filter((thread) => !thread.resolved && thread.component === component);

  return {
    "data-rx-id": component,
    "data-rx-comments": open.length || undefined,
  };
}
