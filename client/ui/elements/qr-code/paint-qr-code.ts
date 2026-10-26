import QRCode from "qrcode";

export async function paintQRCode(
  canvas: HTMLCanvasElement,
  url: string,
  width: number
) {
  if (!canvas || !url || !width) return;
  await QRCode.toCanvas(canvas, url, {
    width: width,
    margin: 0,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  });
}
