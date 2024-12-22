import { getIconData } from "@iconify/utils";
import { readFile, writeFile } from "fs/promises";
import { locate } from "@iconify/json";
import { iconSets } from "./icons-list";

/**
 * Notes:
 * Limitation with animated svg icons via sprite. Therefore directly using svgs for svg-spinners.
 */
async function buildIconSprite() {
  let spriteContent =
    '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">';

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

  spriteContent += "</svg>";
  await writeFile("./../../../static/icons/sprite.svg", spriteContent);

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
}

buildIconSprite();
