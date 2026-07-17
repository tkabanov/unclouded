import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ReassessmentModuleRefreshBanner from "@/components/reassessment/ReassessmentModuleRefreshBanner";

describe("ReassessmentModuleRefreshBanner", () => {
  it("renders nothing when no modules were affected", () => {
    const { container } = render(
      <ReassessmentModuleRefreshBanner refreshOfferedSlugs={[]} acceleratedSlugs={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows refresh and unlock copy with link to profile", () => {
    render(
      <MemoryRouter>
        <ReassessmentModuleRefreshBanner
          refreshOfferedSlugs={["identity"]}
          acceleratedSlugs={["body"]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Know Yourself Deeper — updated/i)).toBeInTheDocument();
    expect(screen.getByText(/The Identity Lens/)).toBeInTheDocument();
    expect(screen.getByText(/Your Body's Story/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Know Yourself Deeper/i })).toHaveAttribute(
      "href",
      "/settings?tab=profile",
    );
  });
});
