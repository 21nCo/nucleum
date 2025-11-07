// Vite plugin to handle shared static assets from static

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function staticPlugin(options = {}) {
  const { outputDir = "static" } = options;

  return {
    name: "static-plugin",
    buildStart() {
      console.log("🔄 Setting up shared static assets...");
    },
    generateBundle(options, bundle) {
      // Copy static assets to build output
      const sourceDir = __dirname;
      const targetDir = path.join(options.dir || "build", outputDir);

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy assets
      const copyAssets = (src, dest) => {
        const items = fs.readdirSync(src);

        items.forEach((item) => {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          const stat = fs.statSync(srcPath);

          if (stat.isDirectory() && !["node_modules", ".git"].includes(item)) {
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true });
            }
            copyAssets(srcPath, destPath);
          } else if (
            stat.isFile() &&
            !item.endsWith(".js") &&
            !item.endsWith(".json") &&
            !item.startsWith(".")
          ) {
            fs.copyFileSync(srcPath, destPath);
          }
        });
      };

      copyAssets(sourceDir, targetDir);
      console.log(`✅ Copied shared static assets to ${targetDir}`);
    },
    configureServer(server) {
      // Serve static assets during development
      // This middleware should run before SvelteKit's router
      server.middlewares.use("/static", (req, res, next) => {
        // When using .use("/static", handler), req.url is relative to the mount point
        // So /static/fonts/file.woff2 becomes /fonts/file.woff2 in req.url
        const relativePath = req.url;
        const filePath = path.join(__dirname, relativePath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.statusCode = 200;

          // Set correct Content-Type for various file types
          if (filePath.endsWith(".svg")) {
            res.setHeader("Content-Type", "image/svg+xml");
          } else if (filePath.endsWith(".png")) {
            res.setHeader("Content-Type", "image/png");
          } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
            res.setHeader("Content-Type", "image/jpeg");
          } else if (filePath.endsWith(".ico")) {
            res.setHeader("Content-Type", "image/x-icon");
          } else if (filePath.endsWith(".mp3")) {
            res.setHeader("Content-Type", "audio/mpeg");
          } else if (filePath.endsWith(".wav")) {
            res.setHeader("Content-Type", "audio/wav");
          } else if (filePath.endsWith(".woff2")) {
            res.setHeader("Content-Type", "font/woff2");
          } else if (filePath.endsWith(".woff")) {
            res.setHeader("Content-Type", "font/woff");
          } else if (filePath.endsWith(".ttf")) {
            res.setHeader("Content-Type", "font/ttf");
          } else if (filePath.endsWith(".otf")) {
            res.setHeader("Content-Type", "font/otf");
          }

          const stream = fs.createReadStream(filePath);
          stream.on("error", () => {
            res.statusCode = 404;
            res.end();
          });
          stream.pipe(res);
        } else {
          next();
        }
      });
    }
  };
}
