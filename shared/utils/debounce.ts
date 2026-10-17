/**
 * Used to create a debounced version of a function so that the uneccessary calls to that function can be reduced. Closure is used to remember the previous timer. "this" is used here to remember the context of the func passed and "apply" is used to apply the remembered context.
 * @summary To create a debounced version of a function.
 * @param func the function to be debounced
 * @param timeout recycled wait time before the function is called
 * @returns {Function} the debounced function
 */
export function debouncer(func: any, timeout: number) {
  let timer: any;
  return function (this: any, ...args: any) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
