import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { NodeType } from "$lib/client/products/memotron/node/node.type";
import type {
  Coords,
  LTWH,
  LTWHP,
  Page,
  Scaled,
  WIDTH_HEIGHT
} from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.type";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { PDFDocument, rgb } from "pdf-lib";

class PdfSurrealHandler {
  surrealDb = new SurrealDatabase();
  async saveClip(url: string, content: any) {
    content = { body: { ...content } };
    content.contentType = NodeType.PDF_CLIP;
    let response = await this.surrealDb.query(
      "return fn::memotron::pdfAnnotator::saveClip($url,$content);",
      {
        url,
        content
      }
    );
    return interceptSurrealResponse(response);
  }
  async saveAllClips(clips: any[]) {
    try {
      const query = "INSERT INTO node $clips";
      const params = { clips };
      const response = await this.surrealDb.query(query, params);
      return response;
    } catch (e) {
      console.error("Error saving clips:", e);
    }
  }
  async fetchAllClips(url: string) {
    let response = await this.surrealDb.query(
      "return fn::memotron::pdfAnnotator::getAllClips($url);",
      {
        url
      }
    );
    let rawAnnots = interceptSurrealResponse(response);
    let annots = rawAnnots[0]?.clips?.map((annot: any) => {
      return { ...annot.body, id: "annot" + annot.id.split(":")[1] };
    });
    return annots;
  }

  async deleteClip(id: string) {
    let nodeId = "node:" + id.split("annot")[1];
    let response = await this.surrealDb.query("return DELETE $nodeId;", {
      nodeId
    });
    return interceptSurrealResponse(response);
  }
  async updateClip(id: string, content: any) {
    let nodeId = "node:" + id.split("annot")[1];
    let contentToUpdate: any = {
      body: { ...content },
      modifiedAt: new Date().toISOString()
    };
    console.log({ nodeId, contentToUpdate });
    let response = await this.surrealDb.query(
      "return UPDATE $nodeId MERGE $contentToUpdate;",
      {
        nodeId,
        contentToUpdate
      }
    );
    return interceptSurrealResponse(response);
  }
}

export const surrealPDF = new PdfSurrealHandler();

export const asElement = (x: any): HTMLElement => x;

export const getDocument = (elm: any): Document =>
  (elm || {}).ownerDocument || document;
export const getWindow = (elm: any): typeof window =>
  (getDocument(elm) || {}).defaultView || window;

export const isHTMLElement = (elm: any) =>
  elm instanceof HTMLElement || elm instanceof getWindow(elm).HTMLElement;
export const getPageFromElement = (target: HTMLElement): Page | null => {
  const node = asElement(target.closest(".page"));

  if (!node || !isHTMLElement(node)) {
    return null;
  }
  //   console.log("node", node);
  const number = Number(asElement(node).dataset.pageNumber);

  return { node, number } as Page;
};

