export function movingBorder(
  node: HTMLElement,
  options: {
    speed?: number;
    borderWidth?: string;
    borderColor?: string;
    enabled?: boolean;
  } = {}
) {
  const speed = options.speed || 2000;
  const borderWidth = options.borderWidth || "2px";
  const borderColor = options.borderColor || "#ffffff";
  let enabled = options.enabled ?? false;

  let start: number | undefined;
  let animationFrameId: number | undefined;

  node.style.position = "relative";
  node.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    border: ${borderWidth} solid;
    pointer-events: none;
    mask: linear-gradient(90deg, transparent, white 50%, transparent);
    -webkit-mask: linear-gradient(90deg, transparent, white 50%, transparent);
    opacity: ${enabled ? 1 : 0};
  `;
  overlay.classList.add(`!border-${borderColor}`);

  node.appendChild(overlay);

  function startAnimation() {
    if (!enabled) return;
    start = undefined;
    animationFrameId = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = undefined;
    }
  }

  function animate(timestamp: number) {
    if (!start) start = timestamp;
    const progress = ((timestamp - start) % speed) / speed;
    const position = progress * 200 - 50;

    overlay.style.transform = `translateX(${position}%)`;
    animationFrameId = requestAnimationFrame(animate);
  }

  if (enabled) {
    startAnimation();
  }

  return {
    update(newOptions: {
      speed?: number;
      borderWidth?: string;
      borderColor?: string;
      enabled?: boolean;
    }) {
      const {
        speed: newSpeed,
        borderWidth: newBorderWidth,
        borderColor: newBorderColor,
        enabled: newEnabled
      } = newOptions;

      if (newSpeed) options.speed = newSpeed;
      if (newBorderWidth) {
        options.borderWidth = newBorderWidth;
        overlay.style.border = `${newBorderWidth} solid ${options.borderColor}`;
      }
      if (newBorderColor) {
        options.borderColor = newBorderColor;
        overlay.style.border = `${options.borderWidth} solid ${newBorderColor}`;
      }
      if (typeof newEnabled !== "undefined" && newEnabled !== enabled) {
        enabled = newEnabled;
        overlay.style.opacity = enabled ? "1" : "0";
        if (enabled) {
          startAnimation();
        } else {
          stopAnimation();
        }
      }
    },
    destroy() {
      stopAnimation();
      node.removeChild(overlay);
    }
  };
}
