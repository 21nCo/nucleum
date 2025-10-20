import type { IProperty } from "@21n/components/collection/properties/property.type";
import type { IAvatar } from "@21n/types/avatar.type";
import type { IMemotronItemBase } from "@21n/products/products/memotron/memotron.type";

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
