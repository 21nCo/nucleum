import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import { loadEnv } from "vite";

// Path validation utility to prevent directory traversal
function validatePath(inputPath) {
  const normalizedPath = path.normalize(inputPath);
  
  // Find the project root (lib directory)
  const projectRoot = path.resolve(process.cwd(), '../../');
  const resolvedPath = path.resolve(projectRoot, normalizedPath);
  
  // Ensure the resolved path is within the project root
  if (!resolvedPath.startsWith(projectRoot)) {
    throw new Error(`Path traversal attempt detected: ${inputPath}`);
  }
  
  return resolvedPath;
}

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
      // Skip external JSON fetching if URL is not set or is a local path
      if (!url || url.includes('localhost') || url.startsWith('/') || url.startsWith('./')) {
        console.log("Skipping external JSON fetch - creating empty JSON file for development/test:", outputPath);
        
        try {
          // Use validated path to prevent directory traversal
          const fullOutputPath = validatePath(outputPath);
          
          // Create an empty JSON object
          const emptyData = {};
          await fs.writeFile(fullOutputPath, JSON.stringify(emptyData, null, 2));
          
          console.log("Empty JSON file created at:", fullOutputPath);
        } catch (error) {
          console.error("Error creating empty JSON file:", error);
          throw error;
        }
        return;
      }

      console.log("Fetching JSON from:", url);
      try {
        const response = await fetch(url);
        
        // Check for HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();

        // Use validated path to prevent directory traversal
        const fullOutputPath = validatePath(outputPath);
        await fs.writeFile(fullOutputPath, JSON.stringify(data, null, 2));

        console.log("JSON file saved to:", fullOutputPath);
      } catch (error) {
        console.error("Error fetching JSON, creating empty file for development:", error);
        
        try {
          // Fallback: create empty JSON file if external fetch fails
          const fullOutputPath = validatePath(outputPath);
          const emptyData = {};
          await fs.writeFile(fullOutputPath, JSON.stringify(emptyData, null, 2));
          console.log("Fallback empty JSON file created at:", fullOutputPath);
        } catch (fallbackError) {
          console.error("Error creating fallback JSON file:", fallbackError);
          throw fallbackError;
        }
      }
    }
  };
}
