import { useEffect, useState } from "react";

const EMPTY: DecisionLists = {
  messages: [],
  proposals: [],
  record: [],
  preferences: [],
  next: 1,
};

// The repo's four lists. They belong to no workspace, so this reads them from
// the server rather than from a workspace's state, and reads them again when
// `rx` writes the file while the window is open.
export function useDecisions() {
  const [lists, setLists] = useState<DecisionLists>(EMPTY);

  useEffect(() => {
    const load = () => radix.decisions.read().then(setLists);

    load();
    return radix.subscribe((_, file) => {
      if (file === "decisions.json") load();
    });
  }, []);

  // The whole document goes back, the way `rx` writes it. The page shows the
  // new value at once so typing in a preference does not wait for the disk.
  const save = (next: DecisionLists) => {
    setLists(next);
    radix.decisions.write(next);
  };

  return [lists, save] as const;
}

// Ids are unique across the four lists, so this is enough to make one.
export function nextId(lists: DecisionLists, prefix: string) {
  return prefix + lists.next;
}
