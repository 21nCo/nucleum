import { ValidationError } from "$lib/server/common/errors";

export function geoApi(body: any, agent: any) {
  if (!body.method) throw new ValidationError("method is required");
  if (body.method === "lookupAddressFromLatLong") {
    if (!body.lat || !body.long)
      throw new ValidationError("lat and long are required");
    return lookupAddressFromLatLong(body.lat, body.long);
  }
}

export function lookupAddressFromLatLong(lat: number, long: number) {
  const googleApiKey = process.env.GOOGLE_GEO_API_KEY;
  return fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${googleApiKey}`
  ).then((response) => response.json());
}
