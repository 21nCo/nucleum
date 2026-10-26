export function dispatchCustomEvent(event: string, data: any = {}) {
  window.dispatchEvent(new CustomEvent(event, { detail: data }));
}
