import { TimerMode } from "$lib/tidy/types/timerMode.enum"
import type { AppStore } from "$lib/tidy/types/appStore.type"
import { Cloud } from "$lib/tidy/types/cloud.enum"
import type { CustomEvent } from "$lib/tidy/types/event.type"
import { EventType } from "$lib/tidy/types/event.enum"
import { ItemType } from "$lib/tidy/types/item.enum"
import type { UserPreferences } from "$lib/tidy/types/preferences.type"
import type { Preset } from "$lib/tidy/types/preset.type"
import type { Session, SessionSnapshot, SessionStore, Task } from "$lib/tidy/types/session.type"
import type { WindowObject } from "$lib/tidy/types/windowObject.type"
import { generateUID, yesterday } from "$lib/tidy/utils"
import { get, writable } from "svelte/store"
import { Persistance, persistLocally, retrieveLocally } from "./persistance"
import { SessionPersistance } from "./session.persistance"
import type { ColorScheme, selectableColorParams } from "$lib/tidy/types/appConstants.type"
//import * as colors from "$lib/theme/colors.cjs"
import { colors } from "$lib/tidy/theme/colors"
import type { DragAndDrop } from "$lib/tidy/types/draganddrop.type"
import { DragStatus } from "$lib/tidy/types/dragstatus.enum"
import type { Tag } from "../types/tag.type"
import { TaskPersistance } from "./task.persistance"

export const cloudProvider = writable(Cloud.local)
const persistance = new Persistance();
const sessionPersistance = new SessionPersistance();
const taskPersistance = new TaskPersistance();
const seedPresets = [
    // { id: generateUID(), rounds: 1, duration: 5, brek: 2 },
    { id: generateUID(), rounds: 3, duration: 10, brek: 2 },
    { id: generateUID(), rounds: 4, duration: 25, brek: 5 },
    { id: generateUID(), name: "hackathon", rounds: 4, duration: 10, brek: 2, additional: [{ id: generateUID(), rounds: 1, duration: 20, brek: 0 }, { id: generateUID(), rounds: 1, duration: 20, brek: 0 }, { id: generateUID(), rounds: 1, duration: 20, brek: 0 }, { id: generateUID(), rounds: 1, duration: 20, brek: 0 }] },
    // { id: generateUID(), rounds: 3, duration: 50 * 60, brek: 2 * 60 },
    // { id: generateUID(), rounds: 4, duration: 10 * 60, brek: 2 * 60 },
    // { id: generateUID(), rounds: 3, duration: 50 * 60, brek: 2 * 60 },
    // { id: generateUID(), rounds: 4, duration: 10 * 60, brek: 2 * 60 },
    // { id: generateUID(), rounds: 3, duration: 50 * 60, brek: 2 * 60 },
    // { id: generateUID(), rounds: 4, duration: 10 * 60, brek: 2 * 60 },
    // { id: generateUID(), rounds: 3, duration: 50 * 60, brek: 2 * 60 },
];


const darkColorSchemes: ColorScheme[] = [
    { label: "dark", theme: "clean", isDark: true, ...colors.dark }, { label: "dracula", theme: "clean", isDark: true, ...colors.dracula }, { label: "forest", theme: "clean", isDark: true, ...colors.forest }, { label: "sea", theme: "clean", isDark: true, ...colors.sea }, { label: "dim", theme: "clean", isDark: true, ...colors.dim },
]

//{ label: "FBF8F1", isDark: false }
const lightColorSchemes: ColorScheme[] = [
    { label: "light", theme: "clean", isDark: false, ...colors.light }, { label: "smooth", theme: "clean", isDark: false, ...colors.smooth }, { label: "grainy", theme: "clean", isDark: false, ...colors.grainy }
]


export const userPreferences = initUserPreferences({
    nickName: "",
    theme: "Clean",
    colorScheme: lightColorSchemes[0],
    isEnableAgeCounter: false,
    isEnableDailyTarget: false,
    extendDuration: 5,
    dayStart: "00:00",
    birthday: yesterday,
    presets: seedPresets,
    isOnboardingComplete: false,
    isEnableAutoStartInterval: false,
    timerMode: TimerMode.MINIMAL,
    tempColorScheme: "scheme1"
})

