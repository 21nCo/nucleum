import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import { useSelectable } from "./selection.tsx";

type Values = Record<string, any>;

type Store = {
  workspace: string;
  values: Values;
  set: (component: string, data: any) => void;
};

const Context = createContext<Store | null>(null);

const WRITE_DELAY = 250;

export function StateProvider({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  const [values, setValues] = useState<Values | null>(null);
  const pending = useRef<Record<string, number>>({});

  useEffect(() => {
    setValues(null);
    radix.state.read(workspace).then(setValues);
  }, [workspace]);

  useEffect(() => {
    return radix.subscribe((changed, file) => {
      if (changed !== workspace || file !== "state.json") return;
      radix.state.read(workspace).then((stored) => {
        setValues((current) => {
          const merged = { ...stored };
          for (const component of Object.keys(pending.current)) {
            if (current && component in current) merged[component] = current[component];
          }
          return merged;
        });
      });
    });
  }, [workspace]);

  if (!values) return null;

  const set = (component: string, data: any) => {
    setValues((current) => ({ ...current, [component]: data }));

    clearTimeout(pending.current[component]);
    pending.current[component] = setTimeout(() => {
      delete pending.current[component];
      radix.state.write(workspace, component, data);
    }, WRITE_DELAY);
  };

  return (
    <Context.Provider value={{ workspace, values, set }}>{children}</Context.Provider>
  );
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("no StateProvider above this component");
  return store;
}

export function useComponentState<T>(component: string, initial: T) {
  const store = useStore();
  const value = component in store.values ? (store.values[component] as T) : initial;

  return [value, (data: T) => store.set(component, data), useSelectable(component)] as const;
}
