import { describe, expect, it, vi } from "vitest";

const saveOrShareBlob = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/platform/saveOrShareBlob", () => ({
  saveOrShareBlob: (...args: unknown[]) => saveOrShareBlob(...args),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(),
      }),
    },
  },
}));

import { downloadPupPdf } from "./downloadPupPdf";

describe("downloadPupPdf", () => {
  it("routes in-memory bytes through saveOrShareBlob as a PDF blob", async () => {
    saveOrShareBlob.mockClear();
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    await downloadPupPdf({ bytes, filename: "report.pdf" });

    expect(saveOrShareBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = saveOrShareBlob.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(filename).toBe("report.pdf");
  });

  it("throws when neither bytes nor a storage path are available", async () => {
    await expect(downloadPupPdf({ filename: "report.pdf" })).rejects.toThrow(
      "No PDF available to download",
    );
  });
});