export const getPagesFromRange = (range: Range): Page[] => {
  const startParentElement = range.startContainer.parentElement;
  const endParentElement = range.endContainer.parentElement;

  if (!isHTMLElement(startParentElement) || !isHTMLElement(endParentElement)) {
    return [] as Page[];
  }

  const startPage = getPageFromElement(asElement(startParentElement));
  const endPage = getPageFromElement(asElement(endParentElement));

  if (!startPage?.number || !endPage?.number) {
    return [] as Page[];
  }

  if (startPage.number === endPage.number) {
    return [startPage] as Page[];
  }

  if (startPage.number === endPage.number - 1) {
    return [startPage, endPage] as Page[];
  }

  const pages: Page[] = [];

  let currentPageNumber = startPage.number;

  const document = startPage.node.ownerDocument;

  while (currentPageNumber <= endPage.number) {
    const currentPage = getPageFromElement(
      document.querySelector(
        `[data-page-number='${currentPageNumber}'`
      ) as HTMLElement
    );
    if (currentPage) {
      pages.push(currentPage);
    }
    currentPageNumber++;
  }

  return pages as Page[];
};
export function getBoundingRect(clientRects: Array<LTWHP>): LTWHP {
  const rects = Array.from(clientRects).map((rect) => {
    const { left, top, width, height, pageNumber } = rect;

    const X0 = left;
    const X1 = left + width;

    const Y0 = top;
    const Y1 = top + height;

    return { X0, X1, Y0, Y1, pageNumber };
  });

  let firstPageNumber = Number.MAX_SAFE_INTEGER;

  rects.forEach((rect) => {
    firstPageNumber = Math.min(
      firstPageNumber,
      rect.pageNumber ?? firstPageNumber
    );
  });

  const rectsWithSizeOnFirstPage = rects.filter(
    (rect) =>
      (rect.X0 > 0 || rect.X1 > 0 || rect.Y0 > 0 || rect.Y1 > 0) &&
      rect.pageNumber === firstPageNumber
  );

  const optimal = rectsWithSizeOnFirstPage.reduce((res, rect) => {
    return {
      X0: Math.min(res.X0, rect.X0),
      X1: Math.max(res.X1, rect.X1),

      Y0: Math.min(res.Y0, rect.Y0),
      Y1: Math.max(res.Y1, rect.Y1),

      pageNumber: firstPageNumber
    };
  }, rectsWithSizeOnFirstPage[0]);

  const { X0, X1, Y0, Y1, pageNumber } = optimal;

  return {
    left: X0,
    top: Y0,
    width: X1 - X0,
    height: Y1 - Y0,
    pageNumber
  };
}
export function isClientRectInsidePageRect(
  clientRect: DOMRect,
  pageRect: DOMRect
) {
  if (clientRect.top < pageRect.top) {
    return false;
  }
  if (clientRect.bottom > pageRect.bottom) {
    return false;
  }
  if (clientRect.right > pageRect.right) {
    return false;
  }
  if (clientRect.left < pageRect.left) {
    return false;
  }

  return true;
}
export function getClientRects(
  range: Range,
  pages: Page[],
  scale: number,
  shouldOptimize: boolean = true
) {
  // console.log("pages in utils", pages);
  const clientRects = Array.from(range.getClientRects());
  // console.log("clientRects b4 processing", clientRects);
  let rects: LTWHP[][] = [];

  for (const clientRect of clientRects) {
    for (const page of pages) {
      const pageRect = page.node.getBoundingClientRect();
      // console.log("pageRect", pageRect);
      if (
        isClientRectInsidePageRect(clientRect, pageRect) &&
        clientRect.width > 0 &&
        clientRect.height > 0 &&
        clientRect.width < pageRect.width &&
        clientRect.height < pageRect.height
      ) {
        const highlightedRect = {
          top: clientRect.top / scale - pageRect.top / scale, //+ page.node.scrollTop - pageRect.top,
          left: clientRect.left / scale - pageRect.left / scale, //+ page.node.scrollLeft - pageRect.left,
          width: clientRect.width / scale,
          height: clientRect.height / scale,
          pageNumber: page.number
        } as LTWHP;
        // console.log(
        //   "highlightedRect for page ",
        //   page.number - 1,
        //   highlightedRect
        // );
        if (!rects[page.number - 1]) rects[page.number - 1] = [];
        rects[page.number - 1].push(highlightedRect);
      }
    }
  }
  // console.log("rects b4", rects);
  if (shouldOptimize) {
    rects = rects.map((rect) => optimizeClientRects(rect));
  }
  // console.log("rects after", rects);
  return rects;
}
const sort = (rects: Array<LTWHP>) =>
  rects.sort((A, B) => {
    const top = (A.pageNumber || 0) * A.top - (B.pageNumber || 0) * B.top;

    if (top === 0) {
      return A.left - B.left;
    }

    return top;
  });

const overlaps = (A: LTWHP, B: LTWHP) =>
  A.pageNumber === B.pageNumber &&
  A.left <= B.left &&
  B.left <= A.left + A.width;
const inside = (A: LTWHP, B: LTWHP) =>
  A.pageNumber === B.pageNumber &&
  A.top > B.top &&
  A.left > B.left &&
  A.top + A.height < B.top + B.height &&
  A.left + A.width < B.left + B.width;
const sameLine = (A: LTWHP, B: LTWHP, yMargin = 5) =>
  A.pageNumber === B.pageNumber &&
  Math.abs(A.top - B.top) < yMargin &&
  Math.abs(A.height - B.height) < yMargin;
const extendWidth = (A: LTWHP, B: LTWHP) => {
  // extend width of A to cover B
  A.width = Math.max(B.width - A.left + B.left, A.width);
};
const nextTo = (A: LTWHP, B: LTWHP, xMargin = 10) => {
  const Aright = A.left + A.width;
  const Bright = B.left + B.width;

  return (
    A.pageNumber === B.pageNumber &&
    A.left <= B.left &&
    Aright <= Bright &&
    B.left - Aright <= xMargin
  );
};
const optimizeClientRects = (clientRects: Array<LTWHP>): Array<LTWHP> => {
  const rects = sort(clientRects);

  const toRemove = new Set();

  const firstPass = rects.filter((rect) => {
    return rects.every((otherRect) => {
      return !inside(rect, otherRect);
    });
  });

  let passCount = 0;

  while (passCount <= 2) {
    firstPass.forEach((A) => {
      firstPass.forEach((B) => {
        if (A === B || toRemove.has(A) || toRemove.has(B)) {
          return;
        }

        if (!sameLine(A, B)) {
          return;
        }

        if (overlaps(A, B)) {
          extendWidth(A, B);
          A.height = Math.max(A.height, B.height);

          toRemove.add(B);
        }

        if (nextTo(A, B)) {
          extendWidth(A, B);

          toRemove.add(B);
        }
      });
    });
    passCount += 1;
  }

  return firstPass.filter((rect) => !toRemove.has(rect));
};

