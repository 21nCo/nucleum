import type { EventType } from "./event.enum"

export type CustomEvent = {
    type: EventType;
    value?: boolean;
}