import { get } from "svelte/store";
import { addressTransport } from "@nucleum/client/runtime/geolocation/address-transport";
import account from "@nucleum/client/runtime/account/account.store";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import context from "@nucleum/client/runtime/context.store";

/** Resolves a display address when the active account permits remote lookup. */
export async function resolveLocationAddress(location: {
  latitude: number;
  longitude: number;
}) {
  if (
    get(account).dataMode === UserDataMode.LOCAL ||
    get(context).isInOfflineMode
  ) {
    return undefined;
  }
  const response = await addressTransport.runGeoAction(
    "lookupAddressFromLatLong",
    {
      lat: location.latitude,
      long: location.longitude
    }
  );
  const results = response?.results ?? [];
  return (
    results.find((result: any) => result.types.includes("premise"))
      ?.formatted_address ??
    results.find((result: any) => result.types.includes("locality"))
      ?.formatted_address
  );
}
