import { Cloud } from '$lib/tidy/types/cloud.enum'
import type { JsonValue } from '$lib/tidy/types/json.type'
import { ObjectType } from '$lib/tidy/types/object.enum'
import { get, writable } from 'svelte/store'
import { cloudProvider } from './stores'


export const localStore = <T extends JsonValue>(key: string, initial: T) => {
    const toString = (value: T) => JSON.stringify(value, null, 2)

    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, toString(initial))
    }

    const saved = JSON.parse(localStorage.getItem(key) ?? "")

    const { subscribe, set, update } = writable<T>(saved)

    return {
        subscribe,
        set: (value: T) => {
            localStorage.setItem(key, toString(value))
            return set(value)
        },
        update
    }
}

export function resetLocalStorage() {
    window?.localStorage.clear();
    window?.location.reload();
}

export function persistLocally<T extends JsonValue>(objectType: ObjectType, item: T) {
    window?.localStorage.setItem(ObjectType[objectType], JSON.stringify(item))
}
export function retrieveLocally(objectType: ObjectType) {
    try {
        let value = window?.localStorage.getItem(ObjectType[objectType])
        if (value) {
            return JSON.parse(value);
        }
        else {
            return null;
        }
    }
    catch {
        return null;
    }
}