function initUserPreferences(seed: UserPreferences) {
    const objectType = ItemType.UserPreferences;
    let savedPreferences = retrieveLocally(objectType)
    const { subscribe, set, update } = writable<UserPreferences>(savedPreferences ?? seed);
    if (!savedPreferences) persistLocally(objectType, seed)
    return {
        subscribe,
        set: (m: UserPreferences) => {
            persistLocally(objectType, m)
            set(m);
        },
        reload: () => {
            let savedPreferences = retrieveLocally(objectType)
            set(savedPreferences);
        },
        updateDayStart: (m: string) => {
            update((n: UserPreferences) => {
                n = { ...n, dayStart: m }
                persistLocally(objectType, n)
                return n;
            })
        },
        updatePreset: (preset: Preset) => {
            update((m: UserPreferences) => {
                let n = m.presets;
                let currentPresetIndex = n.findIndex(p => p.id == preset.id)
                let presetsToRight = n.slice(currentPresetIndex + 1)
                n = n.slice(0, currentPresetIndex)
                n = [...n, preset]
                n = n.concat(presetsToRight)
                m.presets = n;
                persistLocally(objectType, m)
                return m;
            })
        },
        remove: (presetId: string) => {
            update((m: UserPreferences) => {
                let n = m.presets;
                n = n.filter((x: Preset) => x.id != presetId)
                m.presets = n;
                persistLocally(objectType, m)
                return m;
            })
        },
        addPreset: (preset: Preset) => {
            update(n => {
                n.presets.push(preset)
                persistLocally(objectType, n)
                return n
            })
        }
    }
}



export const windowObject = initWindow({ documentHeight: window.innerHeight, documentWidth: window.innerWidth, landscapiness: window.innerWidth / window.innerHeight, scale: window.innerWidth / 100, isInPortrait: false, isInThinMode: false })


function initWindow(settings: WindowObject) {
    const { subscribe, set, update } = writable<WindowObject>(settings);
    return {
        subscribe,
        reset: (windowObject: WindowObject) => {
            set(windowObject)
        },
        updateDoumentDimensions: (width: number, height: number) => {
            update((n: WindowObject) => {
                n = { ...n, documentHeight: height, documentWidth: width, landscapiness: width / height, scale: ((width / 1000) + (height / 1000)) / 2, isInThinMode: false }
                n.isInPortrait = n.landscapiness < 1;
                n.isInThinMode = n.landscapiness < 0.75;
                return n;
            })
        },
        toggleTopBar: (isMinimal: boolean) => {
            update((n: WindowObject) => {
                n = { ...n, isMinimalTopBar: isMinimal }
                return n;
            })
        },
    }
}

export const appearancePopover = writable({ visible: true });
export const dragAndDropStore = writable<DragAndDrop>({ dragItem: {}, dropItem: {}, dragEnterItem: {}, dragStatus: DragStatus.NONE });

export const windowClickEvent = writable(null);




export const todayFocusStore = initTodayFocus();


function initTodayFocus() {
    const { subscribe, set, update } = writable(0);
    return {
        subscribe,
        set,
        incrementTodayFocus: (x: number) => {
            update((n: number) => {
                n += x
                return n;
            })
        },
    }
}

//todo - move this to notification store
export const sessionChangeEvent = writable<{ id: string | null }>({ id: null });

export const sessionStore = initSessionStore({ currentSessionId: null, currentTaskId: null, todayFocus: 0, isFocusRunning: false, days: [], streak: 0 })

