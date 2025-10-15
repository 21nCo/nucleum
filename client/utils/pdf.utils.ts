import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export async function generateImagePreviewFromPdf(pdfBlob: Blob) {
  let loadingTask = null;
  let pdfDoc = null;
  let page = null;

  try {
    const pdfData = new Uint8Array(await pdfBlob.arrayBuffer());
    loadingTask = pdfjs.getDocument({ data: pdfData });
    pdfDoc = await loadingTask.promise;
    page = await pdfDoc.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context from canvas");
    }
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    await page.render(renderContext).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to generate blob from canvas"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  } catch (error) {
    console.error("Error generating image preview from PDF:", error);
    throw error;
  } finally {
    if (page) {
      try {
        await page.cleanup();
      } catch {
        // no-op
      }
      page = null;
    }
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch {
        // no-op
      }
      pdfDoc = null;
    }
    if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch {
        // no-op
      }
      loadingTask = null;
    }
  }
}
