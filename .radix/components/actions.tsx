import { useEffect, useRef } from "react";

// Registers a component's callback under its id so an agent can run it with
// `rx action <id> <name>`, and hands the same callback back to be wired to a
// button. There is only ever one function, so a click and a call from the
// terminal run the same code over the same state:
//
//   const commit = useAction(id, "commit", async (message?: string) => {
//     ...
//     return { sha };
//   });
//
//   <Button onClick={() => commit()}>Commit</Button>
//
// Whatever the callback returns is what `rx action` prints, and anything it
// throws becomes the command's error.
export function useAction<A extends any[], R>(
  component: string,
  name: string,
  handler: (...args: A) => R
) {
  // Registering the callback itself would pin the first render's closure, and
  // a call from the terminal would then run against stale values.
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    return radix.actions.register(component, name, (...args: A) => latest.current(...args));
  }, [component, name]);

  return handler;
}