function initSessionStore(seed: SessionStore) {
    const objectType = ItemType.SessionStoreV2;
    const persist = (n: SessionStore) => {
        persistLocally(objectType, n);
    }
    const retrieve = () => {
        return retrieveLocally(objectType);
    }
    let savedSessionStore = retrieve()
    const { subscribe, set, update } = writable<SessionStore>(savedSessionStore ?? seed);
    if (!savedSessionStore) persist(seed)

    const refreshTodayProgress = (n: SessionStore) => {
        const { focus, streak } = sessionPersistance.getProgress()
        n.todayFocus = focus;
        n.streak = streak;
        return n;
    }
    const reset = (n: SessionStore) => {
        n.currentSessionId = null;
        n.isFocusRunning = false;
        n.snapshot = undefined;
        currentTaskStore.reset();
        n.currentTaskId = null;
        n.currentTaskWorked = 0;
        persist(n);
        return n;
    }

    return {
        subscribe,
        set: (m: SessionStore) => {
            set(m);
        },
        reset: () => {
            set(seed);
        },
        reload: () => {
            let saved = retrieve()
            set(saved);
        },
        finishSession: (m: Session) => {
            update((n: SessionStore) => {
                persistance.create(m, ItemType.Sessions);
                const tasks = get(currentTaskStore)?.map((t: Task) => { t.sessionId = m.id; return t; });
                if (tasks && tasks.length > 0) {
                    taskPersistance.createTasks(tasks);
                }
                n = reset(n);
                return n;
            })
        },
        resumeFocus: () => {
            update((n: SessionStore) => {
                n.isFocusRunning = true;
                return n;
            })
        },
        pauseFocus: () => {
            update((n: SessionStore) => {
                n.isFocusRunning = false;
                return n;
            })
        },
        resetSession: () => {
            update((n: SessionStore) => {
                n = reset(n);
                refreshTodayProgress(n)
                return n;
            })
            appEvents.notify(EventType.REFRESH_TIMELINE);
        },
        deleteSession: (id: string) => {
            update((n: SessionStore) => {
                persistance.delete(id, ItemType.Sessions);
                refreshTodayProgress(n);
                n.isFocusRunning = false;
                return n;
            })
        },
        refreshTodayProgressAndStreak: () => {
            update((n: SessionStore) => {
                n.isFocusRunning = false;
                refreshTodayProgress(n);
                return n;
            })
        },
        snapshot: (snap: SessionSnapshot) => {
            update((n: SessionStore) => {
                n.snapshot = snap;
                if (n.currentTaskWorked != undefined && n.isFocusRunning) n.currentTaskWorked += 1;
                persist(n);
                return n;
            })
        },
        startTask: (id: string, previousWorked: number) => {
            update((n: SessionStore) => {
                n.currentTaskWorked = previousWorked;
                n.currentTaskId = id;
                appEvents.notify(EventType.TASK_START);
                persist(n);
                return n;
            })
        },
        stopTask: () => {
            update((n: SessionStore) => {
                n.currentTaskId = null;
                n.currentTaskWorked = 0;
                persist(n);
                return n;
            })
        },

    }
}

export const currentTaskStore = initCurrentTaskStore()

function initCurrentTaskStore() {
    const objectType = ItemType.CurrentTask;
    const persist = (n: Task[]) => {
        persistLocally(objectType, n);
    }
    const retrieve = () => {
        return retrieveLocally(objectType);
    }
    const seed = retrieve();
    const { subscribe, set, update } = writable<Task[]>(seed ?? []);
    return {
        subscribe,
        set: (m: Task[]) => {
            set(m);
        },
        reset: () => {
            set([]);
            persist([]);
        },
        updateTask: (task: Task) => {
            update((n: Task[]) => {
                if (n && n.length > 0) {
                    n = n.filter(t => t.id != task.id);
                    n.push(task);
                }
                persist(n);
                return n;
            })
        },
        updateCurrentTasks: (tasks: Task[]) => {
            update((n: Task[]) => {
                n = tasks;
                persist(n);
                return n;
            })
        },
        deleteTask: (id: string) => {
            update((n: Task[]) => {
                if (n && n.length > 0) {
                    n = n.filter(t => t.id != id);
                }
                persist(n);
                return n;
            })
        },
    }
}

export const appEvents = initEventStore({ type: EventType.NONE, value: false })

function initEventStore(seed: CustomEvent) {
    const { subscribe, set, update } = writable<CustomEvent>(seed);
    return {
        subscribe,
        set: (m: CustomEvent) => {
            set(m);
        },
        notify: (m: EventType, value: any = undefined) => {
            update((n: CustomEvent) => {
                return { ...n, value, type: m };
            })
        }
    }
}

//todo - generate cool placeholders for focus using AI
//"three", "four", "wood","DEF5E5", "EEF1FF", "FBF8F1", "F0ECE3"
//["light", "dark", "dracula", "dark-forest", "light-smooth", "light-grainy"]
//App modes: minimal, journal, future (3026)
//themes: clean, playful, neomorphic, neobrutal, glassmorphic

const tempColorSchemes = ['scheme1', 'scheme2', 'scheme3', 'scheme4', 'scheme5', 'scheme6', 'scheme7', 'scheme8', 'scheme9', 'scheme10', 'scheme11']


