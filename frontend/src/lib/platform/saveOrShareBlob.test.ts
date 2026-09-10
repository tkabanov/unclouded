import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import { saveOrShareBlob } from "./saveOrShareBlob";

const mockIsNativeApp = vi.mocked(isNativeApp);

function setCapacitorPlugins(plugins: Record<string, unknown> | undefined) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = plugins
    ? { Plugins: plugins }
    : undefined;
}

describe("saveOrShareBlob", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
    setCapacitorPlugins(undefined);
  });

  it("web path creates and revokes an object URL", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:fake-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await saveOrShareBlob(new Blob(["hello"], { type: "text/plain" }), "report.pdf");

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("native path writes the file then shares the written URI", async () => {
    mockIsNativeApp.mockReturnValue(true);
    const writeFile = vi.fn().mockResolvedValue({ uri: "file:///cache/report.pdf" });
    const share = vi.fn().mockResolvedValue(undefined);
    setCapacitorPlugins({ Filesystem: { writeFile }, Share: { share } });

    await saveOrShareBlob(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" }), "report.pdf");

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "report.pdf", directory: "CACHE" }),
    );
    expect(typeof writeFile.mock.calls[0][0].data).toBe("string");
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ["file:///cache/report.pdf"] }),
    );
  });

  it("native path throws instead of silently no-opping when plugins are missing", async () => {
    mockIsNativeApp.mockReturnValue(true);
    setCapacitorPlugins(undefined);

    await expect(
      saveOrShareBlob(new Blob(["x"]), "x.png"),
    ).rejects.toThrow(/unavailable/i);
  });

  it("native path propagates a Filesystem write failure", async () => {
    mockIsNativeApp.mockReturnValue(true);
    setCapacitorPlugins({
      Filesystem: { writeFile: vi.fn().mockRejectedValue(new Error("disk full")) },
      Share: { share: vi.fn() },
    });

    await expect(saveOrShareBlob(new Blob(["x"]), "x.png")).rejects.toThrow("disk full");
  });
});