export const viewportToScaled = (
  rect: LTWHP,
  { width, height }: WIDTH_HEIGHT
): Scaled => {
  return {
    x1: rect.left,
    y1: rect.top,

    x2: rect.left + rect.width,
    y2: rect.top + rect.height,

    width,
    height,

    pageNumber: rect.pageNumber
  };
};

export const findOrCreateContainerLayer = (
  container: HTMLElement,
  className: string
) => {
  const doc = getDocument(container);
  let layer = container.querySelector(`.${className}`);

  if (!layer) {
    layer = doc.createElement("div");
    layer.className = className;
    container.appendChild(layer);
  }

  return layer;
};
export function hexToRGBA(hex: string, opacity: number | null = null) {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  if (opacity) return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  else return `${r}, ${g}, ${b}`;
}

function embedRectangleUsingPDFLib(rect: any, color: string, page: any) {
  const { width, height } = page.getSize();
  let scalePercentage = height / rect.height;
  let { x1, y1, x2, y2 } = rect;
  y1 = rect.height - y1;
  y2 = rect.height - y2;
  x1 = x1 * scalePercentage;
  x2 = x2 * scalePercentage;
  y1 = y1 * (scalePercentage + 0.08);
  y2 = y2 * (scalePercentage + 0.08);
  let highlightColor: any = hexToRGBA(color)
    .split(",")
    .map((x) => parseInt(x));
  highlightColor = rgb(
    highlightColor[0] / 255,
    highlightColor[1] / 255,
    highlightColor[2] / 255
  );
  page.drawRectangle({
    x: x1,
    y: y1 * 0.9,
    width: x2 - x1,
    height: y2 * 0.9 - y1 * 0.9,
    color: highlightColor,
    opacity: 0.3
  });
}
function embedLineUsingPDFLib(
  rect: any,
  color: string,
  page: any,
  annotType: string
) {
  const { width, height } = page.getSize();
  let scalePercentage = height / rect.height;
  let { x1, y1, x2, y2 } = rect;
  y1 = rect.height - y1;
  y2 = rect.height - y2;
  x1 = x1 * scalePercentage;
  x2 = x2 * scalePercentage;
  y1 = y1 * (scalePercentage + 0.08);
  y2 = y2 * (scalePercentage + 0.08);
  let start;
  let end;
  if (annotType === "UNDERLINE") {
    start = { x: x1, y: y2 * 0.9 };
    end = { x: x2, y: y2 * 0.9 };
  } else {
    start = { x: x1, y: y2 * 0.912 };
    end = { x: x2, y: y2 * 0.912 };
  }
  let highlightColor: any = hexToRGBA(color)
    .split(",")
    .map((x) => parseInt(x));
  highlightColor = rgb(
    highlightColor[0] / 255,
    highlightColor[1] / 255,
    highlightColor[2] / 255
  );

  page.drawLine({
    start,
    end,
    color: highlightColor,
    thickness: 1
  });
}
export async function embedAnnotationsandDownload(
  originalPdfUrl: any,
  annotations: any
) {
  const existingPdfBytes = await fetch(originalPdfUrl).then((res) =>
    res.arrayBuffer()
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  annotations.forEach((annotation: any) => {
    // console.log({ annotation });
    const page = pdfDoc.getPage(annotation.pageNumber - 1);

    if (
      annotation.annotType !== "LINE-THROUGH" &&
      annotation.annotType !== "UNDERLINE"
    ) {
      if (annotation.rects) {
        annotation.rects.forEach((rPage) => {
          if (!rPage) {
            return;
          }
          rPage.forEach((rect) => {
            embedRectangleUsingPDFLib(rect, annotation.color, page);
          });
        });
      } else {
        embedRectangleUsingPDFLib(annotation.rect, annotation.color, page);
      }
    } else {
      console.log("annotation otherwise", annotation);
      if (annotation.rects) {
        annotation.rects.forEach((rPage) => {
          if (!rPage) {
            return;
          }
          rPage.forEach((rect) => {
            embedLineUsingPDFLib(
              rect,
              annotation.color,
              page,
              annotation.annotType
            );
          });
        });
      } else {
        embedLineUsingPDFLib(
          annotation.rect,
          annotation.color,
          page,
          annotation.annotType
        );
      }
    }
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);

  // Download the PDF with embedded annotations
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "annotated_document.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // return pdfBytes;
}
export function getBoundingRectSE(start: Coords, end: Coords): LTWH {
  return {
    left: Math.min(end.x, start.x),
    top: Math.min(end.y, start.y),

    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}