//HSL - dark: x, 30, 50   light: x, 60, 70
const selectableColors = [
    { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
    { id: generateUID(), darkHex: "#85dde0", lightHex: "#59a3a6" },
    { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
    { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
    { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
    { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
]

const selectableColorParams: selectableColorParams = {
    darkSaturation: 60,
    darkLightness: 70,
    lightSaturation: 30,
    lightLightness: 50
}

export const appStore = initAppStore({
    isDebug: import.meta.env.DEV && import.meta.env.VITE_ISDEBUG === "true",
    tailwindTheme: "clean light", appName: "Pointron", appConstants: {
        timerModes: ["Minimal", "Journal"],
        themes: ["Clean", "Colorful", "3026"],
        colorSchemes: [...darkColorSchemes, ...lightColorSchemes],
        focusPlaceholderText: ["cooking ice cream", "cleaning wordle", "coding dishes", "showering", "draining umbrella", "commanding alexa"],
        runningOutDuration: 5,
        tempColorSchemes,
        selectableColorParams

    }
})

function initAppStore(seed: AppStore) {
    const { subscribe, set, update } = writable<AppStore>(seed);
    return {
        subscribe,
        set: (m: AppStore) => {
            set(m);
        },
        update
    }
}

export const tagStore = initTagStore();

function initTagStore() {
    const objectType = ItemType.Tag;
    const savedTags = persistance.retrieve(objectType);
    const { subscribe, set, update } = writable<Tag[]>(savedTags ?? []);
    const refresh = () => {
        return persistance.retrieve(objectType);
    }
    return {
        subscribe,
        set,
        create: (tag: Tag) => {
            persistance.create(tag, objectType);
            update((x: Tag[]) => {
                x.push(tag);
                return x;
            })
        },
        update: (tag: Tag) => {
            persistance.update(tag, objectType);
            update((x: Tag[]) => {
                x = x.filter(t => t.id != tag.id);
                x.push(tag);
                return x;
            })
        },
        delete: (id: string) => {
            persistance.delete(id, objectType);
            update((x: Tag[]) => {
                x = x.filter(t => t.id != id);
                return x;
            })
        },
        retrieve: () => {
            subscribe((x: Tag[]) => {
                return x;
            });
        },
        search: (query: string) => {

        }
    }
}

export const oasisOidcConfig = {
    authority: "https://auth.oasislabs.com",
    // Replace with your app's frontend client ID.
    client_id: import.meta.env.VITE_OASIS_CLIENT_ID,
    redirect_uri: `${window.location.origin}/play`,
    response_type: "code",
    scope: "openid profile email parcel.public",
    filterProtocolClaims: false,
    loadUserInfo: false,
    extraQueryParams: {
        audience: "https://api.oasislabs.com/parcel",
    },
    extraTokenParams: {
        audience: "https://api.oasislabs.com/parcel",
    },
};



export const seedSessions = [
    {
        elapsed: 60 * 60,
        focus: 47 * 60,
        brek: 13 * 60,
        extended: 0,
        startTime: new Date(2022, 1, 11, 13),
        endTime: new Date(2022, 1, 11, 14),
        id: new Date(2022, 1, 11, 13).getTime(),
        intention: ""
    },
    {
        elapsed: 60 * 60,
        focus: 47 * 60,
        brek: 13 * 60,
        extended: 0,
        startTime: new Date(2022, 1, 11, 14, 30),
        id: new Date(2022, 1, 11, 14, 30).getTime(),
        endTime: new Date(2022, 1, 11, 17),
        intention: "ID Card insurance project"
    },
    {
        elapsed: 60 * 60,
        focus: 47 * 60,
        brek: 13 * 60,
        extended: 0,
        startTime: new Date(2022, 1, 11, 17),
        id: new Date(2022, 1, 11, 17).getTime(),
        endTime: new Date(2022, 1, 11, 17, 32),
        intention: "de picto"
    },
    {
        elapsed: 60 * 60,
        focus: 47 * 60,
        brek: 13 * 60,
        extended: 0,
        startTime: new Date(2022, 1, 11, 19, 21),
        id: new Date(2022, 1, 11, 19, 21).getTime(),
        endTime: new Date(2022, 1, 11, 23),
        intention: ""
    }
]

export const seedTasks =
    [
        { label: "first task", estimate: 0, workedFor: 15, checked: true },
        { label: "second sdfasdfs task", estimate: 35, workedFor: 15, checked: false, isInprogress: true },
        { label: "third task", estimate: 35, workedFor: 45, checked: false }
    ]