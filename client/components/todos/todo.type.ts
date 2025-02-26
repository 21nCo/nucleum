import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";

export interface ITodo extends IMemotronItemBase {
  label: string;
  isChecked: boolean;
  /**
   * Estimated time in seconds
   */
  estimated?: number;
  date?: Date;
  taskId?: IRecordId;
}

export interface ITodoStore extends IObservableStoreSubject {}
