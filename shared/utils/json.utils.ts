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
  const deepReplace = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        let result = obj;
        for (const [searchValue, replaceValue] of Object.entries(replaces)) {
          result = result.replaceAll(searchValue, replaceValue);
        }
        return result;
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(deepReplace);
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = replaces.hasOwnProperty(key) ? replaces[key] : key;
      result[newKey] = deepReplace(value);
    }
    return result;
  };
  
  return deepReplace(val);
};

export const reparse = (val: any) => {
  return parse(stringify(val, { isPreventReplacer: true }));
};
