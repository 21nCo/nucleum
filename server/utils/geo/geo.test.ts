import { describe, it, expect, vi, beforeEach } from "vitest";
import { geoApi, lookupAddressFromLatLong } from "./index";
import { ValidationError } from "$lib/server/common/errors";

describe("geo utils", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubGlobal("process", {
      env: {
        GOOGLE_GEO_API_KEY: "test-api-key"
      }
    });

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({})
      })
    ) as unknown as typeof fetch;
  });

  describe("geoApi", () => {
    it("throws ValidationError when method is missing", () => {
      expect(() => geoApi({}, {})).toThrow(
        new ValidationError("method is required")
      );
    });

    it("throws ValidationError when lat/long are missing for lookupAddressFromLatLong", () => {
      expect(() => geoApi({ method: "lookupAddressFromLatLong" }, {})).toThrow(
        new ValidationError("lat and long are required")
      );
    });

    it("calls lookupAddressFromLatLong with correct parameters", async () => {
      const mockResponse = { formatted_address: "123 Test St" };
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geoApi(
        {
          method: "lookupAddressFromLatLong",
          lat: 40.7128,
          long: -74.006
        },
        {}
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/geocode/json?latlng=40.7128,-74.006&key=test-api-key"
      );
    });
  });

  describe("lookupAddressFromLatLong", () => {
    it("calls Google Geocoding API with correct parameters", async () => {
      const mockResponse = { formatted_address: "123 Test St" };
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await lookupAddressFromLatLong(40.7128, -74.006);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/geocode/json?latlng=40.7128,-74.006&key=test-api-key"
      );
    });
  });
});
