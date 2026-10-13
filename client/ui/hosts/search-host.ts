export interface ElementSearchHost {
  onSelected(item: Record<string, unknown>): void;
}

let host: ElementSearchHost | undefined;

/** Installs application reactions to portable search selection. */
export function configureElementSearchHost(value: ElementSearchHost) {
  host = value;
}

/** Notifies the optional application host of a search selection. */
export function notifyElementSearchSelection(item: Record<string, unknown>) {
  host?.onSelected(item);
}
