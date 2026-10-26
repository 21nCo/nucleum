import type { IAction } from "@nucleum/shared-state/commands/action.type";

export type ICommandAction = IAction & {
  cmdLabel: string;
  variant?: string;
};
