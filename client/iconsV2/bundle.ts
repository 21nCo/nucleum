import { parse } from "$lib/shared/utils/json.utils";
import {
  bundleNumber,
  iconSets,
  phIcons,
  lucideIconsForBundling,
  solarIconsForBundling
} from "./icons-list";
import { locate } from "@iconify/json";
import { getIconData } from "@iconify/utils";
import { readFile, unlink, writeFile } from "fs/promises";

const version = bundleNumber;
const isExtension = false;

const spriteContentStart =
  '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">';

/**
 * Notes:
 * Limitation with animated svg icons via sprite. Therefore directly using svgs for svg-spinners.
 */
async function buildIconSprite() {
  let spriteContent = spriteContentStart;

  for (const setName of Object.keys(iconSets)) {
    const filename = locate(setName);
    const icons = parse(await readFile(filename, "utf8"));
    spriteContent = addIconsToSprite(
      spriteContent,
      icons,
      setName,
      new Set(iconSets[setName as keyof typeof iconSets])
    );
  }
  await build(spriteContent, "sprite");
}

async function buildPhSprite() {
  const filename = locate("ph");
  const icons = parse(await readFile(filename, "utf8"));
  for (const [key, value] of Object.entries(phIcons)) {
    let spriteContent = spriteContentStart;
    spriteContent = addIconsToSprite(
      spriteContent,
      icons,
      "ph",
      new Set(value)
    );
    await build(spriteContent, "sprite-ph-" + key);
  }
}

async function buildLucideSprite() {
  const filename = locate("lucide");
  const icons = parse(await readFile(filename, "utf8"));
  for (const [key, value] of Object.entries(lucideIconsForBundling)) {
    let spriteContent = spriteContentStart;
    spriteContent = addIconsToSprite(
      spriteContent,
      icons,
      "lucide",
      new Set(value)
    );
    await build(spriteContent, "sprite-lucide-" + key);
  }
}

async function buildSolarSprite() {
  const filename = locate("solar");
  const icons = parse(await readFile(filename, "utf8"));
  for (const [key, value] of Object.entries(solarIconsForBundling)) {
    let spriteContent = spriteContentStart;
    spriteContent = addIconsToSprite(
      spriteContent,
      icons,
      "solar",
      new Set(value)
    );
    await build(spriteContent, "sprite-solar-" + key);
  }
}

async function build(spriteContent: string, prefix: string) {
  await deletePreviousVersions(prefix, version);
  spriteContent += "</svg>";
  await writeFile(resolveFullPath(prefix), spriteContent);
}

async function deletePreviousVersions(prefix: string, version: number) {
  for (let v = 1; v < version; v++) {
    try {
      await unlink(resolveFullPath(prefix, v));
      console.log(`Deleted ${prefix}-v${v}.svg`);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Error deleting ${prefix}-v${v}.svg:`, error);
      }
    }
  }
}

function addIconsToSprite(
  spriteContent: string,
  set: any,
  setName: string,
  iconNames: Set<string>
) {
  for (const iconName of iconNames) {
    const iconData = getIconData(set, iconName);
    if (iconData) {
      let iconBody = iconData.body;

      if (setName === "heroicons" || setName === "mynaui") {
        iconBody = iconBody.replace(
          /stroke-width="[^"]*"/g,
          'stroke-width="1.2"'
        );
      }
      if (setName === "hugeicons") {
        iconBody = iconBody.replace(
          /stroke-width="[^"]*"/g,
          'stroke-width="1"'
        );
      }
      if (setName === "lucide") {
        iconBody = iconBody.replace(
          /stroke-width="[^"]*"/g,
          'stroke-width="1.2"'
        );
      }

      spriteContent += `
        <symbol id="${setName}:${iconName}" viewBox="0 0 ${iconData.width} ${iconData.height}">
          ${iconBody}
        </symbol>
      `;
    }
  }
  console.log(`${setName}: ${iconNames.size} icons added to sprite`);
  return spriteContent;
}

function resolveFullPath(prefix: string, versionParam?: number) {
  if (isExtension) {
    return `./../../../assets/icons/${prefix}.svg`;
  }
  return `./../static/icons/${prefix}-v${versionParam ?? version}.svg`;
}

buildIconSprite();
buildPhSprite();
buildLucideSprite();
buildSolarSprite();
