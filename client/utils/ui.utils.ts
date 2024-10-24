import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import QRCode from "qrcode";

/**
 * To add animate class which gets autoremoved after 300ms
 * @param animateClass
 * @param id
 * @returns resolved promise
 */
export function addAnimateClass(
  animateClass: string,
  id: string
): Promise<void> {
  return new Promise((resolve) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.add(animateClass);
      setTimeout(() => {
        element.classList.remove(animateClass);
        resolve();
      }, 300);
    }
  });
}

/**
 * @deprecated
 * An asynchronous bounce animate function to bounce left or right an element mentioned by an id
 * @param direction
 * @param id
 */
export function bounce(direction: "l" | "r", id: string): Promise<void> {
  return new Promise((resolve) => {
    let element = document.getElementById(id)!;
    if (direction === "l") {
      element.classList.add("animate-bounce-l");
      setTimeout(() => {
        element.classList.remove("animate-bounce-l");
        resolve();
      }, 500);
    } else {
      element.classList.add("animate-bounce-r");
      setTimeout(() => {
        element.classList.remove("animate-bounce-r");
        resolve();
      }, 500);
    }
  });
}
/**
 * Utility function to combine class names
 * @param inputs
 * @returns
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * bg - background utility function
 * @param parentBackgroundIndex
 * @param isActive
 * @returns
 */
export function bg(
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  return isActive
    ? `bg-bgs${parentBackgroundIndex + 2}`
    : `bg-bgs${parentBackgroundIndex + 1}`;
}
/**
 * Active background utility function
 */
export function abg(isActive: boolean = true, parentBgIndex: number = 0) {
  return isActive ? "bg-aps1 text-abg" : bg(parentBgIndex);
}
/**
 * A utility function to create an empty transition to be used for conditional transitions
 * @returns
 */
export function emptyTranstition() {
  return {
    duration: 1,
    css: () => `transition: none;`
  };
}

export async function paintQRCode(
  canvas: HTMLCanvasElement,
  url: string,
  width: number
) {
  if (!canvas || !url || !width) return;
  await QRCode.toCanvas(canvas, url, {
    width: width,
    margin: 0,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  });
}


export function convertToRGBA(color: string, opacity: number) {
  if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  const tempElem = document.createElement('div');
  tempElem.style.color = color;
  document.body.appendChild(tempElem);
  const rgbColor = getComputedStyle(tempElem).color;
  document.body.removeChild(tempElem);
  return rgbColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
}
