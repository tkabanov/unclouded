import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/importedContext/importedContextApi", () => ({
  fetchImportedContext: vi.fn(),
  saveImportedContext: vi.fn(),
  deleteImportedContext: vi.fn(),
}));

import SettingsImportedContextSection from "@/components/settings/SettingsImportedContextSection";
import {
  deleteImportedContext,
  fetchImportedContext,
  saveImportedContext,
} from "@/lib/importedContext/importedContextApi";

const fetchMock = vi.mocked(fetchImportedContext);
const saveMock = vi.mocked(saveImportedContext);
const deleteMock = vi.mocked(deleteImportedContext);

const savedContext = {
  content: "ENFP. Likes short sessions.",
  consentGrantedAt: "2026-10-20T10:00:00Z",
  updatedAt: "2026-10-20T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SettingsImportedContextSection (NCLDD-63)", () => {
  it("requires consent before saving", async () => {
    fetchMock.mockResolvedValueOnce({ status: "loaded", context: null });
    fetchMock.mockResolvedValueOnce({ status: "loaded", context: savedContext });
    saveMock.mockResolvedValue();

    render(<SettingsImportedContextSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Add information" }));
    fireEvent.change(screen.getByLabelText("About you"), {
      target: { value: "ENFP. Likes short sessions." },
    });

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(saveMock).toHaveBeenCalledWith("ENFP. Likes short sessions.", true));
    expect(await screen.findByTestId("imported-context-saved")).toHaveTextContent(
      "ENFP. Likes short sessions.",
    );
  });

  it("previews imported files before adding them to the draft", async () => {
    fetchMock.mockResolvedValue({ status: "loaded", context: null });

    render(<SettingsImportedContextSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Add information" }));
    fireEvent.change(screen.getByTestId("imported-context-file-input"), {
      target: { files: [new File(["Big Five: high openness"], "test.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByText("Preview imported text")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to my information" }));

    await waitFor(() =>
      expect(screen.getByLabelText("About you")).toHaveValue("[From test.txt]\nBig Five: high openness"),
    );
  });

  it("deletes the imported data after confirmation", async () => {
    fetchMock.mockResolvedValue({ status: "loaded", context: savedContext });
    deleteMock.mockResolvedValue();

    render(<SettingsImportedContextSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete my imported data" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Add information" })).toBeInTheDocument();
  });

  it("renders nothing when the backend is unavailable", async () => {
    fetchMock.mockResolvedValue({ status: "unavailable" });
    const { container } = render(<SettingsImportedContextSection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
