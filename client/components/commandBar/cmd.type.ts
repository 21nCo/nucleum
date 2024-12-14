import type { IAction } from "$lib/client/types/action.type";

export type ICommandAction = IAction & {
  cmdLabel: string;
  variant?: string;
};
