let cachedPosition: GeolocationPosition | null = null;

let cacheTimestamp: number = 0;

const CACHE_DURATION = 2 * 60 * 60 * 1000;

const GEOLOCATION_TIMEOUT = 3000;

/** Returns a cached position or requests a bounded browser geolocation lookup. */
export function getGeoLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === "undefined") {
      reject("Geolocation is not available in server environment.");
      return;
    }

    const now = Date.now();
    if (cachedPosition && now - cacheTimestamp < CACHE_DURATION) {
      resolve(cachedPosition);
      return;
    }

    if (navigator.geolocation) {
      let isSettled = false;
      const finish = (
        callback: typeof resolve | typeof reject,
        value: GeolocationPosition | GeolocationPositionError | Error
      ) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeout);
        callback(value as GeolocationPosition);
      };
      const timeout = setTimeout(() => {
        finish(reject, new Error("Geolocation request timed out."));
      }, GEOLOCATION_TIMEOUT);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          cachedPosition = position;
          cacheTimestamp = now;
          finish(resolve, position);
        },
        (error) => {
          finish(reject, error);
        },
        {
          maximumAge: CACHE_DURATION,
          timeout: GEOLOCATION_TIMEOUT
        }
      );
    } else {
      reject("Geolocation is not supported by this browser.");
    }
  });
}
