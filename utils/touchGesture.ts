import { get, writable } from "svelte/store";
export const swipeIsRefreshing: any = writable(false);
let initialX: any = null;
let initialY: any = null;
let scrollTop: any;
// console.log("SwipeisRefreshing is", get(swipeIsRefreshing));
export function startTouch(e: any) {
  // console.log("Current Target ID", e.currentTarget.id);
  // console.log("Scroll Top", e.currentTarget.scrollTop);
  scrollTop =
    e.currentTarget.scrollTop === 0 &&
    e.currentTarget.parentElement.scrollTop === 0;
  initialX = e.touches[0].clientX;
  initialY = e.touches[0].clientY;
}
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
    // console.log("minDistance is", minDistance);
  }
  var currentX = e.touches[0].clientX;
  var currentY = e.touches[0].clientY;

  var diffX = initialX - currentX;
  var diffY = initialY - currentY;
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (Math.abs(diffX) < minDistance) return;
    if (diffX > 0) {
      // console.log("Touch Gesture swiped left");
      if (swipeLeftAction == "pullLeft") {
        return diffX;
      } else if (swipeLeftAction) {
        await swipeLeftAction();
        // console.log("swipeLeftAction Happened");
      }
    } else {
      // console.log("Touch Gesture swiped right");
      if (swipeRightAction == "pullRight") {
        return diffX;
      } else if (
        (swipeRightAction ? true : false) &&
        (minDistance > 0 || Math.abs(diffX) >= 60)
      ) {
        await swipeRightAction();
        // console.log("swipeRightAction Happened");
      }
      return;
    }
  } else {
    if (Math.abs(diffY) < minDistance) return;
    if (diffY > 0) {
      // console.log("Touch Gesture swiped up");
      if (swipeUpAction) {
        await swipeUpAction();
        // console.log("swipeUpAction Happened");
      }
    } else {
      // console.log("Touch Gesture swiped down");
      // console.log("scrollTop is", scrollTop);
      // console.log("SwipeisRefreshing is", get(swipeIsRefreshing));
      if (
        swipeDownAction &&
        scrollTop &&
        !get(swipeIsRefreshing) &&
        (minDistance > 0 || Math.abs(diffY) >= 60)
      ) {
        initialX = null; //not redundant, used to stop touchmove immediately being further executed due to awaits
        initialY = null; //not redundant, used to stop touchmove immediately being further executed due to awaits
        swipeIsRefreshing.set(true);
        await swipeDownAction();
        // console.log("swipeDownAction Happened");
        swipeIsRefreshing.set(false);
      }
      return;
    }
  }

  initialX = null;
  initialY = null;

  e.preventDefault();
}
