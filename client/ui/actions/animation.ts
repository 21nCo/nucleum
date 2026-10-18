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
 * A utility function to create an empty transition to be used for conditional transitions
 * @returns
 */
export function emptyTranstition() {
  return {
    duration: 1,
    css: () => `transition: none;`
  };
}
