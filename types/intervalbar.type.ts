export type intervalbar = {
    duration: number
    progress: number
    color?: string
    type?: BarType
}

export enum BarType {
    INTERVAL,
    BREK
}