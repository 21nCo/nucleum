import React from "react";

import { Checkbox as Tick } from "./ui/checkbox.tsx";
import { Input } from "./ui/input.tsx";
import { useComponentState } from "./state.tsx";

type Task = { done: boolean; text: string };

export function Checkbox({ id }: { id: string }) {
  const [task, setTask, selectable] = useComponentState<Task>(id, { done: false, text: "" });

  return (
    <div className="my-1 flex items-center gap-2" {...selectable}>
      <Tick checked={task.done} onCheckedChange={(done) => setTask({ ...task, done })} />
      <Input
        className="border-transparent bg-transparent px-0 focus-visible:border-transparent focus-visible:ring-0 data-[done]:text-muted-foreground data-[done]:line-through dark:bg-transparent"
        data-done={task.done || undefined}
        placeholder="To do"
        value={task.text}
        onChange={(event) => setTask({ ...task, text: event.target.value })}
      />
    </div>
  );
}
