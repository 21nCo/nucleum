/** Structural quick-access tile data; the caller owns actions and navigation. */
export interface IQuickAccessItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}
