## Frontend Unit Testing with Vitest

This document explains **how Vitest-based unit testing works in this frontend**, and how to read/write tests so you understand what Vitest is doing in a real Vite + React + TypeScript project.

---

### 1. What Vitest is used for here

- **Vitest** is the test runner and assertion library (Vite-native, fast).
- **React Testing Library** (`@testing-library/react`, `@testing-library/user-event`) and a DOM matcher package are used to:
  - Render components in a realistic way
  - Interact with them like a user (clicks, typing)
  - Assert on what appears in the DOM (e.g. `toBeInTheDocument`)

You use Vitest to test:

- Small UI components (`Loader`, `ErrorMessage`, `Navbar`)
- Routing and auth guards (`ProtectedRoute`)
- State and stores (`authStore`)
- HTTP client + service layer (`httpClient`, `authService`, `taskService`)

---

### 2. How to run tests

From `frontend/`:

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
npm run test:ci     # single run for CI
```

`package.json` scripts:

```json
"scripts": {
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:ci": "vitest run"
}
```

---

### 3. Vitest configuration (high level)

Vitest is configured inside `vite.config.ts` under the `test` key:

- **environment: "jsdom"** – browser-like environment for React.
- **setupFiles** – runs `src/test/setupTests.ts` before tests.
- **include** – `**/?(*.)+(spec|test).(ts|tsx)`.
- **globals: true** – `describe`, `it`, `expect`, `vi` are available globally.
- **css: true** – CSS is processed so imports don’t crash.

Path alias `@/` → `src/` is shared with the main Vite config.

---

### 4. TypeScript config for tests

`tsconfig.app.json` includes `"vitest/globals"` in `types` so TypeScript understands Vitest globals (`describe`, `it`, `expect`, `vi`) in test files.

---

### 5. Global test setup

File: `src/test/setupTests.ts`

What it does:

- Imports the DOM matcher package to extend Vitest’s `expect` with DOM matchers (e.g. `toBeInTheDocument`).
- Adds `window.matchMedia` so libraries that read it don’t break.
- Adds `TextEncoder` / `TextDecoder` polyfills for React Router and other libs.
- Provides a default `fetch` implementation that throws with a clear message if you forgot to mock it in a test.

This runs automatically before each test file.

---

### 6. Shared render helper: `renderWithProviders`

File: `src/test/utils/renderWithProviders.tsx`

Purpose: avoid re-writing boilerplate (router + React Query) in every test.

It:

- Creates a **test `QueryClient`** with retries disabled.
- Wraps `children` in:
  - `QueryClientProvider`
  - `MemoryRouter` (so you can test routing)

Usage:

```ts
import { renderWithProviders } from "@/test/utils/renderWithProviders";

renderWithProviders(<MyComponent />, { route: "/some-path" });
```

This is how component tests in this project run with the same providers as the real app.

---

### 7. Example: simple component test (`Loader`)

File: `src/components/common/__tests__/Loader.test.tsx`

Concepts:

- Render a component with Testing Library.
- Assert text and classes in the DOM.

Key patterns used:

- `render(<Loader />)` – draw the component.
- `screen.getByText("Loading...")` – query DOM by text.
- `expect(...).toBeInTheDocument()` – DOM matcher added in setup (extends Vitest’s expect).

What you learn:

- Basic structure of a React unit test.
- How to test default props and variants (`fullScreen` vs not).

---

### 8. Example: routing + auth guard (`ProtectedRoute`)

File: `src/components/features/auth/__tests__/ProtectedRoute.test.tsx`

Concepts:

- Testing **protected routes**.
- Mocking **`fetch`** to simulate backend `/auth/me`.
- Using `MemoryRouter` + `<Routes>` to check redirects.

Key ideas:

- Use `useAuthStore.setState(...)` to set the auth state.
- Use `renderWithProviders(<AppRoutes />, { route: "/protected" })`.
- Scenario tests:
  - No token → redirected to `/login`.
  - Valid token → `/auth/me` returns a user → children render.
  - Invalid token → `/auth/me` returns 401 → redirect to `/login`.
- Use `vi.spyOn(globalThis, "fetch")` to mock `fetch`.

What you learn:

- How to write tests that **span routing and auth logic** without a browser.
- How to mock `fetch` safely in Vitest.

---

### 9. Example: state store & services

**Zustand store (`authStore`)**

File: `src/store/__tests__/authStore.test.ts`

- Tests `login`:
  - Writes token into `localStorage`.
  - Updates `user`, `token`, `isAuthenticated`.
- Tests `logout`:
  - Clears token from `localStorage`.
  - Resets state.

Concepts:

- Using store `.getState()` and `.setState()` directly.
- Asserting state transitions and side effects.

**HTTP client (`httpClient`)**

File: `src/lib/__tests__/httpClient.test.ts`

- Mocks `global.fetch` with `vi.spyOn(globalThis, "fetch")`.
- Tests:
  - Auth header is added when required.
  - `skipAuth: true` bypasses auth.
  - Missing token throws `UnauthorizedError`.

Concepts:

- How to test a **wrapper** around `fetch`.
- How to distinguish between authenticated and public requests.

**API services (`authService`, `taskService`)**

Files:

- `src/services/api/__tests__/authService.test.ts`
- `src/services/api/__tests__/taskService.test.ts`

They:

- Mock `httpClient.post` / `httpClient.get` with `vi.spyOn(...)`.
- Verify:
  - Correct endpoints and payloads are used.
  - Tokens are stored in `localStorage` (auth).
  - Query strings are built correctly (tasks).
  - Raw API data is normalized into app-friendly types (`Task`).

What you learn:

- How to isolate and test the **service layer** without hitting the network.

---

### 10. Where to put new frontend tests

- Co-locate with code, inside a `__tests__` folder or next to the file:
  - `src/components/Feature/Thing.test.tsx`
  - or `src/components/Feature/__tests__/Thing.test.tsx`
- Follow the same patterns:
  - Use `renderWithProviders` for routed/components needing providers.
  - Mock `fetch` / services with `vi.spyOn` or `vi.mock` when needed.
  - Assert on **behavior and DOM**, not implementation details or CSS classes.

If you work through the existing tests, you’ll see **all the main Vitest patterns** applied to a real React + Vite app: rendering, routing, state, services, and mocking. This is enough to understand what Vitest-based unit testing means in this frontend and how to extend it.
