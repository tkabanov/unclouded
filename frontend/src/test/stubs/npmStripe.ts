/**
 * Test-only stand-in for Deno's `npm:stripe@17.7.0` specifier. Edge functions only need the
 * static helpers at import time; tests inject their own fake Stripe client via vi.mock.
 */
export default class Stripe {
  static createSubtleCryptoProvider(): unknown {
    return {};
  }

  static createFetchHttpClient(): unknown {
    return {};
  }
}
