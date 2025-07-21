const UNDEFINED_MARKER = "$NONE";

export const undefinedReplacer = (key: string, value: any) => {
  return value === undefined ? UNDEFINED_MARKER : value;
};

export const undefinedReviver = (key: string, value: any) => {
  return value === UNDEFINED_MARKER ? undefined : value;
};

export const stringify = (
  obj: any,
  options?: { space?: number; isPreventReplacer?: boolean }
) => {
  return JSON.stringify(
    obj,
    options?.isPreventReplacer ? undefined : undefinedReplacer,
    options?.space
  );
};

export const parse = (str: string) => {
  return JSON.parse(str, undefinedReviver);
};

export const replacer = (val: any, replaces: { [key: string]: any }) => {
  let str = JSON.stringify(val);
  for (const [key, value] of Object.entries(replaces)) {
    str = str.replace(key, value);
  }
  return JSON.parse(str);
};

export const reparse = (val: any) => {
  return parse(stringify(val, { isPreventReplacer: true }));
};
