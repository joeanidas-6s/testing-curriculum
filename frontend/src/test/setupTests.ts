import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// A few common DOM APIs that app code/libraries may touch.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// React Router (and some libs) expect these to exist in the environment.
if (!globalThis.TextEncoder) {
  (globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder =
    TextEncoder;
}
if (!globalThis.TextDecoder) {
  (globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder =
    TextDecoder;
}

// Provide a default fetch mock (tests can override per-case).
if (!globalThis.fetch) {
  (globalThis as unknown as { fetch: typeof globalThis.fetch }).fetch =
    (async () => {
      throw new Error(
        "global fetch is not defined in this test environment; mock it in the test",
      );
    }) as unknown as typeof globalThis.fetch;
}


