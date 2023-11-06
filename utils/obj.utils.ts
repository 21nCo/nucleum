export function deepDiff(obj1: any, obj2: any, path: string = ""): string[] {
  if (obj1 === obj2) return [];

  if (!(obj1 instanceof Object) || !(obj2 instanceof Object)) return [path];

  const differences: string[] = [];
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (let key of keys) {
    const newPath = path ? `${path}.${key}` : key;

    if (obj1[key] !== obj2[key]) {
      differences.push(...deepDiff(obj1[key], obj2[key], newPath));
    }
  }

  return differences;
}
export function shallowDiff(obj1: any, obj2: any) {
  let diffKeys = [];

  for (let key in obj1) {
    if (typeof obj1[key] === "object" && obj1[key] !== null && obj2[key]) {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diffKeys.push(key);
      }
    } else if (obj1[key] !== obj2[key]) {
      diffKeys.push(key);
    }
  }

  for (let key in obj2) {
    if (obj1[key] === undefined && obj2[key] !== undefined) {
      diffKeys.push(key);
    }
  }

  return diffKeys;
}

export function changedPropertiesOnly(obj1: any, obj2: any) {
  let diff: any = {};

  for (let key in obj1) {
    if (typeof obj1[key] === "object" && obj1[key] !== null && obj2[key]) {
      const nestedDiff = deepDiff(obj1[key], obj2[key]);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (obj1[key] !== obj2[key]) {
      diff[key] = obj1[key];
    }
  }

  for (let key in obj2) {
    if (obj1[key] === undefined && obj2[key] !== undefined) {
      diff[key] = obj2[key];
    }
  }

  return diff;
}

export function sortPropertiesByOrder(obj: any) {
  const entries = Object.entries(obj);
  //@ts-ignore
  const sortedEntries = entries
    .filter(([, value]) => value.visibility !== false)
    .sort(([, a], [, b]) => a.order - b.order);
  const sortedObj = Object.fromEntries(sortedEntries);
  return sortedObj;
}

export function getNextInLoop(list: any, index: number) {
  const nextIndex = index + 1;
  if (nextIndex < list.length) {
    return list[nextIndex];
  }
  return list[0];
}

export function removeDuplicatesById(items: any[]) {
  return items.filter((item, index, arr) => {
    return index === arr.findIndex((other) => other.id === item.id);
  });
}

export function objIsEmpty(obj: any) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export function isValidArray(arr: any[]) {
  return arr && Array.isArray(arr) && arr.length > 0;
}
