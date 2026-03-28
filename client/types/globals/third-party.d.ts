interface CryptoJsHashLike {
  toString(): string;
}

interface CryptoJsLike {
  SHA256(content: string): CryptoJsHashLike;
}

interface InstagramEmbedsLike {
  process(): void;
}

interface InstagramRuntimeLike {
  Embeds: InstagramEmbedsLike;
}

declare var CryptoJS: CryptoJsLike;

interface Window {
  instgrm?: InstagramRuntimeLike;
}

declare module "qrcode" {
  interface QRCodeColorOptions {
    dark?: string;
    light?: string;
  }

  interface QRCodeToCanvasOptions {
    color?: QRCodeColorOptions;
    margin?: number;
    width?: number;
  }

  const QRCode: {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: QRCodeToCanvasOptions,
    ): Promise<void>;
  };

  export default QRCode;
}
