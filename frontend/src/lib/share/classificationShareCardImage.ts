import type { ClassificationShareCardMetadata } from "@/lib/share/classificationShareCard";
import logoIconUrl from "@/assets/uncloud-icon.png";

/** Instagram Stories aspect ratio (9:16). */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

export const SHARE_CARD_BRAND = {
  background: "#ffffff",
  navy: "#1e2a32",
  muted: "#4a5c66",
  teal: "#00a8c5",
  tealLight: "#e6f7fb",
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load share card logo"));
    image.src = src;
  });
}

export function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0] ?? "";

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[index] ?? "";
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawCenteredLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerX: number,
  startY: number,
  lineHeight: number,
): number {
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }
  return y;
}

/** Render branded classification share card to PNG (REQ-09). */
export async function renderClassificationShareCardPng(
  metadata: ClassificationShareCardMetadata,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = SHARE_CARD_BRAND.background;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  ctx.fillStyle = SHARE_CARD_BRAND.teal;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, 16);

  const logo = await loadImage(logoIconUrl);
  const logoWidth = 220;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  ctx.drawImage(
    logo,
    (SHARE_CARD_WIDTH - logoWidth) / 2,
    120,
    logoWidth,
    logoHeight,
  );

  const contentTop = 120 + logoHeight + 80;
  const maxTextWidth = SHARE_CARD_WIDTH - 160;
  const centerX = SHARE_CARD_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = SHARE_CARD_BRAND.navy;
  ctx.font = '700 72px "Segoe UI", system-ui, sans-serif';
  const titleLines = wrapCanvasLines(ctx, metadata.classificationName, maxTextWidth);
  let cursorY = drawCenteredLines(ctx, titleLines, centerX, contentTop, 82);

  cursorY += 36;
  ctx.fillStyle = SHARE_CARD_BRAND.muted;
  ctx.font = '500 42px "Segoe UI", system-ui, sans-serif';
  const taglineLines = wrapCanvasLines(ctx, metadata.tagline, maxTextWidth);
  cursorY = drawCenteredLines(ctx, taglineLines, centerX, cursorY, 54);

  const panelTop = Math.max(cursorY + 80, 980);
  ctx.fillStyle = SHARE_CARD_BRAND.tealLight;
  roundRect(ctx, 80, panelTop, SHARE_CARD_WIDTH - 160, 280, 24);
  ctx.fill();

  ctx.fillStyle = SHARE_CARD_BRAND.teal;
  ctx.font = '600 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText("Join me on Uncloud360", centerX, panelTop + 48);

  ctx.fillStyle = SHARE_CARD_BRAND.navy;
  ctx.font = '500 36px "Segoe UI", system-ui, sans-serif';
  const urlLines = wrapCanvasLines(ctx, metadata.shareUrl.replace(/^https?:\/\//, ""), maxTextWidth - 40);
  drawCenteredLines(ctx, urlLines, centerX, panelTop + 110, 48);

  ctx.fillStyle = SHARE_CARD_BRAND.muted;
  ctx.font = '600 28px "Segoe UI", system-ui, sans-serif';
  ctx.fillText("Uncloud360™", centerX, SHARE_CARD_HEIGHT - 120);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export share card image"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      1,
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function buildLinkedInShareUrl(shareUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
}

export function shareCardDownloadFilename(classificationKey: string): string {
  const slug = classificationKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `uncloud360-${slug || "profile"}-share.png`;
}

export async function downloadShareCardBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export type NativeShareResult = "shared" | "unsupported" | "cancelled";

/** Mobile-first native share (image file + link when supported). */
export async function shareClassificationCardNative(params: {
  blob: Blob;
  shareUrl: string;
  classificationName: string;
}): Promise<NativeShareResult> {
  if (typeof navigator.share !== "function") return "unsupported";

  const file = new File(
    [params.blob],
    shareCardDownloadFilename("share"),
    { type: "image/png" },
  );

  const shareData: ShareData = {
    title: `My Uncloud360 profile: ${params.classificationName}`,
    text: "See my PuP 360 classification on Uncloud360.",
    url: params.shareUrl,
  };

  try {
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ ...shareData, files: [file] });
      return "shared";
    }

    await navigator.share(shareData);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    throw error;
  }
}
