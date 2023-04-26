import { onDestroy } from 'svelte';
import type { TimePeriod, Session, UserDate } from './types/session.type';
export function formatTime(date: Date) {
    let hours = date?.getHours().toString().padStart(2, "0");
    let minutes = date?.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}


export function onInterval(callback: () => void, milliseconds: number | undefined) {
    const interval = setInterval(callback, milliseconds);
    onDestroy(() => {
        clearInterval(interval);
    });
    //return interval;
}

export function generateUID() {
    return (
        Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    );
}

export function formatSeconds(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    if (hours > 0) return `${hh}:${mm}:${secs}`;
    else return `${mm}:${secs}`;
}
export function formatSecondsToTime(seconds: number, toFixed: number = 2, scale: string = 'hrs', isShowUnits: boolean = true) {
    if (scale === 'hrs') {
        return `${(seconds / (60 * 60)).toFixed(toFixed)} ${isShowUnits ? 'hr' : ''}`;
    } else if (scale === 'min') {
        return `${(seconds / (60)).toFixed(toFixed)} ${isShowUnits ? 'm' : ''}`;
    }
}

export function padToTwo(x: number) {
    return x.toString().padStart(2, "0");
}

let y = new Date()
y.setDate(new Date().getDate() - 1)
export const yesterday = y


export function getUserDate(timestamp: number, dayStart: string = "00:00") {
    let dayStartTimeParts = dayStart.split(":");
    let startHours = +dayStartTimeParts[0];
    let startMinutes = +dayStartTimeParts[1];
    let date = new Date(timestamp)
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let isSameDay = hours >= startHours && minutes >= startMinutes;
    let userDate = { day: date.getDate(), month: date.getMonth(), year: date.getFullYear() };
    userDate = isSameDay ? userDate : getOneDayEarlier(userDate);
    return userDate;
}

export function compareUserDay(x: UserDate, y: UserDate) {
    if (x.day === y.day && x.year === y.year && x.month === y.month) {
        return 0;
    } else if (x.year < y.year || (x.year === y.year && x.month < y.month) || (x.year === y.year && x.month === y.month && x.day < y.day)) {
        return -1;
    } else {
        return 1;
    }
}
export function checkIsToday(x: UserDate, dayStart: string = "00:00") {
    let y = getCurrentUserDate(dayStart);
    return compareUserDay(x, y) === 0;
}
export function checkIsTodayUsingTimestamp(x: number, dayStart: string = "00:00") {
    let y = getCurrentUserDate(dayStart);
    return checkDay(y, x);
}

export function checkDay(day: UserDate, sessionStartTime: number, dayStartSetting: string = "00:00") {
    let calculatedDate = getUserDate(sessionStartTime, dayStartSetting);
    return day.year === calculatedDate.year &&
        day.month === calculatedDate.month &&
        day.day === calculatedDate.day
}

export function getDayStartTime(date: UserDate, dayStart: string = "00:00") {
    const [hours, minutes] = dayStart.split(':').map(Number);
    const day = new Date(date.year, date.month, date.day);
    day.setHours(hours, minutes, 0, 0);
    return day.getTime();
}

export function getOneDayLater(date: UserDate) {
    let currentDate = new Date(date.year, date.month, date.day)
    const oneDayLater = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    return { day: oneDayLater.getDate(), month: oneDayLater.getMonth(), year: oneDayLater.getFullYear() };
}

export function getOneDayEarlier(date: UserDate) {
    let currentDate = new Date(date.year, date.month, date.day)
    const oneDayEarlier = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    return { day: oneDayEarlier.getDate(), month: oneDayEarlier.getMonth(), year: oneDayEarlier.getFullYear() };
}

export function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatUserDate(date: UserDate, format: string = "verbose"): string {
    const dd = date.day.toString().padStart(2, "0");
    const mm = (date.month + 1).toString().padStart(2, "0");
    const yy = String(date.year)//.slice(-2);
    if (format === "yyyy:mm:dd") {
        return `${yy}-${mm}-${dd}`;
    } else if (format === "verbose") {
        return `${dd} ${months[date.month]} ${yy}`;
    }
    return `${yy}-${mm}-${dd}`;
}

export function formatDateRelativeToToday(date: UserDate) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inputDate = new Date(date.year, date.month, date.day);

    const dayDifference = Math.round((+inputDate - +today) / (1000 * 60 * 60 * 24));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (dayDifference === 0) {
        return 'Today';
    } else if (dayDifference === -1) {
        return 'Yesterday';
    } else if (dayDifference <= -2 && dayDifference >= -6) {
        return `Last ${dayNames[inputDate.getDay()]}`;
    } else {
        return formatUserDate(date);
    }
}

export function getDateDifferenceFromToday(date: UserDate) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inputDate = new Date(date.year, date.month, date.day);
    return Math.round((+inputDate - +today) / (1000 * 60 * 60 * 24));
}

export function aggregateFocusFromSessions(sessions: Session[]) {
    let focus = 0;
    sessions.forEach(session => {
        focus += session.focus;
    });
    return focus;
}

export function getCurrentUserDate(dayStart: string = "00:00") {
    const now = new Date().getTime();
    return getUserDate(now, dayStart);
}
export function getJustDate(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function generateSessionId(timestamp: number) {
    return String(Math.floor(timestamp));
}

export function generateBackgroudColor(parentBackgroundIndex: number = 1) {
    let activeBackgroundColor;
    let backgroundColor;
    if (parentBackgroundIndex === 1) {
        activeBackgroundColor = " bg-bgs3";
        backgroundColor = " bg-bgs2";
    } else if (parentBackgroundIndex === 2) {
        activeBackgroundColor = " bg-bgs4";
        backgroundColor = " bg-bgs3";
    } else {
        activeBackgroundColor = " bg-bgs2";
        backgroundColor = " bg-bgs1";
    }
    return { activeBackgroundColor, backgroundColor };
}

export function removeDuplicatesById(items: any[]) {
    return items.filter((item, index, arr) => {
        return index === arr.findIndex(other => other.id === item.id);
    });
}

export function assignSatAndLight(userPreferences: any, selectableColorParams: any) {
    let saturation;
    let lightness;
    if (!userPreferences || !selectableColorParams) return;
    if (userPreferences.colorScheme.isDark) {
        saturation =
            selectableColorParams.darkSaturation;
        lightness =
            selectableColorParams.darkLightness;
    } else {
        saturation =
            selectableColorParams.lightSaturation;
        lightness =
            selectableColorParams.lightLightness;
    }
    return { saturation, lightness }
}