import { getIconData } from "@iconify/utils";
import { readFile, unlink, writeFile } from "fs/promises";
import { locate } from "@iconify/json";
import { iconSets, phIcons } from "./icons-list";

const version = 2;
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
    const icons = JSON.parse(await readFile(filename, "utf8"));
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
  const icons = JSON.parse(await readFile(filename, "utf8"));
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

async function build(spriteContent: string, prefix: string) {
  await deletePreviousVersions(prefix, version);
  spriteContent += "</svg>";
  await writeFile(
    `./../../../static/icons/${prefix}-v${version}.svg`,
    spriteContent
  );
}

async function deletePreviousVersions(prefix: string, version: number) {
  for (let v = 1; v < version; v++) {
    try {
      await unlink(`./../../../static/icons/${prefix}-v${v}.svg`);
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
      spriteContent += `
        <symbol id="${setName}:${iconName}" viewBox="0 0 ${iconData.width} ${iconData.height}">
          ${iconData.body}
        </symbol>
      `;
    }
  }
  console.log(`${setName}: ${iconNames.size} icons added to sprite`);
  return spriteContent;
}

buildIconSprite();
buildPhSprite();
