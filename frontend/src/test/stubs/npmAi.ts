/** Test-only stand-in for Deno's `npm:ai` specifier; tests mock what they use via vi.mock("npm:ai"). */
export function generateText(): never {
  throw new Error("npm:ai generateText is not available in tests; mock it with vi.mock.");
}
