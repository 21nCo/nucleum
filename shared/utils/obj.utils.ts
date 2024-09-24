export function deepDiff(obj1: any, obj2: any, path: string = ""): string[] {
  if (obj1 === obj2) return [];

  if (!(obj1 instanceof Object) || !(obj2 instanceof Object)) return [path];

  const differences: string[] = [];
  const keys = Array.from(
    new Set([...Object.keys(obj1), ...Object.keys(obj2)])
  );

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

// export function sortPropertiesByOrder(obj: any) {
//   const entries = Object.entries(obj);
//   //@ts-ignore
//   const sortedEntries = entries
//     .filter(([, value]) => value.visibility !== false)
//     .sort(([, a], [, b]) => a.order - b.order);
//   const sortedObj = Object.fromEntries(sortedEntries);
//   return sortedObj;
// }

interface SortableProperty {
  visibility?: boolean;
  order: number;
}

export function sortPropertiesByOrder<
  T extends Record<string, SortableProperty>
>(obj: T): Partial<T> {
  const entries = Object.entries(obj);
  const sortedEntries = entries
    .filter(([, value]) => value.visibility !== false)
    .sort(([, a], [, b]) => a.order - b.order);
  return Object.fromEntries(sortedEntries) as Partial<T>;
}

export function sortArrayByOrder(arr: any[]) {
  //console.log("sortArrayByOrder", arr);
  arr = arr.map((item) => {
    item.order = item.order || 0;
    return item;
  });
  return arr.sort((a, b) => a.order - b.order);
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

export function isValidArrayWithData(arr: any[] | undefined) {
  if (arr && Array.isArray(arr) && arr.length > 0) {
    return arr;
  }
  return false;
}
export function isValidAndUniqueArray(arr: any[] | undefined) {
  if (!arr || !isValidArrayWithData(arr)) return false;
  const uniqueIds = new Set();
  for (const item of arr) {
    if (uniqueIds.has(item.id)) {
      return false;
    }
    uniqueIds.add(item.id);
  }
  return true;
}
export function isEmptyArray(arr: any[] | undefined) {
  return arr && Array.isArray(arr) && arr.length === 0;
}
export function isValidArray(arr: any) {
  return arr && Array.isArray(arr);
}

export function isArrayWithSameValue(arr: any[]) {
  return arr.every((val, i, arr) => val === arr[0]);
}

export function deepCopy(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export function compareObjects(obj1: any, obj2: any) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Moves an item in an array to the right or left.
 * @param {Array} array - The original array
 * @param {number} index - The index of the item to move
 * @param {number} direction - 1 for right, -1 for left
 * @returns {Array} A new array with the item moved
 */
export function moveItemInArray(
  array: any[],
  index: number,
  direction: number
) {
  if (index < 0 || index >= array.length) {
    throw new Error("Index out of bounds");
  }

  const newArray = [...array];
  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= array.length) {
    return newArray; // No change if move is out of bounds
  }

  // Swap the elements
  [newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]];

  return newArray;
}
