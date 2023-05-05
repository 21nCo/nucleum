import type { Session, Task } from "./session.type";
import type { Tag } from "$lib/local/types/tag.type";

export type Item = Task | Tag | Session;
