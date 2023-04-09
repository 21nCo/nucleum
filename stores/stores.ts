import { AppMode } from "$lib/tidy/types/appMode.enum"
import type { AppStore } from "$lib/tidy/types/appStore.type"
import { Cloud } from "$lib/tidy/types/cloud.enum"
import type { CustomEvent } from "$lib/tidy/types/event.type"
import { EventType } from "$lib/tidy/types/event.enum"
import { ObjectType } from "$lib/tidy/types/object.enum"
import type { UserPreferences } from "$lib/tidy/types/preferences.type"
import type { Preset } from "$lib/tidy/types/preset.type"
import type { Session, SessionSnapshot, SessionStore, Task } from "$lib/tidy/types/session.type"
import { TaskStatus } from "$lib/tidy/types/taskStatus.enum"
import type { WindowObject } from "$lib/tidy/types/windowObject.type"
import { generateUID, yesterday } from "$lib/tidy/utils"
import { writable } from "svelte/store"
import { persistLocally, retrieveLocally } from "./persistance"
import { SessionPersistance } from "./session.persistance"
import type { ColorScheme } from "$lib/tidy/types/appConstants.type"
//import * as colors from "$lib/theme/colors.cjs"
import { colors } from "$lib/tidy/theme/colors"

export const cloudProvider = writable(Cloud.local)
const sessionPersistance = new SessionPersistance();

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
    theme: "dark-forest",
    colorScheme: lightColorSchemes[0],
    isEnableAgeCounter: false,
    isEnableDailyTarget: false,
    extendDuration: 5,
    dayStart: "00:00",
    birthday: yesterday,
    presets: seedPresets,
    isOnboardingComplete: false,
    isEnableAutoStartInterval: false,
    appMode: AppMode.MINIMAL
})

function initUserPreferences(seed: UserPreferences) {
    const objectType = ObjectType.UserPreferences;
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



export const windowObject = initWindow({ documentHeight: window.innerHeight, documentWidth: window.innerWidth, aspectRatio: window.innerWidth / window.innerHeight, scale: window.innerWidth / 100 })


function initWindow(settings: WindowObject) {
    const { subscribe, set, update } = writable<WindowObject>(settings);
    return {
        subscribe,
        reset: (windowObject: WindowObject) => {
            set(windowObject)
        },
        updateDoumentDimensions: (width: number, height: number) => {
            update((n: WindowObject) => {
                n = { ...n, documentHeight: height, documentWidth: width, aspectRatio: width / height, scale: width / 1000 }
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
export const windowClickEvent = writable(null);

//todo - move this to notification store
export const sessionChangeEvent = writable({ id: 0 });

export const sessionStore = initSessionStore({ currentSessionId: 0, todayFocus: 0, isFocusRunning: false, days: [], streak: 0, currentTasks: [] })

function initSessionStore(seed: SessionStore) {
    const objectType = ObjectType.SessionStoreV2;
    let savedSessionStore = retrieveLocally(objectType)
    const { subscribe, set, update } = writable<SessionStore>(savedSessionStore ?? seed);
    if (!savedSessionStore) persistLocally(objectType, seed)

    const refreshTodayProgress = (n: SessionStore) => {
        const { focus, streak } = sessionPersistance.getProgress()
        n.todayFocus = focus;
        n.streak = streak;
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
            let saved = retrieveLocally(objectType)
            set(saved);
        },
        append: (m: Session) => {
            update((n: SessionStore) => {
                sessionPersistance.createSession(m);
                n.currentTasks = [];
                n.currentSessionId = 0;
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
                n.currentSessionId = 0;
                n.currentTask = "";
                n.isFocusRunning = false;
                n.snapshot = undefined;
                sessionPersistance.resetSnapshot();
                refreshTodayProgress(n)
                return n;
            })
        },
        resetSnapshot: () => {
            update((n: SessionStore) => {
                n.currentSessionId = 0;
                n.isFocusRunning = false;
                n.snapshot = undefined;
                sessionPersistance.resetSnapshot();
                refreshTodayProgress(n)
                return n;
            })
        },
        deleteSession: (id: number) => {
            update((n: SessionStore) => {
                sessionPersistance.deleteSession(id);
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
                sessionPersistance.saveSnapshot(snap);
                return n;
            })
        },
        resumeSession: (id: number) => {
            update((n: SessionStore) => {
                n.currentSessionId = id;
                return n;
            })
        },
        incrementTodayFocus: (x: number) => {
            update((n: SessionStore) => {
                n.todayFocus += x
                return n;
            })
        },
        updateSessionTasks: (id: any, tasks: Task[]) => {
            update((n: SessionStore) => {
                //todo - update session tasks
                persistLocally(objectType, n)
                return n;
            })
        }
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


console.log(import.meta.env)
export const appStore = initAppStore({
    isDebug: import.meta.env.DEV && import.meta.env.VITE_ISDEBUG === "true", appName: "Pointron", appConstants: {
        appModes: ["Minimal", "Journal"],
        themes: ["Clean", "Playful", "Neo brutal", "Glassmorphic"],
        colorSchemes: [...darkColorSchemes, ...lightColorSchemes],
        focusPlaceholderText: ["cooking ice cream", "cleaning wordle", "coding dishes", "showering", "draining umbrella", "commanding alexa"],
        runningOutDuration: 5
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