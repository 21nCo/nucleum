import type { TimeUnit } from "./timeUnit.enum"

export type Preset = {
    id: string
    name?: string
    rounds: number
    duration: number
    brek: number
    additional?: Preset[]
    units?: TimeUnit
}