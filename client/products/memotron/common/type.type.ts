import type { IProperty } from "$lib/client/components/collection/properties/property.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IMemotronItemBase } from "../../products/memotron/memotron.type";

type TypeBase = IMemotronItemBase & {
  avatar: IAvatar;
};
export type IType = TypeBase & {
  properties: IProperty[];
};

export type IActiveTypeStore = IType;

export type TypeCreationForm = {
  label: string;
  avatar: string;
  properties: IProperty[];
};

export type TypeLocalRecord = TypeBase;
