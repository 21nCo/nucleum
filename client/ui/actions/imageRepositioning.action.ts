import { spring } from "svelte/motion";
import type { Spring } from "svelte/motion";

interface ImageRepositionerOptions {
  aspectRatio?: number;
  axis?: "x" | "y";
  initialPosition?: number;
  onPositionChange?: (position: number) => void;
  enabled?: boolean;
  isApplyCursorStyle?: boolean;
}

export function imageRepositioner(
  node: HTMLElement,
  options: ImageRepositionerOptions = {}
) {
  let {
    aspectRatio = 16 / 9,
    axis = "y",
    initialPosition = 50,
    onPositionChange = () => {},
    enabled = true,
    isApplyCursorStyle = false
  } = options;

  const position: Spring<number> = spring(initialPosition);
  let dragging = false;
  let startPos: number;
  let startValue: number;
  let currentPosition = initialPosition;

  function setPosition(pos: number) {
    const newPos = Math.max(0, Math.min(100, pos));
    position.set(newPos);
    onPositionChange(newPos);
  }

  function updateImagePosition(pos: number) {
    const posString = axis === "x" ? `${pos}% 50%` : `50% ${pos}%`;
    node.style.objectPosition = posString;
  }

  function handleMousedown(event: MouseEvent) {
    if (!enabled) return;
    dragging = true;
    startPos = axis === "x" ? event.clientX : event.clientY;
    startValue = currentPosition;
    window.addEventListener("mousemove", handleMousemove);
    window.addEventListener("mouseup", handleMouseup);
  }

  function handleMousemove(event: MouseEvent) {
    if (!dragging || !enabled) return;
    const currentPos = axis === "x" ? event.clientX : event.clientY;
    const delta = currentPos - startPos;
    const containerSize = axis === "x" ? node.offsetWidth : node.offsetHeight;

    const newPosition = startValue - (delta / containerSize) * 100;
    setPosition(newPosition);
  }

  function handleMouseup() {
    dragging = false;
    window.removeEventListener("mousemove", handleMousemove);
    window.removeEventListener("mouseup", handleMouseup);
  }

  function handleTouchstart(event: TouchEvent) {
    handleMousedown(event.touches[0] as unknown as MouseEvent);
  }

  function handleTouchmove(event: TouchEvent) {
    handleMousemove(event.touches[0] as unknown as MouseEvent);
  }

  function updateListeners() {
    if (enabled) {
      node.addEventListener("mousedown", handleMousedown);
      node.addEventListener("touchstart", handleTouchstart);
      node.addEventListener("touchmove", handleTouchmove);
      node.addEventListener("touchend", handleMouseup);
      if (isApplyCursorStyle) {
        node.style.cursor = axis === "x" ? "ew-resize" : "ns-resize";
      }
      node.style.objectFit = "cover";
      node.style.userSelect = "none";
      if (node.tagName !== "IMG") {
        node.style.aspectRatio = aspectRatio.toString();
        node.style.overflow = "hidden";
      }
    } else {
      node.removeEventListener("mousedown", handleMousedown);
      node.removeEventListener("touchstart", handleTouchstart);
      node.removeEventListener("touchmove", handleTouchmove);
      node.removeEventListener("touchend", handleMouseup);
      window.removeEventListener("mousemove", handleMousemove);
      window.removeEventListener("mouseup", handleMouseup);
      if (isApplyCursorStyle) {
        node.style.cursor = "default";
      }
      node.style.removeProperty("object-fit");
      node.style.removeProperty("user-select");
      if (node.tagName !== "IMG") {
        node.style.removeProperty("aspect-ratio");
        node.style.removeProperty("overflow");
      }
    }
  }

  updateListeners();

  const unsubscribe = position.subscribe((value) => {
    currentPosition = value;
    updateImagePosition(value);
    onPositionChange(value);
  });

  return {
    update(newOptions: ImageRepositionerOptions) {
      ({
        aspectRatio = aspectRatio,
        axis = axis,
        initialPosition = initialPosition,
        onPositionChange = onPositionChange,
        enabled = enabled
      } = newOptions);
      if (node.tagName !== "IMG") {
        node.style.aspectRatio = aspectRatio.toString();
      }
      updateListeners();
      setPosition(initialPosition);
    },
    destroy() {
      node.removeEventListener("mousedown", handleMousedown);
      node.removeEventListener("touchstart", handleTouchstart);
      node.removeEventListener("touchmove", handleTouchmove);
      node.removeEventListener("touchend", handleMouseup);
      window.removeEventListener("mousemove", handleMousemove);
      window.removeEventListener("mouseup", handleMouseup);
      unsubscribe();
    }
  };
}
