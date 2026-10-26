export function convertToRGBA(color: string, opacity: number) {
  if (color.startsWith("rgba")) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  const tempElem = document.createElement("div");
  tempElem.style.color = color;
  document.body.appendChild(tempElem);
  const rgbColor = getComputedStyle(tempElem).color;
  document.body.removeChild(tempElem);
  return rgbColor.replace("rgb", "rgba").replace(")", `, ${opacity})`);
}

export function rgbToHex(rgbString: string) {
  const channels = rgbString.match(/\d+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length < 3) {
    return "#000000";
  }
  const [r, g, b] = channels;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
