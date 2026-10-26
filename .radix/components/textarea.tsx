import React, { useEffect, useLayoutEffect, useRef } from "react";

import { Textarea } from "./ui/textarea.tsx";
import { cn } from "./ui/cn.ts";

// A textarea that grows to fit what it holds, so a block is as tall as its
// content and never scrolls inside itself.
//
// The height is set here rather than with the `field-sizing` property, which
// WKWebView does not have.
//
// `min-h-0` drops the minimum height the textarea under ui/ has for use as a
// form field, which a block that sizes itself does not want.
export function Autosize({ className, ...props }: React.ComponentProps<typeof Textarea>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    // scrollHeight leaves out the border, and the box is sized border to
    // border, so the difference has to be added back or each line is a couple
    // of pixels short.
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = element.scrollHeight + border + "px";
  };

  useLayoutEffect(() => fit(ref.current));

  // A first measurement can happen before the webfont has loaded, which sizes
  // the box to the fallback's metrics. Measuring again once the fonts are in
  // corrects it.
  useEffect(() => {
    document.fonts.ready.then(() => fit(ref.current));
  }, []);

  return (
    <Textarea
      ref={ref}
      rows={1}
      {...props}
      className={cn("min-h-0", className)}
      onInput={(event) => fit(event.currentTarget)}
    />
  );
}
