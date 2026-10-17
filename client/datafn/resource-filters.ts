export const isTrashedResource = (x: any) => x?.trashedAt != null;

export const activeResourceFilter = (x: any) =>
  !x.isArchived && !isTrashedResource(x) && !x.isAncestorInactive;

export const activeResourceFilterIgnoreAncestorInactive = (x: any) =>
  !x.isArchived && !isTrashedResource(x);

export const activeResourceFilterV2 = {
  isArchived: false,
  trashedAt: { $is_null: true },
  isAncestorInactive: false
};

export const archivedResourceFilter = (x: any) =>
  x.isArchived && !isTrashedResource(x) && !x.isAncestorInactive;

export const nonTrashFilter = (x: any) => !isTrashedResource(x);
