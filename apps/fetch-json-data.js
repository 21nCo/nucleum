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
      console.log("Fetching JSON from:", url);
      
      if (!url || !url.startsWith('http')) {
        console.log("🔄 Setting up shared static assets...");
        console.log("⚠️  Skipping fetch in test/dev mode - VITE_STATIC_URL not configured");
        return;
      }
      
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
        console.error("Error fetching or saving JSON:", error);
        throw error;
      }
    }
  };
}
