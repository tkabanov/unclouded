import { isNativeApp } from "@/lib/platform/nativeApp";

interface CapacitorFilesystemPlugin {
  writeFile: (options: {
    path: string;
    data: string;
    directory: string;
    recursive?: boolean;
  }) => Promise<{ uri: string }>;
}

interface CapacitorSharePlugin {
  share: (options: { files?: string[]; title?: string; dialogTitle?: string }) => Promise<void>;
}

function getFilesystemPlugin(): CapacitorFilesystemPlugin | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as typeof window & {
    Capacitor?: { Plugins?: { Filesystem?: CapacitorFilesystemPlugin } };
  }).Capacitor;
  return bridge?.Plugins?.Filesystem ?? null;
}

function getSharePlugin(): CapacitorSharePlugin | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as typeof window & {
    Capacitor?: { Plugins?: { Share?: CapacitorSharePlugin } };
  }).Capacitor;
  return bridge?.Plugins?.Share ?? null;
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file data"));
        return;
      }
      // Filesystem.writeFile wants raw base64, not a data: URL.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file data"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Web: object-URL + `<a download>`, unchanged from before MOB-07.
 * `<a download>` has no effect inside a native WebView — there is no
 * download-manager UI to hand the file to — so it silently does nothing there.
 */
function triggerWebDownload(blob: Blob, filename: string): void {
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

/**
 * Saves or shares `blob` as `filename`.
 *
 * Web: `<a download>` (see `triggerWebDownload`).
 * Native: writes the blob into the Filesystem cache directory, then opens
 * the OS share sheet on it — the user saves to Files/Photos, AirDrops it,
 * etc. Throws (never a silent no-op) when the native write or share fails or
 * when the bridge is present but either plugin is unavailable.
 */
export async function saveOrShareBlob(blob: Blob, filename: string): Promise<void> {
  if (!isNativeApp()) {
    triggerWebDownload(blob, filename);
    return;
  }

  const filesystem = getFilesystemPlugin();
  const share = getSharePlugin();
  if (!filesystem || !share) {
    throw new Error("Native save/share is unavailable on this device.");
  }

  const data = await readBlobAsBase64(blob);
  const { uri } = await filesystem.writeFile({
    path: filename,
    data,
    directory: "CACHE",
  });
  await share.share({ files: [uri], title: filename, dialogTitle: filename });
}
