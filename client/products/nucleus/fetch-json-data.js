import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import { loadEnv } from "vite";

/**
 * Vite plugin that fetches JSON data during build
 * @param {string} outputPath - Path where the JSON file will be saved
 * @returns {import('vite').Plugin}
 */
export default function fetchJsonPlugin(outputPath) {
  // Initialize variables outside the plugin scope but within the function closure
  let url = "";

  return {
    name: "vite-plugin-fetch-json",
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), "");
      const baseUrl = env.VITE_STATIC_URL || "";
      const envMode = env.VITE_ENV || "live";
      const product = env.VITE_PRODUCT || "nucleus";
      url = `${baseUrl}/static/${product}/${envMode}.json`;

      console.log({
        at: "fetchJsonPlugin",
        url,
        mode: config.mode
      });
    },
    async buildStart() {
      console.log("Fetching JSON from:", url);
      try {
        const response = await fetch(url);
        const data = await response.json();

        const fullOutputPath = path.resolve(process.cwd(), outputPath);
        await fs.writeFile(fullOutputPath, JSON.stringify(data, null, 2));

        console.log("JSON file saved to:", fullOutputPath);
      } catch (error) {
        console.error("Error fetching or saving JSON:", error);
        throw error;
      }
    }
  };
}
