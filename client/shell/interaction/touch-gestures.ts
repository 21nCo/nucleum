import { get, writable } from "svelte/store";
/** Defines swipe is refreshing. */
export const swipeIsRefreshing: any = writable(false);
let initialX: any = null;
let initialY: any = null;
let scrollTop: any;

/** Start touch. */
export function startTouch(e: any) {
  if (e.currentTarget.id == "focusItems") return;

  scrollTop =
    e.currentTarget.scrollTop === 0 &&
    e.currentTarget.parentElement.scrollTop === 0;
  initialX = e.touches[0].clientX;
  initialY = e.touches[0].clientY;
}
/** Move touch. */
export async function moveTouch(
  e: any,
  swipeUpAction: any = null,
  swipeRightAction: any = null,
  swipeDownAction: any = null,
  swipeLeftAction: any = null,
  minDistance: number = 60
) {
  if (initialX === null) {
    return;
  }

  if (initialY === null) {
    return;
  }
  if (swipeLeftAction == "pullLeft" || swipeRightAction == "pullRight") {
    minDistance = 0;
  }
  var currentX = e.touches[0].clientX;
  var currentY = e.touches[0].clientY;

  var diffX = initialX - currentX;
  var diffY = initialY - currentY;
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (Math.abs(diffX) < minDistance) return;
    if (diffX > 0) {
      if (swipeLeftAction == "pullLeft") {
        return diffX;
      } else if (swipeLeftAction) {
        await swipeLeftAction();
      }
    } else {
      if (swipeRightAction == "pullRight") {
        return diffX;
      } else if (
        (swipeRightAction ? true : false) &&
        (minDistance > 0 || Math.abs(diffX) >= 60)
      ) {
        await swipeRightAction();
      }
      return;
    }
  } else {
    if (Math.abs(diffY) < minDistance) return;
    if (diffY > 0) {
      if (swipeUpAction) {
        await swipeUpAction();
      }
    } else {
      if (
        swipeDownAction &&
        scrollTop &&
        !get(swipeIsRefreshing) &&
        (minDistance > 0 || Math.abs(diffY) >= 60)
      ) {
        initialX = null;
        initialY = null;
        swipeIsRefreshing.set(true);
        await swipeDownAction();

        swipeIsRefreshing.set(false);
      }
      return;
    }
  }

  initialX = null;
  initialY = null;

  e.preventDefault();
}
